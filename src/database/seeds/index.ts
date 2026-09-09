import { db } from "../client";
import { systemHealth } from "../schema";

/**
 * System Database Seed Initializer (Phase 1 Baseline)
 */
export async function seedDatabase() {
  console.log("[STOREFY SEED] Initializing baseline system health records...");

  try {
    await db.insert(systemHealth).values({
      component: "INFRASTRUCTURE",
      status: "HEALTHY",
      environment: process.env.NEXT_PUBLIC_APP_ENV || "development",
      metadata: JSON.stringify({
        phase: "PHASE_1_INFRASTRUCTURE",
        initializedAt: new Date().toISOString(),
      }),
      isOperational: true,
    });
    console.log("[STOREFY SEED] Baseline system health seeded successfully.");
  } catch (error) {
    console.warn("[STOREFY SEED] Seed skipped or already applied:", error);
  }
}
