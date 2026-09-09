import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.development" });

/**
 * Executes pending database migrations against the direct PostgreSQL connection.
 * Used for hosted Supabase migrations via DIRECT_URL.
 */
async function runMigrations() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!directUrl) {
    console.error("[STOREFY MIGRATION ERROR] Neither DIRECT_URL nor DATABASE_URL is defined.");
    process.exit(1);
  }

  console.log("[STOREFY MIGRATION] Connecting to hosted database for migration execution...");

  const migrationClient = postgres(directUrl, {
    max: 1,
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });

  const db = drizzle(migrationClient);

  try {
    const migrationsFolder = path.resolve(process.cwd(), "src/database/migrations");
    console.log(`[STOREFY MIGRATION] Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("[STOREFY MIGRATION] Migrations completed successfully.");
  } catch (error) {
    console.error("[STOREFY MIGRATION ERROR] Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
