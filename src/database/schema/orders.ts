import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { checkoutSessions } from "./checkout";
import { products, productVariants } from "./products";
import { users } from "./users";

export interface OrderAddressSnapshot {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderCustomerSnapshot {
  fullName: string;
  email: string;
  phone: string;
}

export interface InvoiceTaxBreakdown {
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxableAmountPaise: number;
  ratePercent: number;
  isInterState: boolean;
}

/**
 * Domain 6: Orders
 * Central financial and transaction entity preserving immutable snapshots.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    checkoutSessionId: uuid("checkout_session_id").references(() => checkoutSessions.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 50 }).notNull().default("CONFIRMED"), // PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RTO
    paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("PENDING"), // PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED
    paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("COD"), // COD, ONLINE
    fulfillmentStatus: varchar("fulfillment_status", { length: 50 }).notNull().default("UNFULFILLED"), // UNFULFILLED, PARTIALLY_FULFILLED, FULFILLED, RETURNED
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull().default(0), // in Paise
    discountAmount: bigint("discount_amount", { mode: "number" }).notNull().default(0), // in Paise
    couponCode: varchar("coupon_code", { length: 100 }),
    couponSnapshot: jsonb("coupon_snapshot").$type<import("./marketing").CouponSnapshot | null>(),
    taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0), // in Paise
    shippingAmount: bigint("shipping_amount", { mode: "number" }).notNull().default(0), // in Paise
    totalAmount: bigint("total_amount", { mode: "number" }).notNull().default(0), // in Paise
    shippingAddress: jsonb("shipping_address").$type<OrderAddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<OrderAddressSnapshot>().notNull(),
    customerSnapshot: jsonb("customer_snapshot").$type<OrderCustomerSnapshot>().notNull(),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_orders_store_number").on(table.storeId, table.orderNumber),
    index("idx_orders_store_id").on(table.storeId),
    index("idx_orders_customer_id").on(table.customerId),
    index("idx_orders_status").on(table.storeId, table.status),
    index("idx_orders_created_at").on(table.storeId, table.createdAt),
    index("idx_orders_checkout_session").on(table.checkoutSessionId),
  ]
);

/**
 * Domain 6: Order Items
 * Immutable historical line-item snapshots preserving price, SKU, title, and tax at time of purchase.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    title: varchar("title", { length: 500 }).notNull(),
    variantTitle: varchar("variant_title", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    imageUrl: text("image_url"),
    quantity: integer("quantity").notNull(),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    returnedQuantity: integer("returned_quantity").notNull().default(0),
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(), // in Paise
    subtotal: bigint("subtotal", { mode: "number" }).notNull(), // in Paise
    tax: bigint("tax", { mode: "number" }).notNull().default(0), // in Paise
    total: bigint("total", { mode: "number" }).notNull(), // in Paise
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_store_id").on(table.storeId),
    index("idx_order_items_variant_id").on(table.variantId),
  ]
);

/**
 * Domain 6: Order Status History
 * Append-only immutable transition audit trail.
 */
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 50 }),
    toStatus: varchar("to_status", { length: 50 }).notNull(),
    note: text("note"),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    actorType: varchar("actor_type", { length: 50 }).notNull().default("MERCHANT"), // CUSTOMER, MERCHANT, SYSTEM
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_history_order_id").on(table.orderId),
    index("idx_order_history_created_at").on(table.orderId, table.createdAt),
  ]
);

/**
 * Domain 6: Fulfillments
 * Shipments with carrier and tracking metadata.
 */
export const fulfillments = pgTable(
  "fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 100 }).notNull().default("Manual"),
    trackingNumber: varchar("tracking_number", { length: 255 }),
    trackingUrl: text("tracking_url"),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, MANIFESTED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RTO_INITIATED, RTO_DELIVERED
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    rtoReason: text("rto_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_fulfillments_order_id").on(table.orderId),
    index("idx_fulfillments_store_id").on(table.storeId),
  ]
);

/**
 * Domain 6: Fulfillment Items
 * Tracks partial fulfillment quantities per order line item.
 */
export const fulfillmentItems = pgTable(
  "fulfillment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_fulfillment_items_fulfillment").on(table.fulfillmentId),
    index("idx_fulfillment_items_order_item").on(table.orderItemId),
  ]
);

/**
 * Domain 6: Returns
 * Customer-initiated return requests with merchant review and restock lifecycle.
 */
export const returns = pgTable(
  "returns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    returnNumber: varchar("return_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("REQUESTED"), // REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED, CANCELLED
    reason: text("reason").notNull(),
    notes: text("notes"),
    merchantNotes: text("merchant_notes"),
    restockAction: varchar("restock_action", { length: 30 }).notNull().default("NO_RESTOCK"), // RESTOCK, NO_RESTOCK
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_returns_store_number").on(table.storeId, table.returnNumber),
    index("idx_returns_order_id").on(table.orderId),
    index("idx_returns_store_status").on(table.storeId, table.status),
  ]
);

/**
 * Domain 6: Return Items
 * Line items and quantities requested for return.
 */
export const returnItems = pgTable(
  "return_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_return_items_return_id").on(table.returnId),
    index("idx_return_items_order_item_id").on(table.orderItemId),
  ]
);

/**
 * Domain 6: Refunds
 * Tracks refund records associated with cancellations or approved returns.
 */
export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    returnId: uuid("return_id").references(() => returns.id, { onDelete: "set null" }),
    amount: bigint("amount", { mode: "number" }).notNull(), // in Paise
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    gateway: varchar("gateway", { length: 50 }).notNull().default("COD"), // COD, MANUAL, RAZORPAY, CASHFREE
    gatewayRefundId: varchar("gateway_refund_id", { length: 255 }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_refunds_order_id").on(table.orderId),
    index("idx_refunds_store_id").on(table.storeId),
    index("idx_refunds_return_id").on(table.returnId),
  ]
);

/**
 * Domain 6: Invoices
 * Formal GST-ready merchant-to-customer tax invoices.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    sellerDetails: jsonb("seller_details").$type<{
      storeName: string;
      gstin?: string | null;
      address: string;
      email?: string | null;
      phone?: string | null;
      pan?: string | null;
    }>().notNull(),
    buyerDetails: jsonb("buyer_details").$type<{
      name: string;
      billingAddress: OrderAddressSnapshot;
      email?: string | null;
      phone?: string | null;
      gstin?: string | null;
    }>().notNull(),
    lineItems: jsonb("line_items").$type<Array<{
      title: string;
      variantTitle: string;
      sku: string | null;
      quantity: number;
      unitPricePaise: number;
      subtotalPaise: number;
      taxPaise: number;
      totalPaise: number;
    }>>().notNull(),
    taxBreakdown: jsonb("tax_breakdown").$type<InvoiceTaxBreakdown>().notNull(),
    subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull(),
    taxAmount: bigint("tax_amount", { mode: "number" }).notNull(),
    shippingAmount: bigint("shipping_amount", { mode: "number" }).notNull().default(0),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
    pdfUrl: text("pdf_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_invoices_number").on(table.storeId, table.invoiceNumber),
    uniqueIndex("idx_invoices_order_id").on(table.orderId),
    index("idx_invoices_store_id").on(table.storeId),
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
export type Fulfillment = typeof fulfillments.$inferSelect;
export type NewFulfillment = typeof fulfillments.$inferInsert;
export type FulfillmentItem = typeof fulfillmentItems.$inferSelect;
export type NewFulfillmentItem = typeof fulfillmentItems.$inferInsert;
export type Return = typeof returns.$inferSelect;
export type NewReturn = typeof returns.$inferInsert;
export type ReturnItem = typeof returnItems.$inferSelect;
export type NewReturnItem = typeof returnItems.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
