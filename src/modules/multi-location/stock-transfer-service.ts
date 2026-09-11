import crypto from "crypto";
import { db } from "@/database/client";
import {
  stockTransfers,
  stockTransferLines,
  inventory,
  inventoryMovements,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError, InsufficientStockError } from "@/core/errors";

export interface StockTransferLineInput {
  productId: string;
  variantId: string;
  quantityRequested: number;
}

export interface CreateStockTransferInput {
  storeId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  notes?: string;
  requestedBy?: string;
  lines: StockTransferLineInput[];
}

/**
 * Creates a stock transfer in DRAFT state.
 */
export async function createStockTransfer(input: CreateStockTransferInput) {
  const { storeId, sourceLocationId, destinationLocationId, notes, requestedBy, lines } = input;

  if (sourceLocationId === destinationLocationId) {
    throw new ValidationError("Source and destination locations cannot be identical.");
  }

  if (!lines || lines.length === 0) {
    throw new ValidationError("Transfer must contain at least one line item.");
  }

  const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;

  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        storeId,
        transferNumber,
        sourceLocationId,
        destinationLocationId,
        status: "DRAFT",
        notes: notes || null,
        requestedBy: requestedBy || null,
      })
      .returning();

    for (const line of lines) {
      await tx.insert(stockTransferLines).values({
        transferId: transfer.id,
        productId: line.productId,
        variantId: line.variantId,
        quantityRequested: line.quantityRequested,
      });
    }

    return transfer;
  });
}

/**
 * Ships a stock transfer: atomically deducts stock from source location and transitions to IN_TRANSIT.
 */
export async function shipStockTransfer(storeId: string, transferId: string) {
  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .select()
      .from(stockTransfers)
      .where(and(eq(stockTransfers.storeId, storeId), eq(stockTransfers.id, transferId)))
      .limit(1);

    if (!transfer) throw new NotFoundError("Stock transfer not found.");
    if (transfer.status !== "DRAFT" && transfer.status !== "REQUESTED") {
      throw new ValidationError(`Cannot ship transfer in status '${transfer.status}'.`);
    }

    const lines = await tx
      .select()
      .from(stockTransferLines)
      .where(eq(stockTransferLines.transferId, transferId));

    for (const line of lines) {
      // Deduct from source location
      const [sourceInv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.storeId, storeId),
            eq(inventory.variantId, line.variantId),
            eq(inventory.locationId, transfer.sourceLocationId)
          )
        )
        .limit(1);

      if (!sourceInv || sourceInv.available < line.quantityRequested) {
        throw new InsufficientStockError(
          `Variant ${line.variantId}`,
          sourceInv?.available || 0
        );
      }

      await tx
        .update(inventory)
        .set({
          onHand: sourceInv.onHand - line.quantityRequested,
          available: sourceInv.available - line.quantityRequested,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, sourceInv.id));

      await tx
        .update(stockTransferLines)
        .set({ quantityShipped: line.quantityRequested })
        .where(eq(stockTransferLines.id, line.id));

      // Append immutable inventory movement
      await tx.insert(inventoryMovements).values({
        storeId,
        productId: line.productId,
        variantId: line.variantId,
        quantityDelta: -line.quantityRequested,
        quantityBefore: sourceInv.onHand,
        quantityAfter: sourceInv.onHand - line.quantityRequested,
        reason: "TRANSFER_OUT",
        referenceId: transfer.transferNumber,
        referenceType: "STOCK_TRANSFER",
      });
    }

    const [updated] = await tx
      .update(stockTransfers)
      .set({
        status: "IN_TRANSIT",
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stockTransfers.id, transferId))
      .returning();

    return updated;
  });
}

/**
 * Receives a stock transfer at the destination location, increments destination stock,
 * logs inventory movements, and sets status to RECEIVED.
 */
export async function receiveStockTransfer(
  storeId: string,
  transferId: string,
  receivedBy?: string
) {
  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .select()
      .from(stockTransfers)
      .where(and(eq(stockTransfers.storeId, storeId), eq(stockTransfers.id, transferId)))
      .limit(1);

    if (!transfer) throw new NotFoundError("Stock transfer not found.");
    if (transfer.status !== "IN_TRANSIT") {
      throw new ValidationError("Only IN_TRANSIT transfers can be received.");
    }

    const lines = await tx
      .select()
      .from(stockTransferLines)
      .where(eq(stockTransferLines.transferId, transferId));

    for (const line of lines) {
      const qtyToReceive = line.quantityShipped;

      // Find or insert inventory at destination location
      const [destInv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.storeId, storeId),
            eq(inventory.variantId, line.variantId),
            eq(inventory.locationId, transfer.destinationLocationId)
          )
        )
        .limit(1);

      const before = destInv ? destInv.onHand : 0;
      const after = before + qtyToReceive;

      if (destInv) {
        await tx
          .update(inventory)
          .set({
            onHand: destInv.onHand + qtyToReceive,
            available: destInv.available + qtyToReceive,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, destInv.id));
      } else {
        await tx.insert(inventory).values({
          storeId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: transfer.destinationLocationId,
          onHand: qtyToReceive,
          available: qtyToReceive,
        });
      }

      await tx
        .update(stockTransferLines)
        .set({ quantityReceived: qtyToReceive })
        .where(eq(stockTransferLines.id, line.id));

      await tx.insert(inventoryMovements).values({
        storeId,
        productId: line.productId,
        variantId: line.variantId,
        quantityDelta: qtyToReceive,
        quantityBefore: before,
        quantityAfter: after,
        reason: "TRANSFER_IN",
        referenceId: transfer.transferNumber,
        referenceType: "STOCK_TRANSFER",
      });
    }

    const [updated] = await tx
      .update(stockTransfers)
      .set({
        status: "RECEIVED",
        receivedBy: receivedBy || null,
        receivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stockTransfers.id, transferId))
      .returning();

    return updated;
  });
}
