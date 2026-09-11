"use server";

import { getTenantContext } from "@/core/tenant/context";
import { getStoreEntitlements, hasFeatureEntitlement } from "./entitlement-service";

export async function getMyEntitlementsAction() {
  const ctx = await getTenantContext();
  return getStoreEntitlements(ctx.store.id);
}

export async function checkFeatureEntitlementAction(featureKey: string) {
  const ctx = await getTenantContext();
  return hasFeatureEntitlement(ctx.store.id, featureKey);
}
