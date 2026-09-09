import { apiSuccess, apiError } from "@/core/api/response";
import { APP_CONFIG } from "@/core/config/app";

export const dynamic = "force-dynamic";

/**
 * Platform Health & Readiness Probe
 * GET /api/v1/health
 */
export async function GET() {
  try {
    const healthStatus = {
      status: "HEALTHY",
      platform: APP_CONFIG.name,
      version: APP_CONFIG.version,
      apiVersion: APP_CONFIG.apiVersion,
      environment: process.env.NEXT_PUBLIC_APP_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        api: "UP",
        routing: "ACTIVE",
        database: process.env.DATABASE_URL ? "CONFIGURED" : "PENDING_CREDENTIALS",
        supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "CONFIGURED" : "PENDING_CREDENTIALS",
      },
    };

    return apiSuccess(healthStatus);
  } catch (error) {
    return apiError(error);
  }
}
