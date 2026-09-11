import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders, fulfillments } from "./orders";

export interface CarrierOriginAddress {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Domain 6 & 7: Shipping Accounts / Carrier Configurations
 * Stores encrypted merchant API tokens for Shiprocket, Delhivery, etc. using AES-256-GCM.
 */
export const shippingAccounts = pgTable(
  "shipping_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 50 }).notNull(), // SHIPROCKET, DELHIVERY
    encryptedCredentials: text("encrypted_credentials").notNull(), // AES-256-GCM encrypted JSON
    isTestMode: boolean("is_test_mode").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    originAddress: jsonb("origin_address").$type<CarrierOriginAddress>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_shipping_accounts_store_carrier").on(table.storeId, table.carrier),
    index("idx_shipping_accounts_store_id").on(table.storeId),
  ]
);

/**
 * Domain 6: Shipments
 * Detailed carrier shipments linking Phase 9 fulfillments to external carrier parcels.
 */
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fulfillmentId: uuid("fulfillment_id").references(() => fulfillments.id, {
      onDelete: "set null",
    }),
    carrier: varchar("carrier", { length: 50 }).notNull(), // SHIPROCKET, DELHIVERY, MANUAL
    carrierShipmentId: varchar("carrier_shipment_id", { length: 255 }),
    carrierOrderId: varchar("carrier_order_id", { length: 255 }),
    awb: varchar("awb", { length: 255 }),
    carrierStatus: varchar("carrier_status", { length: 100 }).notNull().default("MANIFESTED"),
    shippingCostPaise: bigint("shipping_cost_paise", { mode: "number" }).notNull().default(0),
    labelUrl: text("label_url"),
    trackingUrl: text("tracking_url"),
    rtoState: varchar("rto_state", { length: 50 }).notNull().default("NONE"), // NONE, RTO_INITIATED, RTO_IN_TRANSIT, RTO_DELIVERED
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shipments_store_id").on(table.storeId),
    index("idx_shipments_order_id").on(table.orderId),
    index("idx_shipments_fulfillment_id").on(table.fulfillmentId),
    index("idx_shipments_awb").on(table.awb),
    index("idx_shipments_carrier_shipment_id").on(table.carrierShipmentId),
  ]
);

/**
 * Domain 6: Shipment Tracking Events
 * Granular timeline updates received via provider webhooks or tracking poll.
 */
export const shipmentTrackingEvents = pgTable(
  "shipment_tracking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    location: varchar("location", { length: 255 }),
    message: text("message").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("idx_tracking_events_shipment_id").on(table.shipmentId),
    index("idx_tracking_events_timestamp").on(table.shipmentId, table.timestamp),
  ]
);

export type ShippingAccount = typeof shippingAccounts.$inferSelect;
export type NewShippingAccount = typeof shippingAccounts.$inferInsert;
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
export type ShipmentTrackingEvent = typeof shipmentTrackingEvents.$inferSelect;
export type NewShipmentTrackingEvent = typeof shipmentTrackingEvents.$inferInsert;
