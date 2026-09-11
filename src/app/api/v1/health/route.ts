import { apiSuccess, apiError } from "@/core/api/response";
import { APP_CONFIG } from "@/core/config/app";
import { getEnvDiagnostics } from "@/lib/env";
import { db } from "@/database/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Platform Health & Readiness Probe
 * GET /api/v1/health
 * Strictly distinguishes APPLICATION, DATABASE, and CRITICAL DEPENDENCIES
 * Exposes zero sensitive credentials, connection strings, or internal secrets.
 */
export async function GET() {
  try {
    const diagnostics = getEnvDiagnostics();
    let databaseStatus = diagnostics.databaseConfigured ? "UNKNOWN" : "PENDING_CREDENTIALS";
    let dbLatencyMs: number | null = null;

    if (diagnostics.databaseConfigured) {
      const start = Date.now();
      try {
        await db.execute(sql`SELECT 1;`);
        dbLatencyMs = Date.now() - start;
        databaseStatus = "UP";
      } catch {
        databaseStatus = "DOWN";
      }
    }

    const isHealthy = databaseStatus === "UP" || databaseStatus === "PENDING_CREDENTIALS";

    const healthStatus = {
      status: isHealthy ? "HEALTHY" : "DEGRADED",
      platform: APP_CONFIG.name,
      version: APP_CONFIG.version,
      apiVersion: APP_CONFIG.apiVersion,
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      tiers: {
        application: "UP",
        database: databaseStatus,
        criticalDependencies: {
          authProvider:
            diagnostics.supabaseUrlConfigured && diagnostics.supabaseAnonKeyConfigured
              ? "CONFIGURED"
              : "PENDING",
          encryptionVault: diagnostics.encryptionKeyConfigured ? "CONFIGURED" : "PENDING",
          serviceRole: diagnostics.serviceRoleConfigured ? "CONFIGURED" : "PENDING",
        },
      },
      metrics: {
        databaseLatencyMs: dbLatencyMs,
      },
    };

    return apiSuccess(healthStatus, undefined, isHealthy ? 200 : 503);
  } catch (error) {
    return apiError(error);
  }
}
