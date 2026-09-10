"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import {
  inventory,
  inventoryMovements,
  products,
  productVariants,
} from "@/database/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import {
  StockAdjustmentSchema,
  BulkInventoryAdjustmentSchema,
  InventoryThresholdSchema,
  ReservationSchema,
  InventoryFilterSchema,
  type StockAdjustmentInput,
  type BulkInventoryAdjustmentInput,
  type InventoryThresholdInput,
  type ReservationInput,
  type InventoryFilterInput,
} from "./validation";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";

const DEFAULT_LOCATION_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Ensures an inventory row exists for a given variant.
 * Idempotent: uses onConflictDoNothing.
 */
async function ensureInventoryRecord(
  executor: typeof db,
  storeId: string,
  productId: string,
  variantId: string,
  lowStockThreshold = 5
) {
  await executor
    .insert(inventory)
    .values({
      storeId,
      productId,
      variantId,
      locationId: DEFAULT_LOCATION_ID,
      onHand: 0,
      reserved: 0,
      available: 0,
      incoming: 0,
      lowStockThreshold,
    })
    .onConflictDoNothing();
}

export interface InventoryItemDTO {
  inventoryId: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  lowStockThreshold: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: Date;
}

export interface InventoryListResult {
  items: InventoryItemDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalVariants: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
  };
}

/**
 * Server-side paginated inventory query strictly tenant-isolated.
 * Automatically synchronizes variant inventory records if not already initialized.
 */
export async function getInventoryListAction(
  params: Partial<InventoryFilterInput> = {}
): Promise<InventoryListResult> {
  const ctx = await requirePermission("inventory:read");
  const storeId = ctx.store.id;
  const parsed = InventoryFilterSchema.parse(params);

  // 1. Fetch all store variants with products and optional existing inventory
  // Ensure inventory records exist for all variants of this store
  const uninitializedVariants = await db
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      threshold: products.lowStockThreshold,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(
      inventory,
      and(
        eq(inventory.variantId, productVariants.id),
        eq(inventory.storeId, storeId)
      )
    )
    .where(and(eq(productVariants.storeId, storeId), sql`${inventory.id} IS NULL`));

  if (uninitializedVariants.length > 0) {
    for (const uv of uninitializedVariants) {
      await ensureInventoryRecord(
        db,
        storeId,
        uv.productId,
        uv.variantId,
        uv.threshold ?? 5
      );
    }
  }

  // 2. Query inventory joined with variant and product
  const baseQuery = db
    .select({
      inventoryId: inventory.id,
      variantId: productVariants.id,
      productId: products.id,
      productTitle: products.title,
      variantTitle: productVariants.title,
      sku: productVariants.sku,
      imageUrl: productVariants.imageUrl,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      available: inventory.available,
      incoming: inventory.incoming,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.storeId, storeId));

  const allRecords = await baseQuery;

  // 3. Transform with status
  let transformed: InventoryItemDTO[] = allRecords.map((r) => {
    let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (r.available <= 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (r.available <= r.lowStockThreshold) {
      stockStatus = "LOW_STOCK";
    }

    return {
      ...r,
      stockStatus,
    };
  });

  // Calculate summary before filters
  const summary = {
    totalVariants: transformed.length,
    inStockCount: transformed.filter((i) => i.stockStatus === "IN_STOCK").length,
    lowStockCount: transformed.filter((i) => i.stockStatus === "LOW_STOCK").length,
    outOfStockCount: transformed.filter((i) => i.stockStatus === "OUT_OF_STOCK").length,
    totalOnHand: transformed.reduce((acc, i) => acc + i.onHand, 0),
    totalReserved: transformed.reduce((acc, i) => acc + i.reserved, 0),
    totalAvailable: transformed.reduce((acc, i) => acc + i.available, 0),
  };

  // 4. Apply search filter
  if (parsed.search && parsed.search.trim().length > 0) {
    const q = parsed.search.trim().toLowerCase();
    transformed = transformed.filter(
      (item) =>
        item.productTitle.toLowerCase().includes(q) ||
        item.variantTitle.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q))
    );
  }

  // 5. Apply stock status filter
  if (parsed.stockStatus && parsed.stockStatus !== "ALL") {
    transformed = transformed.filter((item) => item.stockStatus === parsed.stockStatus);
  }

  // 6. Apply sorting
  transformed.sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (parsed.sortBy) {
      case "name":
        valA = a.productTitle.toLowerCase();
        valB = b.productTitle.toLowerCase();
        break;
      case "sku":
        valA = (a.sku || "").toLowerCase();
        valB = (b.sku || "").toLowerCase();
        break;
      case "on_hand":
        valA = a.onHand;
        valB = b.onHand;
        break;
      case "reserved":
        valA = a.reserved;
        valB = b.reserved;
        break;
      case "available":
      default:
        valA = a.available;
        valB = b.available;
        break;
    }

    if (valA < valB) return parsed.sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return parsed.sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalCount = transformed.length;
  const totalPages = Math.ceil(totalCount / parsed.pageSize) || 1;
  const offset = (parsed.page - 1) * parsed.pageSize;
  const pagedItems = transformed.slice(offset, offset + parsed.pageSize);

  return {
    items: pagedItems,
    totalCount,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages,
    summary,
  };
}

/**
 * Retrieves detailed inventory information for a specific variant,
 * including immutable ledger movement history.
 */
export async function getInventoryDetailAction(variantId: string) {
  const ctx = await requirePermission("inventory:read");
  const storeId = ctx.store.id;

  // 1. Verify variant ownership
  const [variant] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      title: productVariants.title,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
      imageUrl: productVariants.imageUrl,
      price: productVariants.price,
      costPrice: productVariants.costPrice,
      productTitle: products.title,
      productStatus: products.status,
      productSlug: products.slug,
      defaultThreshold: products.lowStockThreshold,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.storeId, storeId)))
    .limit(1);

  if (!variant) {
    throw new NotFoundError(`Variant not found or unauthorized: ${variantId}`);
  }

  // 2. Ensure inventory row exists
  await ensureInventoryRecord(
    db,
    storeId,
    variant.productId,
    variant.id,
    variant.defaultThreshold ?? 5
  );

  const [invRecord] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.variantId, variantId), eq(inventory.storeId, storeId)))
    .limit(1);

  // 3. Fetch immutable ledger history
  const movements = await db
    .select()
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.variantId, variantId),
        eq(inventoryMovements.storeId, storeId)
      )
    )
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(100);

  let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
  if (invRecord.available <= 0) {
    stockStatus = "OUT_OF_STOCK";
  } else if (invRecord.available <= invRecord.lowStockThreshold) {
    stockStatus = "LOW_STOCK";
  }

  return {
    variant,
    inventory: {
      ...invRecord,
      stockStatus,
    },
    movements,
  };
}

/**
 * Adjust stock for a single variant with row-level locking, atomic ledger writes,
 * and strict tenant isolation.
 */
export async function adjustStockAction(input: StockAdjustmentInput) {
  const parsed = StockAdjustmentSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;
  const actorUserId = ctx.user.id;

  const result = await db.transaction(async (tx) => {
    // 1. Verify variant exists and belongs to active store
    const [variant] = await tx
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        threshold: products.lowStockThreshold,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.id, parsed.variantId),
          eq(productVariants.storeId, storeId)
        )
      )
      .limit(1);

    if (!variant) {
      throw new NotFoundError(
        `Variant ${parsed.variantId} not found or unauthorized for store ${storeId}`
      );
    }

    // 2. Ensure row exists before locking
    await ensureInventoryRecord(
      tx as unknown as typeof db,
      storeId,
      variant.productId,
      variant.id,
      variant.threshold ?? 5
    );

    // 3. Acquire row lock (FOR UPDATE)
    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, parsed.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (!current) {
      throw new NotFoundError(`Inventory record not found for variant ${parsed.variantId}`);
    }

    const currentOnHand = current.onHand;
    const currentReserved = current.reserved;
    const newOnHand = currentOnHand + parsed.quantityDelta;

    // 4. Validate stock limits: onHand cannot be negative
    if (newOnHand < 0) {
      throw new ValidationError(
        `Insufficient on-hand stock. Current on-hand is ${currentOnHand}, attempted delta is ${parsed.quantityDelta}`
      );
    }

    // Do not allow reducing on_hand below reserved quantity
    if (newOnHand < currentReserved) {
      throw new ValidationError(
        `Cannot reduce stock below active reservations (On hand: ${newOnHand}, Reserved: ${currentReserved})`
      );
    }

    const newAvailable = newOnHand - currentReserved;

    // 5. Update inventory table
    const [updated] = await tx
      .update(inventory)
      .set({
        onHand: newOnHand,
        available: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, current.id))
      .returning();

    // 6. Append immutable movement record to ledger
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        storeId,
        productId: variant.productId,
        variantId: variant.id,
        quantityDelta: parsed.quantityDelta,
        quantityBefore: currentOnHand,
        quantityAfter: newOnHand,
        reason: parsed.reason,
        referenceId: parsed.referenceId || null,
        referenceType: parsed.referenceType || "MANUAL_ADJUSTMENT",
        createdBy: actorUserId,
      })
      .returning();

    return {
      inventory: updated,
      movement,
    };
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${parsed.variantId}`);

  return {
    success: true,
    data: result,
  };
}

/**
 * Bulk stock adjustment executed within a single all-or-nothing transaction.
 */
export async function bulkAdjustStockAction(input: BulkInventoryAdjustmentInput) {
  const parsed = BulkInventoryAdjustmentSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;
  const actorUserId = ctx.user.id;

  const variantIds = parsed.adjustments.map((a) => a.variantId);

  const results = await db.transaction(async (tx) => {
    // 1. Verify all variants belong to the active store
    const variants = await tx
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        threshold: products.lowStockThreshold,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          inArray(productVariants.id, variantIds),
          eq(productVariants.storeId, storeId)
        )
      );

    if (variants.length !== variantIds.length) {
      throw new ValidationError(
        "One or more selected variants do not belong to the active store or do not exist."
      );
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const updatedList = [];

    // 2. Process each adjustment in deterministic order to prevent deadlocks
    const sortedAdjustments = [...parsed.adjustments].sort((a, b) =>
      a.variantId.localeCompare(b.variantId)
    );

    for (const adj of sortedAdjustments) {
      const variant = variantMap.get(adj.variantId)!;

      // Ensure record exists
      await ensureInventoryRecord(
        tx as unknown as typeof db,
        storeId,
        variant.productId,
        variant.id,
        variant.threshold ?? 5
      );

      // Lock row
      const [current] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.variantId, adj.variantId),
            eq(inventory.storeId, storeId)
          )
        )
        .for("update");

      const newOnHand = current.onHand + adj.quantityDelta;
      if (newOnHand < 0) {
        throw new ValidationError(
          `Insufficient stock for variant ${adj.variantId}: on-hand is ${current.onHand}, cannot subtract ${Math.abs(adj.quantityDelta)}`
        );
      }
      if (newOnHand < current.reserved) {
        throw new ValidationError(
          `Cannot reduce stock below active reservations for variant ${adj.variantId}`
        );
      }

      const newAvailable = newOnHand - current.reserved;

      const [updated] = await tx
        .update(inventory)
        .set({
          onHand: newOnHand,
          available: newAvailable,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, current.id))
        .returning();

      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          storeId,
          productId: variant.productId,
          variantId: variant.id,
          quantityDelta: adj.quantityDelta,
          quantityBefore: current.onHand,
          quantityAfter: newOnHand,
          reason: parsed.reason,
          referenceId: parsed.referenceId || null,
          referenceType: parsed.referenceType || "BULK_ADJUSTMENT",
          createdBy: actorUserId,
        })
        .returning();

      updatedList.push({ inventory: updated, movement });
    }

    return updatedList;
  });

  revalidatePath("/dashboard/inventory");

  return {
    success: true,
    count: results.length,
    data: results,
  };
}

/**
 * Updates low stock alert threshold for a variant.
 */
export async function updateInventoryThresholdAction(input: InventoryThresholdInput) {
  const parsed = InventoryThresholdSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;

  // Validate variant ownership
  const [variant] = await db
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.id, parsed.variantId),
        eq(productVariants.storeId, storeId)
      )
    )
    .limit(1);

  if (!variant) {
    throw new NotFoundError(`Variant not found or unauthorized: ${parsed.variantId}`);
  }

  await ensureInventoryRecord(
    db,
    storeId,
    variant.productId,
    variant.id,
    parsed.lowStockThreshold
  );

  const [updated] = await db
    .update(inventory)
    .set({
      lowStockThreshold: parsed.lowStockThreshold,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventory.variantId, parsed.variantId),
        eq(inventory.storeId, storeId)
      )
    )
    .returning();

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${parsed.variantId}`);

  return {
    success: true,
    inventory: updated,
  };
}

/**
 * Reserves stock for a variant (e.g. during checkout initiation).
 * Enforces row locks and available inventory bounds.
 */
export async function reserveInventoryAction(input: ReservationInput) {
  const parsed = ReservationSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;
  const actorUserId = ctx.user.id;

  const result = await db.transaction(async (tx) => {
    const [variant] = await tx
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, parsed.variantId),
          eq(productVariants.storeId, storeId)
        )
      )
      .limit(1);

    if (!variant) {
      throw new NotFoundError(`Variant ${parsed.variantId} not found`);
    }

    await ensureInventoryRecord(
      tx as unknown as typeof db,
      storeId,
      variant.productId,
      variant.id
    );

    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, parsed.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (current.available < parsed.quantity) {
      throw new ConflictError(
        `Insufficient available stock to reserve. Available: ${current.available}, Requested: ${parsed.quantity}`
      );
    }

    const newReserved = current.reserved + parsed.quantity;
    const newAvailable = current.onHand - newReserved;

    const [updated] = await tx
      .update(inventory)
      .set({
        reserved: newReserved,
        available: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, current.id))
      .returning();

    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        storeId,
        productId: variant.productId,
        variantId: variant.id,
        quantityDelta: -parsed.quantity,
        quantityBefore: current.available,
        quantityAfter: newAvailable,
        reason: "RESERVATION",
        referenceId: parsed.referenceId,
        referenceType: parsed.referenceType,
        createdBy: actorUserId,
      })
      .returning();

    return { inventory: updated, movement };
  });

  return {
    success: true,
    data: result,
  };
}

/**
 * Releases a stock reservation (e.g. cart abandonment, order cancellation before fulfillment).
 */
export async function releaseReservationAction(input: ReservationInput) {
  const parsed = ReservationSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;
  const actorUserId = ctx.user.id;

  const result = await db.transaction(async (tx) => {
    const [variant] = await tx
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, parsed.variantId),
          eq(productVariants.storeId, storeId)
        )
      )
      .limit(1);

    if (!variant) {
      throw new NotFoundError(`Variant ${parsed.variantId} not found`);
    }

    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, parsed.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (!current) {
      throw new NotFoundError(`Inventory record not found for variant ${parsed.variantId}`);
    }

    const releaseAmount = Math.min(current.reserved, parsed.quantity);
    const newReserved = current.reserved - releaseAmount;
    const newAvailable = current.onHand - newReserved;

    const [updated] = await tx
      .update(inventory)
      .set({
        reserved: newReserved,
        available: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, current.id))
      .returning();

    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        storeId,
        productId: variant.productId,
        variantId: variant.id,
        quantityDelta: releaseAmount,
        quantityBefore: current.available,
        quantityAfter: newAvailable,
        reason: "RELEASE",
        referenceId: parsed.referenceId,
        referenceType: parsed.referenceType,
        createdBy: actorUserId,
      })
      .returning();

    return { inventory: updated, movement };
  });

  return {
    success: true,
    data: result,
  };
}

/**
 * Consumes a stock reservation upon order confirmation / fulfillment.
 * Decreases both on_hand and reserved stock atomically.
 */
export async function consumeReservationAction(input: ReservationInput) {
  const parsed = ReservationSchema.parse(input);
  const ctx = await requirePermission("inventory:adjust");
  const storeId = ctx.store.id;
  const actorUserId = ctx.user.id;

  const result = await db.transaction(async (tx) => {
    const [variant] = await tx
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, parsed.variantId),
          eq(productVariants.storeId, storeId)
        )
      )
      .limit(1);

    if (!variant) {
      throw new NotFoundError(`Variant ${parsed.variantId} not found`);
    }

    const [current] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.variantId, parsed.variantId),
          eq(inventory.storeId, storeId)
        )
      )
      .for("update");

    if (!current) {
      throw new NotFoundError(`Inventory record not found for variant ${parsed.variantId}`);
    }

    const consumeAmount = parsed.quantity;
    const newReserved = Math.max(0, current.reserved - consumeAmount);
    const newOnHand = Math.max(0, current.onHand - consumeAmount);
    const newAvailable = newOnHand - newReserved;

    const [updated] = await tx
      .update(inventory)
      .set({
        onHand: newOnHand,
        reserved: newReserved,
        available: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, current.id))
      .returning();

    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        storeId,
        productId: variant.productId,
        variantId: variant.id,
        quantityDelta: -consumeAmount,
        quantityBefore: current.onHand,
        quantityAfter: newOnHand,
        reason: "SALE",
        referenceId: parsed.referenceId,
        referenceType: parsed.referenceType,
        createdBy: actorUserId,
      })
      .returning();

    return { inventory: updated, movement };
  });

  return {
    success: true,
    data: result,
  };
}
