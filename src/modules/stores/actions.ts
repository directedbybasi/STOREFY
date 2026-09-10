"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { db } from "../../database/client";
import { stores, storeSettings, staff, storeThemes } from "../../database/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError } from "../../core/errors";
import { requirePermission } from "../../core/tenant/rbac";
import { getTenantContext, getAccountContext } from "../../core/tenant/context";
import { CreateStoreSchema } from "../auth/validation";
import { StoreSettingsSchema } from "./validation";

/**
 * Safely switches the active store for the authenticated merchant.
 *
 * CRITICAL ZERO-TRUST INVARIANT:
 * Independently verifies in the database that the authenticated user possesses an
 * active staff membership for targetStoreId before updating the session cookie.
 */
export async function switchStoreAction(targetStoreId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError("Authentication required to switch store");
  }

  // 1. Fetch target store to resolve its organization
  const [targetStore] = await db
    .select({
      id: stores.id,
      organizationId: stores.organizationId,
      name: stores.name,
      isActive: stores.isActive,
    })
    .from(stores)
    .where(eq(stores.id, targetStoreId))
    .limit(1);

  if (!targetStore) {
    throw new ForbiddenError("Target store does not exist");
  }

  // 2. Query staff table to verify user belongs to this store or organization
  const [authorizedMembership] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(
      and(
        eq(staff.userId, user.id),
        eq(staff.organizationId, targetStore.organizationId),
        eq(staff.isActive, true),
        or(isNull(staff.storeId), eq(staff.storeId, targetStoreId))
      )
    )
    .limit(1);

  if (!authorizedMembership) {
    throw new ForbiddenError(
      `Cross-tenant violation: User '${user.id}' is not authorized to access Store '${targetStoreId}'`
    );
  }

  // 3. Persist active store cookie
  const cookieStore = await cookies();
  cookieStore.set("storefy_active_store_id", targetStore.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  revalidatePath("/dashboard");
  return { success: true, storeId: targetStore.id, name: targetStore.name };
}

/**
 * Updates store operational settings and parameters.
 * Requires `settings:manage` permission.
 */
export async function updateStoreSettingsAction(rawInput: unknown) {
  const parseResult = StoreSettingsSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid settings input",
    };
  }

  const data = parseResult.data;
  const ctx = await requirePermission("settings:manage");

  try {
    // 1. Update stores record
    await db
      .update(stores)
      .set({
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        timezone: data.timezone,
        isActive: data.isActive,
        logoUrl: data.logoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, ctx.store.id));

    // 2. Upsert store_settings record
    await db
      .insert(storeSettings)
      .values({
        storeId: ctx.store.id,
        whatsappOrderPhone: data.whatsappOrderPhone || null,
        whatsappOrderEnabled: data.whatsappOrderEnabled,
        whatsappSupportPhone: data.whatsappSupportPhone || null,
        whatsappSupportEnabled: data.whatsappSupportEnabled,
        codEnabled: data.codEnabled,
        codMinAmount: Math.round(data.codMinAmountRupees * 100), // stored in paise
        codMaxAmount: Math.round(data.codMaxAmountRupees * 100),
        taxInclusive: data.taxInclusive,
        orderIdPrefix: data.orderIdPrefix,
        invoicePrefix: data.invoicePrefix,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeSettings.storeId,
        set: {
          whatsappOrderPhone: data.whatsappOrderPhone || null,
          whatsappOrderEnabled: data.whatsappOrderEnabled,
          whatsappSupportPhone: data.whatsappSupportPhone || null,
          whatsappSupportEnabled: data.whatsappSupportEnabled,
          codEnabled: data.codEnabled,
          codMinAmount: Math.round(data.codMinAmountRupees * 100),
          codMaxAmount: Math.round(data.codMaxAmountRupees * 100),
          taxInclusive: data.taxInclusive,
          orderIdPrefix: data.orderIdPrefix,
          invoicePrefix: data.invoicePrefix,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error) {
    console.error("[STOREFY UPDATE SETTINGS ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update store settings",
    };
  }
}

/**
 * Creates a new store within the merchant's active organization.
 * Supports provisioning the first store (after signup/onboarding) as well as
 * provisioning additional stores (multi-store merchant model).
 */
export async function createStoreAction(input: { name: string; subdomain: string }) {
  const parseResult = CreateStoreSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid store data",
    };
  }

  const ctx = await getAccountContext();
  if (!ctx.isOwner && !ctx.permissions.has("settings:manage")) {
    throw new ForbiddenError("Only organization owners or administrators can provision new stores");
  }

  const normalizedSubdomain = input.subdomain.toLowerCase().trim();

  // Check unique subdomain
  const [existing] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.subdomain, normalizedSubdomain))
    .limit(1);

  if (existing) {
    return {
      success: false,
      error: `Subdomain '${normalizedSubdomain}' is already taken. Please choose another name.`,
    };
  }

  try {
    // 1. Insert store
    const [newStore] = await db
      .insert(stores)
      .values({
        organizationId: ctx.organization.id,
        name: input.name.trim(),
        slug: normalizedSubdomain,
        subdomain: normalizedSubdomain,
        currency: "INR",
        timezone: "Asia/Kolkata",
        isActive: true,
      })
      .returning();

    // 2. Create default store operational settings
    await db.insert(storeSettings).values({
      storeId: newStore.id,
      codEnabled: true,
      taxInclusive: true,
    });

    // 3. Create default active theme record
    await db.insert(storeThemes).values({
      storeId: newStore.id,
      name: "Modern Minimal",
      isActive: true,
      version: 1,
    });

    // 4. Set active store cookie
    const cookieStore = await cookies();
    cookieStore.set("storefy_active_store_id", newStore.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    revalidatePath("/dashboard");
    return { success: true, storeId: newStore.id, subdomain: newStore.subdomain };
  } catch (error) {
    console.error("[STOREFY CREATE STORE ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create store. Please try again.",
    };
  }
}
