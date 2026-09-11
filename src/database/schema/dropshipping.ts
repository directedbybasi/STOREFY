import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { stores } from "./stores";
import { users } from "./users";
import { orders, orderItems, fulfillments } from "./orders";
import { products, productVariants } from "./products";
import { shipments } from "./shipping";

// ──────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────

export const supplierStatusEnum = pgEnum("supplier_status", [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const supplierVerificationActionEnum = pgEnum("supplier_verification_action", [
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "SUSPEND",
  "REACTIVATE",
]);

export const supplierOrderStatusEnum = pgEnum("supplier_order_status", [
  "PENDING",
  "ACCEPTED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
  "RTO",
]);

export const settlementEventTypeEnum = pgEnum("settlement_event_type", [
  "EARNING",
  "REFUND_ADJUSTMENT",
  "RETURN_ADJUSTMENT",
  "RTO_ADJUSTMENT",
  "PAYOUT",
  "REVERSAL",
  "MANUAL_ADJUSTMENT",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "PENDING",
  "ELIGIBLE",
  "ON_HOLD",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REVERSED",
]);

// ──────────────────────────────────────────────────────
// Address/Bank JSONB Interfaces
// ──────────────────────────────────────────────────────

export interface SupplierAddress {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SupplierBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string | null;
}

export interface MinimizedShippingAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ──────────────────────────────────────────────────────
// 1. Suppliers — Platform-level supplier entity
// ──────────────────────────────────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    businessAddress: jsonb("business_address").$type<SupplierAddress>().notNull(),
    pickupAddress: jsonb("pickup_address").$type<SupplierAddress>().notNull(),
    gstin: varchar("gstin", { length: 20 }),
    panNumber: varchar("pan_number", { length: 15 }),
    bankDetails: jsonb("bank_details").$type<SupplierBankDetails>(),
    status: supplierStatusEnum("status").notNull().default("PENDING"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
    suspensionReason: text("suspension_reason"),
    logoUrl: text("logo_url"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_suppliers_organization_id").on(table.organizationId),
    index("idx_suppliers_user_id").on(table.userId),
    index("idx_suppliers_status").on(table.status),
    index("idx_suppliers_email").on(table.email),
  ]
);

// ──────────────────────────────────────────────────────
// 2. Supplier Verification Audit — Immutable decision log
// ──────────────────────────────────────────────────────

export const supplierVerificationAudit = pgTable(
  "supplier_verification_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    action: supplierVerificationActionEnum("action").notNull(),
    fromStatus: supplierStatusEnum("from_status").notNull(),
    toStatus: supplierStatusEnum("to_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_supplier_audit_supplier_id").on(table.supplierId),
    index("idx_supplier_audit_created_at").on(table.supplierId, table.createdAt),
  ]
);

// ──────────────────────────────────────────────────────
// 3. Supplier Policies — Configurable per-supplier rules
// ──────────────────────────────────────────────────────

export const supplierPolicies = pgTable("supplier_policies", {
  supplierId: uuid("supplier_id")
    .primaryKey()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  processingTimeDays: integer("processing_time_days").notNull().default(3),
  returnWindowDays: integer("return_window_days").notNull().default(7),
  returnable: boolean("returnable").notNull().default(true),
  restockOnReturn: boolean("restock_on_return").notNull().default(true),
  cancellationAllowed: boolean("cancellation_allowed").notNull().default(true),
  serviceRegions: jsonb("service_regions").$type<string[]>().notNull().default([]),
  shippingPolicy: text("shipping_policy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────
// 4. Supplier Products — Supplier-owned catalog
// ──────────────────────────────────────────────────────

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    categoryName: varchar("category_name", { length: 255 }),
    supplierSku: varchar("supplier_sku", { length: 100 }),
    costPricePaise: bigint("cost_price_paise", { mode: "number" }).notNull(),
    suggestedRetailPaise: bigint("suggested_retail_paise", { mode: "number" }),
    processingTimeDays: integer("processing_time_days").notNull().default(3),
    returnable: boolean("returnable").notNull().default(true),
    returnWindowDays: integer("return_window_days").notNull().default(7),
    weight: varchar("weight", { length: 50 }),
    dimensions: jsonb("dimensions").$type<{
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    }>(),
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"), // DRAFT, ACTIVE, ARCHIVED, SUSPENDED
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_supplier_products_supplier_slug").on(table.supplierId, table.slug),
    index("idx_supplier_products_supplier_id").on(table.supplierId),
    index("idx_supplier_products_status").on(table.status),
    index("idx_supplier_products_category").on(table.categoryName),
  ]
);

// ──────────────────────────────────────────────────────
// 5. Supplier Product Variants
// ──────────────────────────────────────────────────────

export const supplierProductVariants = pgTable(
  "supplier_product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierProductId: uuid("supplier_product_id")
      .notNull()
      .references(() => supplierProducts.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    supplierSku: varchar("supplier_sku", { length: 100 }),
    costPricePaise: bigint("cost_price_paise", { mode: "number" }).notNull(),
    suggestedRetailPaise: bigint("suggested_retail_paise", { mode: "number" }),
    option1: varchar("option1", { length: 100 }),
    option2: varchar("option2", { length: 100 }),
    option3: varchar("option3", { length: 100 }),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_supplier_variants_product_id").on(table.supplierProductId),
    index("idx_supplier_variants_sku").on(table.supplierSku),
  ]
);

// ──────────────────────────────────────────────────────
// 6. Supplier Inventory — Supplier-owned stock
// ──────────────────────────────────────────────────────

export const supplierInventory = pgTable(
  "supplier_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    supplierProductId: uuid("supplier_product_id")
      .notNull()
      .references(() => supplierProducts.id, { onDelete: "cascade" }),
    supplierVariantId: uuid("supplier_variant_id")
      .notNull()
      .references(() => supplierProductVariants.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    available: integer("available").notNull().default(0), // invariant: available = onHand - reserved
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_supplier_inventory_variant").on(table.supplierId, table.supplierVariantId),
    index("idx_supplier_inventory_supplier_id").on(table.supplierId),
    index("idx_supplier_inventory_product_id").on(table.supplierProductId),
  ]
);

// ──────────────────────────────────────────────────────
// 7. Reseller Product Mappings — Merchant → Supplier linkage
// ──────────────────────────────────────────────────────

export const resellerProductMappings = pgTable(
  "reseller_product_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    supplierProductId: uuid("supplier_product_id")
      .notNull()
      .references(() => supplierProducts.id, { onDelete: "cascade" }),
    supplierVariantId: uuid("supplier_variant_id")
      .notNull()
      .references(() => supplierProductVariants.id, { onDelete: "cascade" }),
    supplierCostSnapshot: bigint("supplier_cost_snapshot", { mode: "number" }).notNull(), // Paise at import time
    autoSyncPrice: boolean("auto_sync_price").notNull().default(false),
    autoSyncStock: boolean("auto_sync_stock").notNull().default(true),
    autoSyncTitle: boolean("auto_sync_title").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Idempotency guard: one mapping per store + supplier variant
    uniqueIndex("idx_reseller_mappings_store_supplier_variant").on(
      table.storeId,
      table.supplierProductId,
      table.supplierVariantId
    ),
    index("idx_reseller_mappings_store_id").on(table.storeId),
    index("idx_reseller_mappings_product_id").on(table.productId),
    index("idx_reseller_mappings_supplier_id").on(table.supplierId),
    index("idx_reseller_mappings_supplier_product").on(table.supplierProductId),
  ]
);

// ──────────────────────────────────────────────────────
// 8. Supplier Orders — Fulfillment units per supplier per order
// ──────────────────────────────────────────────────────

export const supplierOrders = pgTable(
  "supplier_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    status: supplierOrderStatusEnum("status").notNull().default("PENDING"),
    rejectionReason: text("rejection_reason"),
    fulfillmentId: uuid("fulfillment_id").references(() => fulfillments.id, {
      onDelete: "set null",
    }),
    shipmentId: uuid("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    supplierCostTotalPaise: bigint("supplier_cost_total_paise", { mode: "number" })
      .notNull()
      .default(0),
    shippingAddress: jsonb("shipping_address").$type<MinimizedShippingAddress>().notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_supplier_orders_order_id").on(table.orderId),
    index("idx_supplier_orders_supplier_id").on(table.supplierId),
    index("idx_supplier_orders_store_id").on(table.storeId),
    index("idx_supplier_orders_status").on(table.supplierId, table.status),
    index("idx_supplier_orders_created_at").on(table.supplierId, table.createdAt),
  ]
);

// ──────────────────────────────────────────────────────
// 9. Supplier Order Items — Line items within supplier order
// ──────────────────────────────────────────────────────

export const supplierOrderItems = pgTable(
  "supplier_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierOrderId: uuid("supplier_order_id")
      .notNull()
      .references(() => supplierOrders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    supplierProductId: uuid("supplier_product_id")
      .notNull()
      .references(() => supplierProducts.id),
    supplierVariantId: uuid("supplier_variant_id")
      .notNull()
      .references(() => supplierProductVariants.id),
    quantity: integer("quantity").notNull(),
    supplierCostPaise: bigint("supplier_cost_paise", { mode: "number" }).notNull(), // Per-unit snapshot
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_supplier_order_items_order").on(table.supplierOrderId),
    index("idx_supplier_order_items_order_item").on(table.orderItemId),
  ]
);

// ──────────────────────────────────────────────────────
// 10. Supplier Settlement Ledger — Append-only financial records
// ──────────────────────────────────────────────────────

export const supplierSettlementLedger = pgTable(
  "supplier_settlement_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    supplierOrderId: uuid("supplier_order_id").references(() => supplierOrders.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    eventType: settlementEventTypeEnum("event_type").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(), // Positive for earnings, negative for deductions
    runningBalancePaise: bigint("running_balance_paise", { mode: "number" }).notNull().default(0),
    settlementStatus: settlementStatusEnum("settlement_status").notNull().default("PENDING"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    reference: varchar("reference", { length: 255 }),
    notes: text("notes"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_settlement_idempotency").on(table.idempotencyKey),
    index("idx_settlement_supplier_id").on(table.supplierId),
    index("idx_settlement_supplier_order").on(table.supplierOrderId),
    index("idx_settlement_status").on(table.supplierId, table.settlementStatus),
    index("idx_settlement_created_at").on(table.supplierId, table.createdAt),
  ]
);

// ──────────────────────────────────────────────────────
// 11. Supplier Performance — Aggregated metrics
// ──────────────────────────────────────────────────────

export const supplierPerformance = pgTable(
  "supplier_performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    totalOrders: integer("total_orders").notNull().default(0),
    fulfilledOrders: integer("fulfilled_orders").notNull().default(0),
    rejectedOrders: integer("rejected_orders").notNull().default(0),
    cancelledOrders: integer("cancelled_orders").notNull().default(0),
    avgProcessingHours: integer("avg_processing_hours").notNull().default(0),
    avgShipmentHours: integer("avg_shipment_hours").notNull().default(0),
    rtoCount: integer("rto_count").notNull().default(0),
    returnCount: integer("return_count").notNull().default(0),
    defectRate: integer("defect_rate").notNull().default(0), // basis points (100 = 1%)
    onTimeRate: integer("on_time_rate").notNull().default(10000), // basis points (10000 = 100%)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_supplier_performance_supplier").on(table.supplierId),
    index("idx_supplier_performance_period").on(table.supplierId, table.periodStart),
  ]
);

// ──────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type SupplierVerificationAuditRecord = typeof supplierVerificationAudit.$inferSelect;
export type SupplierPolicy = typeof supplierPolicies.$inferSelect;
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type NewSupplierProduct = typeof supplierProducts.$inferInsert;
export type SupplierProductVariant = typeof supplierProductVariants.$inferSelect;
export type NewSupplierProductVariant = typeof supplierProductVariants.$inferInsert;
export type SupplierInventoryItem = typeof supplierInventory.$inferSelect;
export type ResellerProductMapping = typeof resellerProductMappings.$inferSelect;
export type NewResellerProductMapping = typeof resellerProductMappings.$inferInsert;
export type SupplierOrder = typeof supplierOrders.$inferSelect;
export type NewSupplierOrder = typeof supplierOrders.$inferInsert;
export type SupplierOrderItem = typeof supplierOrderItems.$inferSelect;
export type SupplierSettlementEntry = typeof supplierSettlementLedger.$inferSelect;
export type SupplierPerformanceRecord = typeof supplierPerformance.$inferSelect;
