import crypto from "crypto";
import { db } from "@/database/client";
import {
  purchaseOrders,
  purchaseOrderLines,
  inventory,
  inventoryMovements,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface POLineInput {
  productId: string;
  variantId: string;
  sku?: string;
  quantityOrdered: number;
  unitCostPaise: number;
}

export interface CreatePOInput {
  storeId: string;
  supplierName: string;
  supplierId?: string;
  destinationLocationId: string;
  expectedDate?: Date;
  notes?: string;
  createdBy?: string;
  lines: POLineInput[];
}

/**
 * Creates a supplier purchase order.
 */
export async function createPurchaseOrder(input: CreatePOInput) {
  const {
    storeId,
    supplierName,
    supplierId,
    destinationLocationId,
    expectedDate,
    notes,
    createdBy,
    lines,
  } = input;

  if (!lines || lines.length === 0) {
    throw new ValidationError("Purchase order must have at least one line item.");
  }

  const poNumber = `PO-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;
  const totalCostPaise = lines.reduce((sum, l) => sum + l.unitCostPaise * l.quantityOrdered, 0);

  return db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        storeId,
        poNumber,
        supplierName,
        supplierId: supplierId || null,
        destinationLocationId,
        status: "DRAFT",
        expectedDate: expectedDate || null,
        totalCostPaise,
        notes: notes || null,
        createdBy: createdBy || null,
      })
      .returning();

    for (const l of lines) {
      await tx.insert(purchaseOrderLines).values({
        purchaseOrderId: po.id,
        productId: l.productId,
        variantId: l.variantId,
        sku: l.sku || null,
        quantityOrdered: l.quantityOrdered,
        unitCostPaise: l.unitCostPaise,
        totalCostPaise: l.unitCostPaise * l.quantityOrdered,
      });
    }

    return po;
  });
}

/**
 * Receives stock against a purchase order.
 * Strictly increments physical stock at destination location and logs immutable inventory ledger records.
 */
export async function receivePurchaseOrderStock(
  storeId: string,
  purchaseOrderId: string,
  receivedItems: { lineId: string; quantityToReceive: number }[]
) {
  return db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.storeId, storeId), eq(purchaseOrders.id, purchaseOrderId)))
      .limit(1);

    if (!po) throw new NotFoundError("Purchase order not found.");
    if (po.status === "CANCELLED" || po.status === "RECEIVED") {
      throw new ValidationError(`Cannot receive against purchase order in status '${po.status}'.`);
    }

    let allFullyReceived = true;

    for (const item of receivedItems) {
      if (item.quantityToReceive <= 0) continue;

      const [line] = await tx
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.id, item.lineId))
        .limit(1);

      if (!line) continue;

      const newReceived = line.quantityReceived + item.quantityToReceive;
      await tx
        .update(purchaseOrderLines)
        .set({ quantityReceived: newReceived })
        .where(eq(purchaseOrderLines.id, line.id));

      if (newReceived < line.quantityOrdered) {
        allFullyReceived = false;
      }

      // Increment physical stock at destination location
      const [destInv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.storeId, storeId),
            eq(inventory.variantId, line.variantId),
            eq(inventory.locationId, po.destinationLocationId)
          )
        )
        .limit(1);

      const before = destInv ? destInv.onHand : 0;
      const after = before + item.quantityToReceive;

      if (destInv) {
        await tx
          .update(inventory)
          .set({
            onHand: destInv.onHand + item.quantityToReceive,
            available: destInv.available + item.quantityToReceive,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, destInv.id));
      } else {
        await tx.insert(inventory).values({
          storeId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: po.destinationLocationId,
          onHand: item.quantityToReceive,
          available: item.quantityToReceive,
        });
      }

      // Log append-only inventory movement
      await tx.insert(inventoryMovements).values({
        storeId,
        productId: line.productId,
        variantId: line.variantId,
        quantityDelta: item.quantityToReceive,
        quantityBefore: before,
        quantityAfter: after,
        reason: "PURCHASE_RECEIPT",
        referenceId: po.poNumber,
        referenceType: "PURCHASE_ORDER",
      });
    }

    const newStatus = allFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

    const [updatedPo] = await tx
      .update(purchaseOrders)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, po.id))
      .returning();

    return updatedPo;
  });
}
