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

// Reuse connection pool across Next.js reloads to prevent connection establishment latency
const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
  drizzleDb?: ReturnType<typeof drizzle>;
};

const client =
  globalForDb.postgresClient ||
  postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? undefined : "require",
    max: 10,
    idle_timeout: 300,
    connect_timeout: 10,
  });

// Retain client across re-evaluations in both development and production runtimes
globalForDb.postgresClient = client;

export const db =
  globalForDb.drizzleDb ||
  drizzle(client, { schema });

globalForDb.drizzleDb = db;

// Pre-warm TCP connection and TLS handshake to Supabase pooler asynchronously at startup
// Eliminates the ~1.3s cold-start handshake latency for the first user query
if (process.env.NODE_ENV !== "test") {
  client`SELECT 1 as ping`.catch(() => {});
}
