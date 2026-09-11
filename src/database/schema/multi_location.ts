import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products, productVariants } from "./products";
import { users } from "./users";

export type LocationType = "WAREHOUSE" | "RETAIL_STORE" | "FULFILLMENT_CENTER";
export type StockTransferStatus = "DRAFT" | "REQUESTED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
export type PurchaseOrderStatus = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

/**
 * Domain 15: Inventory Locations / Warehouses
 */
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    type: varchar("type", { length: 50 }).$type<LocationType>().notNull().default("WAREHOUSE"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("India"),
    fulfillmentEnabled: boolean("fulfillment_enabled").notNull().default(true),
    pickupEnabled: boolean("pickup_enabled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_locations_store_code").on(table.storeId, table.code),
    index("idx_locations_store").on(table.storeId, table.isActive),
  ]
);

/**
 * Domain 15: Stock Transfers
 */
export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    transferNumber: varchar("transfer_number", { length: 50 }).notNull(),
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id),
    destinationLocationId: uuid("destination_location_id")
      .notNull()
      .references(() => locations.id),
    status: varchar("status", { length: 50 })
      .$type<StockTransferStatus>()
      .notNull()
      .default("DRAFT"),
    notes: text("notes"),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    receivedBy: uuid("received_by").references(() => users.id, { onDelete: "set null" }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stock_transfers_number").on(table.storeId, table.transferNumber),
    index("idx_stock_transfers_store_status").on(table.storeId, table.status),
    index("idx_stock_transfers_source").on(table.sourceLocationId),
    index("idx_stock_transfers_dest").on(table.destinationLocationId),
  ]
);

export const stockTransferLines = pgTable(
  "stock_transfer_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantityRequested: integer("quantity_requested").notNull(),
    quantityShipped: integer("quantity_shipped").notNull().default(0),
    quantityReceived: integer("quantity_received").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_transfer_lines_transfer").on(table.transferId),
    index("idx_transfer_lines_variant").on(table.variantId),
  ]
);

/**
 * Domain 15: Purchase Orders (Merchant Purchasing)
 */
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    poNumber: varchar("po_number", { length: 50 }).notNull(),
    supplierId: uuid("supplier_id"), // Optional link to platform supplier or external
    supplierName: varchar("supplier_name", { length: 255 }).notNull(),
    destinationLocationId: uuid("destination_location_id")
      .notNull()
      .references(() => locations.id),
    status: varchar("status", { length: 50 })
      .$type<PurchaseOrderStatus>()
      .notNull()
      .default("DRAFT"),
    expectedDate: timestamp("expected_date", { withTimezone: true }),
    totalCostPaise: bigint("total_cost_paise", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_purchase_orders_number").on(table.storeId, table.poNumber),
    index("idx_purchase_orders_store_status").on(table.storeId, table.status),
    index("idx_purchase_orders_dest").on(table.destinationLocationId),
  ]
);

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }),
    quantityOrdered: integer("quantity_ordered").notNull(),
    quantityReceived: integer("quantity_received").notNull().default(0),
    unitCostPaise: bigint("unit_cost_paise", { mode: "number" }).notNull(),
    totalCostPaise: bigint("total_cost_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_po_lines_po").on(table.purchaseOrderId),
    index("idx_po_lines_variant").on(table.variantId),
  ]
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type StockTransfer = typeof stockTransfers.$inferSelect;
export type NewStockTransfer = typeof stockTransfers.$inferInsert;
export type StockTransferLine = typeof stockTransferLines.$inferSelect;
export type NewStockTransferLine = typeof stockTransferLines.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;
export type NewPurchaseOrderLine = typeof purchaseOrderLines.$inferInsert;
