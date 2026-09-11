"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { productBundles } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import {
  createProductBundle,
  calculateBundleAvailability,
  calculateBundlePrice,
} from "./bundle-service";
import type { CreateBundleInput } from "./bundle-service";

export async function createBundleAction(input: Omit<CreateBundleInput, "storeId">) {
  const ctx = await requirePermission("catalog:manage");
  return createProductBundle({ ...input, storeId: ctx.store.id });
}

export async function listBundlesAction() {
  const ctx = await requirePermission("catalog:view");
  return db
    .select()
    .from(productBundles)
    .where(eq(productBundles.storeId, ctx.store.id))
    .orderBy(desc(productBundles.createdAt));
}

export async function getBundleAvailabilityAction(bundleId: string) {
  const { getTenantContext } = await import("@/core/tenant/context");
  const ctx = await getTenantContext();
  const [available, pricePaise] = await Promise.all([
    calculateBundleAvailability(ctx.store.id, bundleId),
    calculateBundlePrice(ctx.store.id, bundleId),
  ]);
  return { available, pricePaise };
}
