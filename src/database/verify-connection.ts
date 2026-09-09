import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

/**
 * Diagnostic utility to verify live connectivity to the hosted Supabase PostgreSQL instance.
 */
export async function verifyDatabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  const url = process.env.DATABASE_URL;

  if (!url || url.includes("placeholder-password") || url.includes("storefy-dev:placeholder")) {
    return {
      connected: false,
      message: "Pending live credentials in .env.development or Vercel Environment Variables. Placeholder configuration detected.",
    };
  }

  const start = Date.now();
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 5,
    ssl: "require",
  });

  try {
    const result = await sql`SELECT 1 as connected;`;
    const latencyMs = Date.now() - start;
    await sql.end();
    if (result && result.length > 0) {
      return {
        connected: true,
        message: `Successfully connected to hosted PostgreSQL database in ${latencyMs}ms.`,
        latencyMs,
      };
    }
    return { connected: false, message: "Unexpected empty query response from database." };
  } catch (error) {
    await sql.end();
    return {
      connected: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// If executed directly from CLI
if (process.argv[1]?.includes("verify-connection")) {
  verifyDatabaseConnection().then((res) => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.connected ? 0 : 0); // Non-fatal diagnostic exit
  });
}
