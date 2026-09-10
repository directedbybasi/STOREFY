import { apiSuccess, apiError } from "@/core/api/response";
import { APP_CONFIG } from "@/core/config/app";
import { getEnvDiagnostics } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Platform Health & Readiness Probe
 * GET /api/v1/health
 */
export async function GET() {
  try {
    const diagnostics = getEnvDiagnostics();

    const healthStatus = {
      status: "HEALTHY",
      platform: APP_CONFIG.name,
      version: APP_CONFIG.version,
      apiVersion: APP_CONFIG.apiVersion,
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        api: "UP",
        routing: "ACTIVE",
        database: diagnostics.databaseConfigured ? "CONFIGURED" : "PENDING_CREDENTIALS",
        supabase:
          diagnostics.supabaseUrlConfigured && diagnostics.supabaseAnonKeyConfigured
            ? "CONFIGURED"
            : "PENDING_CREDENTIALS",
      },
      diagnostics: {
        supabaseUrlConfigured: diagnostics.supabaseUrlConfigured,
        supabaseAnonKeyConfigured: diagnostics.supabaseAnonKeyConfigured,
        serviceRoleConfigured: diagnostics.serviceRoleConfigured,
        databaseConfigured: diagnostics.databaseConfigured,
        directUrlConfigured: diagnostics.directUrlConfigured,
        encryptionKeyConfigured: diagnostics.encryptionKeyConfigured,
      },
    };

    return apiSuccess(healthStatus);
  } catch (error) {
    return apiError(error);
  }
}
