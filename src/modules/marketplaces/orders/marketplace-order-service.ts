import { db } from "@/database/client";
import {
  orders,
  orderItems,
  products,
  marketplaceOrderTasks,
  marketplaceProductMappings,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError } from "@/core/errors";
import type { MarketplaceOrderTaskDTO } from "./types";

/**
 * Server-authoritative routing for marketplace reselling items (Meesho, etc.).
 *
 * INVARIANTS:
 * 1. Derives items strictly from product.source === 'MEESHO' and database mappings
 * 2. Never trusts client-submitted fulfillment flags or source identities
 * 3. Creates one marketplace_order_task per order item for tracking and fulfillment
 */
export async function routeOrderToMarketplaces(
  orderId: string,
  storeId: string
): Promise<{ tasksCreated: number }> {
  // 1. Get the order
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) return { tasksCreated: 0 };

  // 2. Get order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  let tasksCreated = 0;

  for (const item of items) {
    // Check product source
    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!prod || prod.source !== "MEESHO") {
      continue;
    }

    // Resolve marketplace mapping
    const [mapping] = await db
      .select()
      .from(marketplaceProductMappings)
      .where(
        and(
          eq(marketplaceProductMappings.storeId, storeId),
          eq(marketplaceProductMappings.productId, item.productId)
        )
      )
      .limit(1);

    const sourceProductId = mapping?.sourceProductId || "UNKNOWN";
    const sourceVariantId = mapping?.sourceVariantId || null;
    const sourceCostPaise = mapping?.sourceCostSnapshotPaise ?? prod.costPrice ?? 0;

    // Check if task already exists for this order item (idempotency)
    const [existingTask] = await db
      .select()
      .from(marketplaceOrderTasks)
      .where(eq(marketplaceOrderTasks.orderItemId, item.id))
      .limit(1);

    if (existingTask) continue;

    await db.insert(marketplaceOrderTasks).values({
      orderId,
      orderItemId: item.id,
      storeId,
      marketplace: "MEESHO",
      sourceProductId,
      sourceVariantId,
      status: "PENDING",
      sourceCostPaise: sourceCostPaise * item.quantity,
    });

    tasksCreated++;
  }

  return { tasksCreated };
}

/**
 * Lists marketplace order tasks for a store with order details and shipping address.
 */
export async function listMarketplaceOrderTasks(
  storeId: string,
  status?: string
): Promise<MarketplaceOrderTaskDTO[]> {
  const conditions = [eq(marketplaceOrderTasks.storeId, storeId)];
  if (status) {
    conditions.push(eq(marketplaceOrderTasks.status, status as unknown as (typeof marketplaceOrderTasks.status._.data)));
  }

  const tasks = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(and(...conditions))
    .orderBy(desc(marketplaceOrderTasks.createdAt));

  const results: MarketplaceOrderTaskDTO[] = [];

  for (const t of tasks) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, t.orderId))
      .limit(1);

    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, t.orderItemId))
      .limit(1);

    results.push({
      id: t.id,
      orderId: t.orderId,
      orderNumber: order?.orderNumber || undefined,
      orderItemId: t.orderItemId,
      storeId: t.storeId,
      marketplace: t.marketplace,
      sourceProductId: t.sourceProductId,
      sourceVariantId: t.sourceVariantId,
      productTitle: item?.title || "Unknown Product",
      quantity: item?.quantity || 1,
      status: t.status,
      sourceOrderId: t.sourceOrderId,
      sourceOrderReference: t.sourceOrderReference,
      trackingNumber: t.trackingNumber,
      carrier: t.carrier,
      notes: t.notes,
      sourceCostPaise: t.sourceCostPaise,
      shippingAddress: (order?.shippingAddress as unknown as Record<string, unknown>) || {},
      orderedAt: t.orderedAt ? t.orderedAt.toISOString() : null,
      shippedAt: t.shippedAt ? t.shippedAt.toISOString() : null,
      deliveredAt: t.deliveredAt ? t.deliveredAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    });
  }

  return results;
}

/**
 * Gets a single marketplace order task by ID.
 */
export async function getMarketplaceOrderTaskById(
  storeId: string,
  taskId: string
): Promise<MarketplaceOrderTaskDTO> {
  const [t] = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(
      and(
        eq(marketplaceOrderTasks.id, taskId),
        eq(marketplaceOrderTasks.storeId, storeId)
      )
    )
    .limit(1);

  if (!t) throw new NotFoundError("Marketplace Order Task");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, t.orderId))
    .limit(1);

  const [item] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.id, t.orderItemId))
    .limit(1);

  return {
    id: t.id,
    orderId: t.orderId,
    orderNumber: order?.orderNumber || undefined,
    orderItemId: t.orderItemId,
    storeId: t.storeId,
    marketplace: t.marketplace,
    sourceProductId: t.sourceProductId,
    sourceVariantId: t.sourceVariantId,
    productTitle: item?.title || "Unknown Product",
    quantity: item?.quantity || 1,
    status: t.status,
    sourceOrderId: t.sourceOrderId,
    sourceOrderReference: t.sourceOrderReference,
    trackingNumber: t.trackingNumber,
    carrier: t.carrier,
    notes: t.notes,
    sourceCostPaise: t.sourceCostPaise,
    shippingAddress: (order?.shippingAddress as unknown as Record<string, unknown>) || {},
    orderedAt: t.orderedAt ? t.orderedAt.toISOString() : null,
    shippedAt: t.shippedAt ? t.shippedAt.toISOString() : null,
    deliveredAt: t.deliveredAt ? t.deliveredAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}
