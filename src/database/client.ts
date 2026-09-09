import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

/**
 * Global pooled database client for runtime queries.
 * Connects to hosted Supabase PostgreSQL via DATABASE_URL (PgBouncer / Supavisor pooler).
 */

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Disable prefetch as it is not supported for transaction pooler (port 6543)
const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? undefined : "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
