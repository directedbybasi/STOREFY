import { db } from "@/database/client";
import {
  products,
  orderItems,
  resellerProductMappings,
  supplierProducts,
  supplierProductVariants,
  supplierInventory,
  supplierOrders,
  supplierOrderItems,
  suppliers,
  fulfillments,
  orders,
} from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/core/errors";
import type { MinimizedShippingAddress } from "@/database/schema/dropshipping";
import type { OrderAddressSnapshot } from "@/database/schema/orders";

export interface RoutingResult {
  orderId: string;
  merchantFulfillmentItems: string[]; // orderItemIds handled by merchant
  supplierUnits: SupplierFulfillmentUnit[];
}

export interface SupplierFulfillmentUnit {
  supplierOrderId: string;
  supplierId: string;
  supplierDisplayName: string;
  items: Array<{
    orderItemId: string;
    supplierProductId: string;
    supplierVariantId: string;
    quantity: number;
    supplierCostPaise: number;
  }>;
  totalCostPaise: number;
}

/**
 * Routes order items to the correct fulfillment path.
 *
 * INVARIANTS:
 * 1. Client NEVER chooses supplier — routing is derived from product.source + reseller_product_mappings
 * 2. Supplier inventory is atomically reserved before creating supplier orders
 * 3. MERCHANT items stay in the existing fulfillment pipeline
 * 4. MEESHO items are marked for future pipeline (no action taken)
 * 5. Each supplier gets exactly one supplier_order per customer order
 * 6. Customer sees ONE order; backend maintains multiple fulfillment units
 */
export async function routeOrderToSuppliers(
  orderId: string,
  storeId: string
): Promise<RoutingResult> {
  // Get the order for shipping address
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new NotFoundError("Order");

  // Get all order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const merchantItems: string[] = [];
  const supplierGroups = new Map<
    string,
    Array<{
      orderItemId: string;
      supplierProductId: string;
      supplierVariantId: string;
      quantity: number;
      supplierCostPaise: number;
    }>
  >();

  for (const item of items) {
    // Resolve product source
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!product) continue;

    if (product.source === "MERCHANT") {
      // Merchant fulfillment — existing pipeline
      merchantItems.push(item.id);
      continue;
    }

    if (product.source === "MEESHO") {
      // Future pipeline — skip for now
      merchantItems.push(item.id); // Fallback to merchant for now
      continue;
    }

    // PLATFORM_SUPPLIER — resolve mapping
    const [mapping] = await db
      .select()
      .from(resellerProductMappings)
      .where(
        and(
          eq(resellerProductMappings.storeId, storeId),
          eq(resellerProductMappings.productId, item.productId),
          eq(resellerProductMappings.variantId, item.variantId)
        )
      )
      .limit(1);

    if (!mapping) {
      // No mapping found — should not happen for PLATFORM_SUPPLIER products
      // Fallback to merchant fulfillment as safety measure
      merchantItems.push(item.id);
      continue;
    }

    // Server-derived supplier ID — NEVER trust client
    const supplierId = mapping.supplierId;

    // Get current supplier cost (authoritative, not the snapshot)
    const [sv] = await db
      .select()
      .from(supplierProductVariants)
      .where(eq(supplierProductVariants.id, mapping.supplierVariantId))
      .limit(1);

    const supplierCostPaise = sv?.costPricePaise ?? mapping.supplierCostSnapshot;

    if (!supplierGroups.has(supplierId)) {
      supplierGroups.set(supplierId, []);
    }

    supplierGroups.get(supplierId)!.push({
      orderItemId: item.id,
      supplierProductId: mapping.supplierProductId,
      supplierVariantId: mapping.supplierVariantId,
      quantity: item.quantity,
      supplierCostPaise,
    });
  }

  // Create supplier orders within a transaction
  const supplierUnits: SupplierFulfillmentUnit[] = [];

  await db.transaction(async (tx) => {
    for (const [supplierId, groupItems] of supplierGroups) {
      // Verify supplier is still active
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1);

      if (!supplier || supplier.status === "SUSPENDED") {
        // Supplier unavailable — route to merchant as fallback
        for (const gi of groupItems) {
          merchantItems.push(gi.orderItemId);
        }
        continue;
      }

      // Reserve supplier inventory atomically
      for (const gi of groupItems) {
        const [inv] = await tx
          .select()
          .from(supplierInventory)
          .where(
            and(
              eq(supplierInventory.supplierId, supplierId),
              eq(supplierInventory.supplierVariantId, gi.supplierVariantId)
            )
          )
          .limit(1);

        if (!inv || inv.available < gi.quantity) {
          throw new ValidationError(
            `Insufficient supplier stock for variant ${gi.supplierVariantId}. Available: ${inv?.available ?? 0}, Requested: ${gi.quantity}`
          );
        }

        // Atomic reserve: available - quantity, reserved + quantity
        await tx
          .update(supplierInventory)
          .set({
            reserved: sql`${supplierInventory.reserved} + ${gi.quantity}`,
            available: sql`${supplierInventory.available} - ${gi.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(supplierInventory.id, inv.id),
              sql`${supplierInventory.available} >= ${gi.quantity}`
            )
          );
      }

      // Calculate total supplier cost
      const totalCostPaise = groupItems.reduce(
        (sum, gi) => sum + gi.supplierCostPaise * gi.quantity,
        0
      );

      // Minimize customer data for supplier
      const minimizedAddress = minimizeShippingAddress(order.shippingAddress);

      // Create supplier fulfillment record
      const [fulfillment] = await tx
        .insert(fulfillments)
        .values({
          orderId,
          storeId,
          carrier: "Manual",
          status: "PENDING",
          notes: `Supplier fulfillment: ${supplier.displayName}`,
        })
        .returning();

      // Create supplier order
      const [supplierOrder] = await tx
        .insert(supplierOrders)
        .values({
          orderId,
          storeId,
          supplierId,
          status: "PENDING",
          fulfillmentId: fulfillment.id,
          supplierCostTotalPaise: totalCostPaise,
          shippingAddress: minimizedAddress,
          deadlineAt: new Date(
            Date.now() + (supplier.status === "APPROVED" ? 3 : 5) * 24 * 60 * 60 * 1000
          ),
        })
        .returning();

      // Create supplier order items
      for (const gi of groupItems) {
        await tx.insert(supplierOrderItems).values({
          supplierOrderId: supplierOrder.id,
          orderItemId: gi.orderItemId,
          supplierProductId: gi.supplierProductId,
          supplierVariantId: gi.supplierVariantId,
          quantity: gi.quantity,
          supplierCostPaise: gi.supplierCostPaise,
        });
      }

      supplierUnits.push({
        supplierOrderId: supplierOrder.id,
        supplierId,
        supplierDisplayName: supplier.displayName,
        items: groupItems,
        totalCostPaise,
      });
    }
  });

  return {
    orderId,
    merchantFulfillmentItems: merchantItems,
    supplierUnits,
  };
}

/**
 * Data minimization: only include what the supplier needs for fulfillment.
 * Customer financial data, reseller margins, and unrelated PII are excluded.
 */
function minimizeShippingAddress(
  address: OrderAddressSnapshot
): MinimizedShippingAddress {
  return {
    recipientName: address.name,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}
