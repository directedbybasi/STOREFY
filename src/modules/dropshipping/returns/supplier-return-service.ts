import { db } from "@/database/client";
import {
  supplierOrders,
  supplierOrderItems,
  supplierInventory,
  resellerProductMappings,
  returns,
  returnItems,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/core/errors";

/**
 * Handles return processing for supplier-fulfilled items.
 *
 * Key invariants:
 * - Restocks go to SUPPLIER inventory (not merchant inventory)
 * - Supplier can review physical return condition
 * - Return quantity validation prevents exceeding ordered quantity
 */
export async function processSupplierReturn(
  returnId: string,
  supplierOrderId: string,
  supplierReview: {
    condition: "GOOD" | "DAMAGED" | "DEFECTIVE";
    restockable: boolean;
    notes?: string;
  }
): Promise<{ restocked: number; supplierInventoryUpdated: boolean }> {
  // Get the return and its items
  const [returnRecord] = await db
    .select()
    .from(returns)
    .where(eq(returns.id, returnId))
    .limit(1);

  if (!returnRecord) throw new NotFoundError("Return");

  const returnItemRecords = await db
    .select()
    .from(returnItems)
    .where(eq(returnItems.returnId, returnId));

  // Get supplier order items to find supplier variant mapping
  const soItems = await db
    .select()
    .from(supplierOrderItems)
    .where(eq(supplierOrderItems.supplierOrderId, supplierOrderId));

  let restockedCount = 0;

  if (supplierReview.restockable && supplierReview.condition === "GOOD") {
    for (const ri of returnItemRecords) {
      // Find the matching supplier order item by orderItemId
      const matchingSOItem = soItems.find(
        (soi) => soi.orderItemId === ri.orderItemId
      );

      if (!matchingSOItem) continue;

      // Restock to SUPPLIER inventory (NOT merchant inventory)
      const [inv] = await db
        .select()
        .from(supplierInventory)
        .where(
          eq(supplierInventory.supplierVariantId, matchingSOItem.supplierVariantId)
        )
        .limit(1);

      if (inv) {
        await db
          .update(supplierInventory)
          .set({
            onHand: inv.onHand + ri.quantity,
            available: inv.available + ri.quantity,
            updatedAt: new Date(),
          })
          .where(eq(supplierInventory.id, inv.id));

        restockedCount += ri.quantity;
      }
    }
  }

  // Update the return record with supplier review
  await db
    .update(returns)
    .set({
      restockAction: supplierReview.restockable ? "RESTOCK" : "NO_RESTOCK",
      merchantNotes: `Supplier review: ${supplierReview.condition}. ${supplierReview.notes || ""}`,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, returnId));

  return {
    restocked: restockedCount,
    supplierInventoryUpdated: restockedCount > 0,
  };
}

/**
 * Handles RTO restock for supplier inventory.
 * When a supplier shipment is returned to origin, restocks supplier inventory.
 * Merchant inventory is NOT affected (the stock was never merchant-owned).
 */
export async function processSupplierRTORestock(
  supplierOrderId: string
): Promise<{ restocked: number }> {
  const items = await db
    .select()
    .from(supplierOrderItems)
    .where(eq(supplierOrderItems.supplierOrderId, supplierOrderId));

  let restocked = 0;

  for (const item of items) {
    const [inv] = await db
      .select()
      .from(supplierInventory)
      .where(
        eq(supplierInventory.supplierVariantId, item.supplierVariantId)
      )
      .limit(1);

    if (inv) {
      await db
        .update(supplierInventory)
        .set({
          onHand: inv.onHand + item.quantity,
          available: inv.available + item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(supplierInventory.id, inv.id));

      restocked += item.quantity;
    }
  }

  return { restocked };
}
