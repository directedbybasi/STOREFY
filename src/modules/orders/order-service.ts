import { db } from "@/database/client";
import {
  orders,
  orderItems,
  orderStatusHistory,
  fulfillments,
  returns,
  refunds,
  invoices,
  checkoutSessions,
  checkoutSessionItems,
  inventory,
  inventoryMovements,
  type Order,
  type OrderItem,
} from "@/database/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "@/core/errors";
import { formatPaiseToRupees } from "@/modules/cart/service";
import { consumeCheckoutReservation } from "@/modules/checkout/reservation";
import { generateOrderNumber } from "./numbering";
import { assertValidOrderTransition, isOrderCancellable } from "./state-machine";
import { createOrderInvoice, buildInvoiceDTO } from "./invoice-service";
import { routeOrderToSuppliers } from "@/modules/dropshipping/routing/order-router";
import { routeOrderToMarketplaces } from "@/modules/marketplaces/orders/marketplace-order-service";
import type {
  OrderDetailDTO,
  OrderSummaryDTO,
  OrderItemDTO,
  OrderStatusHistoryDTO,
  FulfillmentDTO,
  ReturnDTO,
  RefundDTO,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  ReturnStatus,
  RefundStatus,
  OrderListQueryFilters,
} from "./types";

/**
 * 1. Idempotent Order Creation from a Confirmed/Reserved Checkout Session.
 * Consumes the 15-minute reservation, persists immutable snapshots, generates
 * collision-safe order number, and creates initial audit history.
 */
export async function createOrderFromCheckoutSession(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string,
  customerId?: string | null
): Promise<OrderDetailDTO> {
  // 1. Idempotency Check: if order was already generated for this session, return it
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        eq(orders.checkoutSessionId, checkoutSessionId)
      )
    )
    .limit(1);

  if (existingOrder) {
    return await getOrderById(storeId, existingOrder.id);
  }

  // 2. Validate checkout session
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId),
        eq(checkoutSessions.sessionToken, sessionToken)
      )
    )
    .limit(1);

  if (!session) {
    throw new NotFoundError("Checkout session not found or unauthorized.");
  }

  if (session.status === "EXPIRED") {
    throw new ConflictError("Your checkout reservation has expired. Please return to the cart.");
  }

  if (session.status === "CANCELLED") {
    throw new ConflictError("Checkout session was cancelled.");
  }

  if (!session.email || !session.phone || !session.fullName) {
    throw new ValidationError("Checkout contact details are incomplete.");
  }

  if (!session.shippingAddress || !session.billingAddress) {
    throw new ValidationError("Checkout addresses are missing.");
  }

  // 3. Load active reserved items
  const reservedItems = await db
    .select()
    .from(checkoutSessionItems)
    .where(
      and(
        eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId),
        eq(checkoutSessionItems.storeId, storeId),
        eq(checkoutSessionItems.status, "ACTIVE")
      )
    );

  if (reservedItems.length === 0) {
    throw new ConflictError("No active reserved items found in this checkout session.");
  }

  // Generate unique human-readable order number
  const orderNumber = await generateOrderNumber(storeId);

  // 4. Execute atomic database transaction
  const createdOrder = await db.transaction(async (tx) => {
    // A. Insert order record
    const [newOrder] = await tx
      .insert(orders)
      .values({
        storeId,
        orderNumber,
        customerId: customerId || session.customerId,
        checkoutSessionId,
        status: "CONFIRMED",
        paymentStatus: session.paymentMethod === "COD" ? "PENDING" : "AUTHORIZED",
        paymentMethod: session.paymentMethod || "COD",
        fulfillmentStatus: "UNFULFILLED",
        currency: session.currency || "INR",
        subtotalAmount: session.subtotalAmount,
        discountAmount: session.discountAmount,
        couponCode: session.couponCode,
        couponSnapshot: session.couponSnapshot,
        taxAmount: session.taxAmount,
        shippingAmount: session.shippingCost,
        totalAmount: session.totalAmount,
        shippingAddress: session.shippingAddress!,
        billingAddress: session.billingAddress!,
        customerSnapshot: {
          fullName: session.fullName!,
          email: session.email!,
          phone: session.phone!,
        },
        notes: null,
      })
      .returning();

    // A2. If coupon was applied, atomically redeem usage count
    if (session.couponCode && session.discountAmount > 0) {
      const { coupons } = await import("@/database/schema");
      const [appliedCoupon] = await tx
        .select({ id: coupons.id })
        .from(coupons)
        .where(and(eq(coupons.storeId, storeId), eq(coupons.code, session.couponCode)))
        .limit(1);

      if (appliedCoupon) {
        const { redeemCouponAtomic } = await import("@/modules/marketing/coupons/coupon-engine");
        await redeemCouponAtomic(
          tx,
          appliedCoupon.id,
          storeId,
          newOrder.id,
          session.discountAmount,
          customerId || session.customerId,
          session.email
        );
      }
    }

    // B. Snapshot line items into order_items
    for (const item of reservedItems) {
      await tx.insert(orderItems).values({
        orderId: newOrder.id,
        storeId,
        productId: item.productId,
        variantId: item.variantId,
        title: "Product Item",
        variantTitle: "Default Variant",
        sku: null,
        imageUrl: null,
        quantity: item.quantity,
        fulfilledQuantity: 0,
        returnedQuantity: 0,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        tax: 0,
        total: item.subtotal,
      });
    }

    // C. Consume the inventory reservation (decreases on_hand and reserved stock in inventory ledger)
    await consumeCheckoutReservation(tx, checkoutSessionId, storeId, newOrder.id);

    // D. Write initial immutable status history
    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      storeId,
      fromStatus: null,
      toStatus: "CONFIRMED",
      note: "Order placed and confirmed successfully.",
      actorType: customerId ? "CUSTOMER" : "CUSTOMER",
      metadata: { checkoutSessionId },
    });

    return newOrder;
  });

  // 5. Generate Initial GST Invoice
  try {
    await createOrderInvoice(storeId, createdOrder.id);
  } catch (invErr) {
    console.error("[INVOICE GENERATION WARNING]", invErr);
  }

  // 6. Dropshipping Supplier Routing (automatic order splitting by supplier)
  try {
    await routeOrderToSuppliers(createdOrder.id, storeId);
  } catch (dsErr) {
    console.error("[DROPSHIPPING ROUTING WARNING]", dsErr);
  }

  // 7. Marketplace Reselling Routing (Meesho & external connectors)
  try {
    await routeOrderToMarketplaces(createdOrder.id, storeId);
  } catch (mpErr) {
    console.error("[MARKETPLACE ROUTING WARNING]", mpErr);
  }

  return await getOrderById(storeId, createdOrder.id);
}

/**
 * 2. Retrieves comprehensive order details with strict authorization.
 */
export async function getOrderById(
  storeId: string,
  orderId: string,
  authOptions?: { customerId?: string | null; isStaff?: boolean }
): Promise<OrderDetailDTO> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found.");
  }

  // Customer authorization check: customers can only view their own orders
  if (authOptions?.customerId && !authOptions.isStaff) {
    if (order.customerId !== authOptions.customerId) {
      throw new ForbiddenError("You are not authorized to view this order.");
    }
  }

  // Load line items
  const rawItems = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // Load status history
  const rawHistory = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(desc(orderStatusHistory.createdAt));

  // Load fulfillments
  const rawFulfillments = await db
    .select()
    .from(fulfillments)
    .where(eq(fulfillments.orderId, order.id))
    .orderBy(desc(fulfillments.createdAt));

  // Load returns
  const rawReturns = await db
    .select()
    .from(returns)
    .where(eq(returns.orderId, order.id))
    .orderBy(desc(returns.createdAt));

  // Load refunds
  const rawRefunds = await db
    .select()
    .from(refunds)
    .where(eq(refunds.orderId, order.id))
    .orderBy(desc(refunds.createdAt));

  // Load invoice
  const [rawInvoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, order.id))
    .limit(1);

  return buildOrderDetailDTO(
    order,
    rawItems,
    rawHistory,
    rawFulfillments,
    rawReturns,
    rawRefunds,
    rawInvoice
  );
}

/**
 * 3. List orders for merchant dashboard with search, status, and date filters.
 */
export async function listStoreOrders(
  storeId: string,
  filters: OrderListQueryFilters = {}
): Promise<{ orders: OrderSummaryDTO[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 15));
  const offset = (page - 1) * limit;

  const conditions = [eq(orders.storeId, storeId)];

  if (filters.status) {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters.paymentStatus) {
    conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  }
  if (filters.fulfillmentStatus) {
    conditions.push(eq(orders.fulfillmentStatus, filters.fulfillmentStatus));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      sql`(${orders.orderNumber} ILIKE ${term} OR ${orders.customerSnapshot}->>'fullName' ILIKE ${term} OR ${orders.customerSnapshot}->>'email' ILIKE ${term})`
    );
  }
  if (filters.dateFrom) {
    conditions.push(sql`${orders.createdAt} >= ${new Date(filters.dateFrom)}`);
  }
  if (filters.dateTo) {
    conditions.push(sql`${orders.createdAt} <= ${new Date(filters.dateTo)}`);
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(...conditions));

  const total = countResult?.count || 0;

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const orderIds = orderRows.map((o) => o.id);
  const itemsCountMap = new Map<string, number>();

  if (orderIds.length > 0) {
    const itemCounts = await db
      .select({
        orderId: orderItems.orderId,
        totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .groupBy(orderItems.orderId);

    itemCounts.forEach((c) => itemsCountMap.set(c.orderId, c.totalQuantity));
  }

  const dtos: OrderSummaryDTO[] = orderRows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerSnapshot.fullName,
    customerEmail: o.customerSnapshot.email,
    status: o.status as OrderStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
    paymentMethod: o.paymentMethod,
    fulfillmentStatus: o.fulfillmentStatus as FulfillmentStatus,
    itemsCount: itemsCountMap.get(o.id) || 1,
    totalPaise: o.totalAmount,
    totalFormatted: formatPaiseToRupees(o.totalAmount),
    createdAt: o.createdAt,
  }));

  return {
    orders: dtos,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * 4. List orders for a specific customer in storefront account portal.
 */
export async function listCustomerOrders(
  storeId: string,
  customerId: string
): Promise<OrderSummaryDTO[]> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.customerId, customerId)))
    .orderBy(desc(orders.createdAt));

  return orderRows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerSnapshot.fullName,
    customerEmail: o.customerSnapshot.email,
    status: o.status as OrderStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
    paymentMethod: o.paymentMethod,
    fulfillmentStatus: o.fulfillmentStatus as FulfillmentStatus,
    itemsCount: 1,
    totalPaise: o.totalAmount,
    totalFormatted: formatPaiseToRupees(o.totalAmount),
    createdAt: o.createdAt,
  }));
}

/**
 * 5. Update Order Status with strict state machine enforcement and audit log.
 */
export async function updateOrderStatus(
  storeId: string,
  orderId: string,
  toStatus: OrderStatus,
  note?: string,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<OrderDetailDTO> {
  const [current] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!current) throw new NotFoundError("Order not found.");

  assertValidOrderTransition(current.status as OrderStatus, toStatus);

  if (current.status === toStatus) {
    return await getOrderById(storeId, orderId);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: toStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)));

    await tx.insert(orderStatusHistory).values({
      orderId,
      storeId,
      fromStatus: current.status,
      toStatus,
      note: note || `Order status updated to ${toStatus}.`,
      changedBy: actor?.userId || null,
      actorType: actor?.actorType || "MERCHANT",
    });
  });

  return await getOrderById(storeId, orderId);
}

/**
 * 6. Cancel Order with Restock of unfulfilled inventory.
 */
export async function cancelOrder(
  storeId: string,
  orderId: string,
  reason: string,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<OrderDetailDTO> {
  const [current] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!current) throw new NotFoundError("Order not found.");

  if (!isOrderCancellable(current.status as OrderStatus)) {
    throw new ConflictError(
      `Order in '${current.status}' status cannot be cancelled. Only unfulfilled orders can be cancelled.`
    );
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  await db.transaction(async (tx) => {
    // 1. Update order status to CANCELLED
    await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)));

    // 2. Restock unfulfilled quantities into inventory ledger
    for (const item of items) {
      const restockQty = item.quantity - item.fulfilledQuantity;
      if (restockQty > 0) {
        const [invRow] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.variantId, item.variantId),
              eq(inventory.storeId, storeId)
            )
          )
          .for("update");

        if (invRow) {
          const newOnHand = invRow.onHand + restockQty;
          const newAvailable = newOnHand - invRow.reserved;

          await tx
            .update(inventory)
            .set({
              onHand: newOnHand,
              available: newAvailable,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, invRow.id));

          await tx.insert(inventoryMovements).values({
            storeId,
            productId: item.productId,
            variantId: item.variantId,
            quantityDelta: restockQty,
            quantityBefore: invRow.onHand,
            quantityAfter: newOnHand,
            reason: "ADJUSTMENT",
            referenceId: orderId,
            referenceType: "ORDER_CANCELLATION_RESTOCK",
          });
        }
      }
    }

    // 3. Write status history entry
    await tx.insert(orderStatusHistory).values({
      orderId,
      storeId,
      fromStatus: current.status,
      toStatus: "CANCELLED",
      note: `Order cancelled: ${reason}`,
      changedBy: actor?.userId || null,
      actorType: actor?.actorType || "MERCHANT",
    });
  });

  return await getOrderById(storeId, orderId);
}

function buildOrderDetailDTO(
  order: Order,
  items: OrderItem[],
  history: Array<typeof orderStatusHistory.$inferSelect>,
  rawFulfillments: Array<typeof fulfillments.$inferSelect>,
  rawReturns: Array<typeof returns.$inferSelect>,
  rawRefunds: Array<typeof refunds.$inferSelect>,
  invoice: typeof invoices.$inferSelect | undefined
): OrderDetailDTO {
  const itemDTOs: OrderItemDTO[] = items.map((i) => {
    const eligible = Math.max(0, i.fulfilledQuantity - i.returnedQuantity);
    return {
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      variantId: i.variantId,
      title: i.title,
      variantTitle: i.variantTitle,
      sku: i.sku,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
      fulfilledQuantity: i.fulfilledQuantity,
      returnedQuantity: i.returnedQuantity,
      remainingEligibleReturnQuantity: eligible,
      unitPricePaise: i.unitPrice,
      unitPriceFormatted: formatPaiseToRupees(i.unitPrice),
      subtotalPaise: i.subtotal,
      subtotalFormatted: formatPaiseToRupees(i.subtotal),
      taxPaise: i.tax,
      taxFormatted: formatPaiseToRupees(i.tax),
      totalPaise: i.total,
      totalFormatted: formatPaiseToRupees(i.total),
    };
  });

  const historyDTOs: OrderStatusHistoryDTO[] = history.map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    note: h.note,
    actorType: h.actorType as "CUSTOMER" | "MERCHANT" | "SYSTEM",
    createdAt: h.createdAt,
  }));

  const fulfillmentDTOs: FulfillmentDTO[] = rawFulfillments.map((f) => ({
    id: f.id,
    orderId: f.orderId,
    carrier: f.carrier,
    trackingNumber: f.trackingNumber,
    trackingUrl: f.trackingUrl,
    status: f.status,
    shippedAt: f.shippedAt,
    deliveredAt: f.deliveredAt,
    rtoReason: f.rtoReason,
    notes: f.notes,
    items: [],
    createdAt: f.createdAt,
  }));

  const returnDTOs: ReturnDTO[] = rawReturns.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderNumber: order.orderNumber,
    returnNumber: r.returnNumber,
    customerId: r.customerId,
    status: r.status as ReturnStatus,
    reason: r.reason,
    notes: r.notes,
    merchantNotes: r.merchantNotes,
    restockAction: r.restockAction as "RESTOCK" | "NO_RESTOCK",
    items: [],
    createdAt: r.createdAt,
  }));

  const refundDTOs: RefundDTO[] = rawRefunds.map((rf) => ({
    id: rf.id,
    orderId: rf.orderId,
    returnId: rf.returnId,
    amountPaise: rf.amount,
    amountFormatted: formatPaiseToRupees(rf.amount),
    currency: rf.currency,
    reason: rf.reason,
    status: rf.status as RefundStatus,
    gateway: rf.gateway,
    gatewayRefundId: rf.gatewayRefundId,
    processedAt: rf.processedAt,
    createdAt: rf.createdAt,
  }));

  return {
    id: order.id,
    storeId: order.storeId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    checkoutSessionId: order.checkoutSessionId,
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus as PaymentStatus,
    paymentMethod: order.paymentMethod,
    fulfillmentStatus: order.fulfillmentStatus as FulfillmentStatus,
    currency: order.currency,
    subtotalPaise: order.subtotalAmount,
    subtotalFormatted: formatPaiseToRupees(order.subtotalAmount),
    discountPaise: order.discountAmount,
    discountFormatted: formatPaiseToRupees(order.discountAmount),
    couponCode: order.couponCode,
    couponSnapshot: order.couponSnapshot,
    taxPaise: order.taxAmount,
    taxFormatted: formatPaiseToRupees(order.taxAmount),
    shippingPaise: order.shippingAmount,
    shippingFormatted: formatPaiseToRupees(order.shippingAmount),
    totalPaise: order.totalAmount,
    totalFormatted: formatPaiseToRupees(order.totalAmount),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    customer: order.customerSnapshot,
    notes: order.notes,
    internalNotes: order.internalNotes,
    cancelledAt: order.cancelledAt,
    cancelledReason: order.cancelledReason,
    items: itemDTOs,
    history: historyDTOs,
    fulfillments: fulfillmentDTOs,
    returns: returnDTOs,
    refunds: refundDTOs,
    invoice: invoice ? buildInvoiceDTO(invoice) : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
