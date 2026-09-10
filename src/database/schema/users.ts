import { pgTable, uuid, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

/**
 * Domain 1: Users table synced with Supabase auth.users
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Matches Supabase auth.users.id
    email: varchar("email", { length: 255 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 32 }),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
