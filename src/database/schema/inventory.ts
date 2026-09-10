import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products, productVariants } from "./products";
import { users } from "./users";

/**
 * Domain 4: Inventory State
 * Tracks physical, reserved, available, and incoming quantities per variant and store.
 * Standard invariant: available = on_hand - reserved.
 */
export const inventory = pgTable(
  "inventory",
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
    locationId: uuid("location_id")
      .notNull()
      .default("00000000-0000-0000-0000-000000000001"),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    available: integer("available").notNull().default(0),
    incoming: integer("incoming").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_inventory_store_variant_location").on(
      table.storeId,
      table.variantId,
      table.locationId
    ),
    index("idx_inventory_store_id").on(table.storeId),
    index("idx_inventory_variant_id").on(table.variantId),
    index("idx_inventory_product_id").on(table.productId),
    index("idx_inventory_available").on(table.storeId, table.available),
  ]
);

/**
 * Domain 4: Inventory Movements (Append-Only Ledger)
 * Every stock modification must write an immutable audit record here.
 * Overwriting history is architecturally forbidden.
 */
export const inventoryMovements = pgTable(
  "inventory_movements",
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
    quantityDelta: integer("quantity_delta").notNull(),
    quantityBefore: integer("quantity_before").notNull().default(0),
    quantityAfter: integer("quantity_after").notNull().default(0),
    reason: varchar("reason", { length: 50 }).notNull(),
    referenceId: varchar("reference_id", { length: 100 }),
    referenceType: varchar("reference_type", { length: 50 }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_inventory_movements_store_variant").on(table.storeId, table.variantId),
    index("idx_inventory_movements_created_at").on(table.storeId, table.createdAt),
  ]
);

export type InventoryItem = typeof inventory.$inferSelect;
export type NewInventoryItem = typeof inventory.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
