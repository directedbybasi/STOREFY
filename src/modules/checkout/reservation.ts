import { db } from "@/database/client";
import {
  inventory,
  inventoryMovements,
  checkoutSessions,
  checkoutSessionItems,
} from "@/database/schema";
import { eq, and, lt } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/core/errors";

export interface ItemToReserve {
  productId: string;
  variantId: string;
  quantity: number;
  unitPricePaise: number;
}

export const RESERVATION_HOLD_MINUTES = 15;

/**
 * Atomically locks inventory rows FOR UPDATE in deterministic order and creates
 * a 15-minute stock hold.
 * 
 * If ANY variant has insufficient stock, the transaction aborts and rolls back
 * completely to prevent partial reservations or overselling.
 */
export async function reserveCheckoutItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  storeId: string,
  checkoutSessionId: string,
  items: ItemToReserve[],
  expiresAt: Date
) {
  if (items.length === 0) {
    throw new ConflictError("Cannot reserve stock for an empty checkout.");
  }

  // Sort items deterministically by variantId to prevent database deadlocks
  const sortedItems = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));

  for (const item of sortedItems) {
    // Acquire exclusive row-level lock
    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, item.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (!current) {
      throw new NotFoundError(
        `Inventory record for variant ${item.variantId} not found in this store.`
      );
    }

    if (current.available < item.quantity) {
      throw new ConflictError(
        `Insufficient available stock to reserve. Available: ${current.available}, Requested: ${item.quantity}`
      );
    }

    const newReserved = current.reserved + item.quantity;
    const newAvailable = current.onHand - newReserved;

    // 1. Update inventory row
    await tx
      .update(inventory)
      .set({
        reserved: newReserved,
        available: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, current.id));

    // 2. Write immutable audit ledger movement
    await tx.insert(inventoryMovements).values({
      storeId,
      productId: item.productId,
      variantId: item.variantId,
      quantityDelta: -item.quantity,
      quantityBefore: current.available,
      quantityAfter: newAvailable,
      reason: "RESERVATION",
      referenceId: checkoutSessionId,
      referenceType: "CHECKOUT_RESERVATION",
    });

    // 3. Insert reservation item snapshot
    await tx.insert(checkoutSessionItems).values({
      checkoutSessionId,
      storeId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPricePaise,
      subtotal: item.unitPricePaise * item.quantity,
      status: "ACTIVE",
      expiresAt,
    });
  }
}

/**
 * Releases all active stock reservations for a checkout session.
 * Used when a checkout is cancelled, expires, or fails validation.
 */
export async function releaseCheckoutReservation(
  checkoutSessionId: string,
  storeId: string,
  status: "EXPIRED" | "CANCELLED" = "CANCELLED"
) {
  return await db.transaction(async (tx) => {
    // 1. Load active items for this checkout session
    const activeItems = await tx
      .select()
      .from(checkoutSessionItems)
      .where(
        and(
          eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId),
          eq(checkoutSessionItems.storeId, storeId),
          eq(checkoutSessionItems.status, "ACTIVE")
        )
      );

    if (activeItems.length === 0) {
      // Mark session status if not already set
      await tx
        .update(checkoutSessions)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(checkoutSessions.id, checkoutSessionId),
            eq(checkoutSessions.storeId, storeId)
          )
        );
      return { releasedCount: 0 };
    }

    // Sort deterministically to prevent deadlocks
    const sorted = [...activeItems].sort((a, b) => a.variantId.localeCompare(b.variantId));

    for (const item of sorted) {
      const [current] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.variantId, item.variantId),
            eq(inventory.storeId, storeId)
          )
        )
        .for("update");

      if (current) {
        const releaseAmount = Math.min(current.reserved, item.quantity);
        const newReserved = Math.max(0, current.reserved - releaseAmount);
        const newAvailable = current.onHand - newReserved;

        await tx
          .update(inventory)
          .set({
            reserved: newReserved,
            available: newAvailable,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, current.id));

        await tx.insert(inventoryMovements).values({
          storeId,
          productId: item.productId,
          variantId: item.variantId,
          quantityDelta: releaseAmount,
          quantityBefore: current.available,
          quantityAfter: newAvailable,
          reason: "RELEASE",
          referenceId: checkoutSessionId,
          referenceType: status === "EXPIRED" ? "CHECKOUT_EXPIRATION" : "CHECKOUT_CANCELLATION",
        });
      }

      // Mark line item as RELEASED
      await tx
        .update(checkoutSessionItems)
        .set({ status: "RELEASED" })
        .where(eq(checkoutSessionItems.id, item.id));
    }

    // Update checkout session status
    await tx
      .update(checkoutSessions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutSessions.id, checkoutSessionId),
          eq(checkoutSessions.storeId, storeId)
        )
      );

    return { releasedCount: activeItems.length };
  });
}

/**
 * Scans and releases expired reservations based on durable database timestamps.
 * Run periodically or lazily before critical operations.
 */
export async function releaseExpiredReservations(storeId?: string): Promise<number> {
  const now = new Date();

  // Find all expired active sessions
  const conditions = [
    eq(checkoutSessions.status, "RESERVED"),
    lt(checkoutSessions.expiresAt, now),
  ];

  if (storeId) {
    conditions.push(eq(checkoutSessions.storeId, storeId));
  }

  const expiredSessions = await db
    .select({ id: checkoutSessions.id, storeId: checkoutSessions.storeId })
    .from(checkoutSessions)
    .where(and(...conditions))
    .limit(50);

  let releasedSessions = 0;
  for (const session of expiredSessions) {
    await releaseCheckoutReservation(session.id, session.storeId, "EXPIRED");
    releasedSessions++;
  }

  return releasedSessions;
}

/**
 * Consumes a stock reservation during Phase 9 Order Confirmation.
 * Atomically decreases on_hand and reserved stock (available remains unchanged).
 */
export async function consumeCheckoutReservation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  checkoutSessionId: string,
  storeId: string,
  orderId: string
) {
  const activeItems = await tx
    .select()
    .from(checkoutSessionItems)
    .where(
      and(
        eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId),
        eq(checkoutSessionItems.storeId, storeId),
        eq(checkoutSessionItems.status, "ACTIVE")
      )
    );

  const sorted = [...activeItems].sort((a, b) => a.variantId.localeCompare(b.variantId));

  for (const item of sorted) {
    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, item.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (current) {
      const newOnHand = Math.max(0, current.onHand - item.quantity);
      const newReserved = Math.max(0, current.reserved - item.quantity);
      const newAvailable = newOnHand - newReserved;

      await tx
        .update(inventory)
        .set({
          onHand: newOnHand,
          reserved: newReserved,
          available: newAvailable,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, current.id));

      await tx.insert(inventoryMovements).values({
        storeId,
        productId: item.productId,
        variantId: item.variantId,
        quantityDelta: -item.quantity,
        quantityBefore: current.onHand,
        quantityAfter: newOnHand,
        reason: "FULFILLMENT",
        referenceId: orderId,
        referenceType: "ORDER_CONFIRMATION",
      });
    }

    await tx
      .update(checkoutSessionItems)
      .set({ status: "CONSUMED" })
      .where(eq(checkoutSessionItems.id, item.id));
  }

  await tx
    .update(checkoutSessions)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    );
}
