import { db } from "@/database/client";
import {
  supplierOrders,
  supplierOrderItems,
  supplierInventory,
  fulfillments,
  orders,
  suppliers,
} from "@/database/schema";
import { eq, and, sql, desc, type SQL } from "drizzle-orm";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors";

export interface SupplierOrderDTO {
  id: string;
  orderId: string;
  storeId: string;
  supplierId: string;
  status: string;
  rejectionReason: string | null;
  supplierCostTotalPaise: number;
  shippingAddress: Record<string, unknown>;
  deadlineAt: string | null;
  acceptedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: SupplierOrderItemDTO[];
  createdAt: string;
}

export interface SupplierOrderItemDTO {
  id: string;
  orderItemId: string;
  supplierProductId: string;
  supplierVariantId: string;
  quantity: number;
  supplierCostPaise: number;
}

// ─── State Machine ─────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "RTO"],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
  RTO: [],
};

function validateTransition(currentStatus: string, targetStatus: string): void {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ValidationError(
      `Invalid supplier order transition: '${currentStatus}' → '${targetStatus}'. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
}

// ─── Core Operations ───────────────────────────────────

/**
 * Supplier accepts an order. Validates supplier ownership.
 */
export async function acceptSupplierOrder(
  supplierOrderId: string,
  supplierId: string
): Promise<SupplierOrderDTO> {
  const so = await getAndValidateSupplierOrder(supplierOrderId, supplierId);
  validateTransition(so.status, "ACCEPTED");

  await db
    .update(supplierOrders)
    .set({
      status: "ACCEPTED",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(supplierOrders.id, supplierOrderId));

  return getSupplierOrderById(supplierOrderId, supplierId);
}

/**
 * Supplier rejects an order. Releases reserved supplier inventory.
 */
export async function rejectSupplierOrder(
  supplierOrderId: string,
  supplierId: string,
  reason: string
): Promise<SupplierOrderDTO> {
  const so = await getAndValidateSupplierOrder(supplierOrderId, supplierId);
  validateTransition(so.status, "REJECTED");

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError("Rejection reason is required.");
  }

  await db.transaction(async (tx) => {
    // Release reserved inventory
    await releaseSupplierInventory(tx, supplierOrderId);

    await tx
      .update(supplierOrders)
      .set({
        status: "REJECTED",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(supplierOrders.id, supplierOrderId));
  });

  return getSupplierOrderById(supplierOrderId, supplierId);
}

/**
 * Updates supplier order status through the state machine.
 */
export async function updateSupplierOrderStatus(
  supplierOrderId: string,
  supplierId: string,
  newStatus: string
): Promise<SupplierOrderDTO> {
  const so = await getAndValidateSupplierOrder(supplierOrderId, supplierId);
  validateTransition(so.status, newStatus);

  // Check if supplier is suspended
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (supplier?.status === "SUSPENDED" && ["PROCESSING", "PACKED", "SHIPPED"].includes(newStatus)) {
    // Allow existing orders to be fulfilled even when suspended
    // but log the restriction
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "SHIPPED") {
    updates.shippedAt = new Date();
  }
  if (newStatus === "DELIVERED") {
    updates.deliveredAt = new Date();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(supplierOrders)
      .set(updates)
      .where(eq(supplierOrders.id, supplierOrderId));

    // On delivery, release reserved and deduct from on_hand
    if (newStatus === "DELIVERED") {
      await finalizeSupplierInventory(tx, supplierOrderId);
    }

    // On RTO, release reserved inventory and restock
    if (newStatus === "RTO") {
      await releaseSupplierInventory(tx, supplierOrderId);
    }

    // Sync fulfillment status
    if (so.fulfillmentId) {
      const fulfillmentStatusMap: Record<string, string> = {
        SHIPPED: "IN_TRANSIT",
        DELIVERED: "DELIVERED",
        RTO: "RTO_INITIATED",
      };
      if (fulfillmentStatusMap[newStatus]) {
        await tx
          .update(fulfillments)
          .set({
            status: fulfillmentStatusMap[newStatus],
            ...(newStatus === "SHIPPED" && { shippedAt: new Date() }),
            ...(newStatus === "DELIVERED" && { deliveredAt: new Date() }),
            ...(newStatus === "RTO" && {
              rtoReason: "Supplier shipment RTO",
            }),
            updatedAt: new Date(),
          })
          .where(eq(fulfillments.id, so.fulfillmentId));
      }
    }
  });

  return getSupplierOrderById(supplierOrderId, supplierId);
}

/**
 * Lists supplier orders for the supplier dashboard.
 */
export async function listSupplierOrders(
  supplierId: string,
  status?: string,
  limit = 50,
  offset = 0
): Promise<SupplierOrderDTO[]> {
  const conditions: SQL[] = [eq(supplierOrders.supplierId, supplierId)];
  if (status) {
    conditions.push(eq(supplierOrders.status, status as unknown as (typeof supplierOrders.status._.data)));
  }

  const results = await db
    .select()
    .from(supplierOrders)
    .where(and(...conditions))
    .orderBy(desc(supplierOrders.createdAt))
    .limit(limit)
    .offset(offset);

  const dtos: SupplierOrderDTO[] = [];
  for (const so of results) {
    const items = await db
      .select()
      .from(supplierOrderItems)
      .where(eq(supplierOrderItems.supplierOrderId, so.id));

    dtos.push(mapSupplierOrderToDTO(so, items));
  }

  return dtos;
}

/**
 * Gets a single supplier order with items. Validates supplier ownership.
 */
export async function getSupplierOrderById(
  supplierOrderId: string,
  supplierId: string
): Promise<SupplierOrderDTO> {
  const so = await getAndValidateSupplierOrder(supplierOrderId, supplierId);

  const items = await db
    .select()
    .from(supplierOrderItems)
    .where(eq(supplierOrderItems.supplierOrderId, supplierOrderId));

  return mapSupplierOrderToDTO(so, items);
}

/**
 * Gets supplier orders for a customer order (merchant view).
 */
export async function getSupplierOrdersForOrder(
  orderId: string,
  storeId: string
): Promise<SupplierOrderDTO[]> {
  const results = await db
    .select()
    .from(supplierOrders)
    .where(
      and(
        eq(supplierOrders.orderId, orderId),
        eq(supplierOrders.storeId, storeId)
      )
    );

  const dtos: SupplierOrderDTO[] = [];
  for (const so of results) {
    const items = await db
      .select()
      .from(supplierOrderItems)
      .where(eq(supplierOrderItems.supplierOrderId, so.id));

    dtos.push(mapSupplierOrderToDTO(so, items));
  }

  return dtos;
}

// ─── Internal Helpers ──────────────────────────────────

async function getAndValidateSupplierOrder(
  supplierOrderId: string,
  supplierId: string
) {
  const [so] = await db
    .select()
    .from(supplierOrders)
    .where(
      and(
        eq(supplierOrders.id, supplierOrderId),
        eq(supplierOrders.supplierId, supplierId)
      )
    )
    .limit(1);

  if (!so) throw new NotFoundError("Supplier Order");
  return so;
}

/**
 * Releases reserved supplier inventory (on rejection, cancellation, or RTO).
 * Does NOT modify merchant inventory.
 */
async function releaseSupplierInventory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  supplierOrderId: string
) {
  const items = await tx
    .select()
    .from(supplierOrderItems)
    .where(eq(supplierOrderItems.supplierOrderId, supplierOrderId));

  for (const item of items) {
    await tx
      .update(supplierInventory)
      .set({
        reserved: sql`GREATEST(0, ${supplierInventory.reserved} - ${item.quantity})`,
        available: sql`${supplierInventory.available} + ${item.quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supplierInventory.supplierVariantId, item.supplierVariantId)
        )
      );
  }
}

/**
 * Finalizes supplier inventory on delivery — deducts from on_hand and releases reserved.
 * Merchant inventory is NOT affected (supplier-owned product).
 */
async function finalizeSupplierInventory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  supplierOrderId: string
) {
  const items = await tx
    .select()
    .from(supplierOrderItems)
    .where(eq(supplierOrderItems.supplierOrderId, supplierOrderId));

  for (const item of items) {
    await tx
      .update(supplierInventory)
      .set({
        onHand: sql`GREATEST(0, ${supplierInventory.onHand} - ${item.quantity})`,
        reserved: sql`GREATEST(0, ${supplierInventory.reserved} - ${item.quantity})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supplierInventory.supplierVariantId, item.supplierVariantId)
        )
      );
  }
}

function mapSupplierOrderToDTO(
  so: typeof supplierOrders.$inferSelect,
  items: (typeof supplierOrderItems.$inferSelect)[]
): SupplierOrderDTO {
  return {
    id: so.id,
    orderId: so.orderId,
    storeId: so.storeId,
    supplierId: so.supplierId,
    status: so.status,
    rejectionReason: so.rejectionReason,
    supplierCostTotalPaise: so.supplierCostTotalPaise,
    shippingAddress: so.shippingAddress as unknown as Record<string, unknown>,
    deadlineAt: so.deadlineAt?.toISOString() ?? null,
    acceptedAt: so.acceptedAt?.toISOString() ?? null,
    shippedAt: so.shippedAt?.toISOString() ?? null,
    deliveredAt: so.deliveredAt?.toISOString() ?? null,
    items: items.map((i) => ({
      id: i.id,
      orderItemId: i.orderItemId,
      supplierProductId: i.supplierProductId,
      supplierVariantId: i.supplierVariantId,
      quantity: i.quantity,
      supplierCostPaise: i.supplierCostPaise,
    })),
    createdAt: so.createdAt.toISOString(),
  };
}
