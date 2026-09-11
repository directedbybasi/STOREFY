import { db } from "@/database/client";
import { storeEntitlements, type PlanTier } from "@/database/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TIER_FEATURES: Record<PlanTier, Record<string, boolean>> = {
  STARTER: {
    "analytics:basic": true,
    "analytics:advanced": false,
    "automation:workflows": false,
    "loyalty:rewards": false,
    "gift_cards:issue": false,
    "inventory:multi_location": false,
    "pos:terminal": false,
    "b2b:wholesale": false,
    "markets:global": false,
    "content:cms": true,
    "developer:api": false,
    "developer:webhooks": false,
  },
  GROWTH: {
    "analytics:basic": true,
    "analytics:advanced": true,
    "automation:workflows": true,
    "loyalty:rewards": true,
    "gift_cards:issue": true,
    "inventory:multi_location": false,
    "pos:terminal": true,
    "b2b:wholesale": false,
    "markets:global": true,
    "content:cms": true,
    "developer:api": true,
    "developer:webhooks": true,
  },
  PRO: {
    "analytics:basic": true,
    "analytics:advanced": true,
    "automation:workflows": true,
    "loyalty:rewards": true,
    "gift_cards:issue": true,
    "inventory:multi_location": true,
    "pos:terminal": true,
    "b2b:wholesale": true,
    "markets:global": true,
    "content:cms": true,
    "developer:api": true,
    "developer:webhooks": true,
  },
  ENTERPRISE: {
    "analytics:basic": true,
    "analytics:advanced": true,
    "automation:workflows": true,
    "loyalty:rewards": true,
    "gift_cards:issue": true,
    "inventory:multi_location": true,
    "pos:terminal": true,
    "b2b:wholesale": true,
    "markets:global": true,
    "content:cms": true,
    "developer:api": true,
    "developer:webhooks": true,
  },
};

/**
 * Resolves current plan entitlements for a store.
 */
export async function getStoreEntitlements(storeId: string) {
  const [record] = await db
    .select()
    .from(storeEntitlements)
    .where(eq(storeEntitlements.storeId, storeId))
    .limit(1);

  if (record) return record;

  // Default to STARTER tier with standard features
  const defaultFeatures = DEFAULT_TIER_FEATURES.STARTER;
  const [created] = await db
    .insert(storeEntitlements)
    .values({
      storeId,
      planTier: "STARTER",
      features: defaultFeatures,
      quotas: {
        maxAutomations: 3,
        maxLocations: 1,
      },
      status: "ACTIVE",
    })
    .returning();

  return created;
}

/**
 * Checks whether a store is entitled to a specific capability.
 */
export async function hasFeatureEntitlement(storeId: string, featureKey: string): Promise<boolean> {
  const ent = await getStoreEntitlements(storeId);
  if (ent.status !== "ACTIVE" && ent.status !== "TRIAL") return false;

  // Enterprise has access to all features
  if (ent.planTier === "ENTERPRISE") return true;

  return Boolean(ent.features[featureKey]);
}
