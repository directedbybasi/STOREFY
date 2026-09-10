"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../database/client";
import { stores, storeDomains } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "../../core/tenant/rbac";
import { z } from "zod";

const DomainSchema = z
  .string()
  .min(3, "Domain name is too short")
  .max(255)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    "Please enter a valid hostname (e.g., brand.com or shop.brand.com)"
  );

/**
 * Registers a custom merchant domain for the active store.
 * Requires `domains:manage` permission.
 */
export async function addStoreDomainAction(rawDomain: string) {
  const ctx = await requirePermission("domains:manage");

  const normalizedDomain = rawDomain.trim().toLowerCase();
  const parseResult = DomainSchema.safeParse(normalizedDomain);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid domain format",
    };
  }

  // Check if domain is already claimed
  const [existing] = await db
    .select({ id: storeDomains.id, storeId: storeDomains.storeId })
    .from(storeDomains)
    .where(eq(storeDomains.domain, normalizedDomain))
    .limit(1);

  if (existing) {
    if (existing.storeId === ctx.store.id) {
      return { success: false, error: "This domain is already added to your store." };
    }
    return {
      success: false,
      error: "This domain is already mapped to another merchant store.",
    };
  }

  const verificationToken = `storefy-verify-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const [newDomain] = await db
      .insert(storeDomains)
      .values({
        storeId: ctx.store.id,
        domain: normalizedDomain,
        isPrimary: false,
        sslStatus: "PENDING",
        verificationToken,
      })
      .returning();

    revalidatePath("/dashboard/settings/domains");
    return { success: true, domain: newDomain };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register custom domain",
    };
  }
}

/**
 * Sets a verified domain as the primary storefront domain.
 */
export async function setPrimaryDomainAction(domainId: string) {
  const ctx = await requirePermission("domains:manage");

  // Verify domain belongs to active store
  const [targetDomain] = await db
    .select()
    .from(storeDomains)
    .where(and(eq(storeDomains.id, domainId), eq(storeDomains.storeId, ctx.store.id)))
    .limit(1);

  if (!targetDomain) {
    return { success: false, error: "Domain not found in this store" };
  }

  // Reset all other domains for this store to not primary
  await db
    .update(storeDomains)
    .set({ isPrimary: false })
    .where(eq(storeDomains.storeId, ctx.store.id));

  // Set target domain as primary
  await db
    .update(storeDomains)
    .set({ isPrimary: true })
    .where(eq(storeDomains.id, targetDomain.id));

  // Update stores.customDomain
  await db
    .update(stores)
    .set({ customDomain: targetDomain.domain })
    .where(eq(stores.id, ctx.store.id));

  revalidatePath("/dashboard/settings/domains");
  return { success: true };
}

/**
 * Removes a custom domain from the active store.
 */
export async function removeStoreDomainAction(domainId: string) {
  const ctx = await requirePermission("domains:manage");

  const [targetDomain] = await db
    .select()
    .from(storeDomains)
    .where(and(eq(storeDomains.id, domainId), eq(storeDomains.storeId, ctx.store.id)))
    .limit(1);

  if (!targetDomain) {
    return { success: false, error: "Domain not found in this store" };
  }

  await db.delete(storeDomains).where(eq(storeDomains.id, domainId));

  // If this was the store's active custom domain, clear it
  if (ctx.store.customDomain === targetDomain.domain) {
    await db
      .update(stores)
      .set({ customDomain: null })
      .where(eq(stores.id, ctx.store.id));
  }

  revalidatePath("/dashboard/settings/domains");
  return { success: true };
}
