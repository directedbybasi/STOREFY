"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { db } from "../../database/client";
import { users, organizations, stores, storeSettings, staff, roles } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  SignUpSchema,
  SignInSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "./validation";

export interface AuthActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Signs up a new merchant, creating their user, organization, initial store,
 * default store settings, and OWNER staff membership.
 */
export async function signUpAction(rawInput: unknown): Promise<AuthActionResult> {
  const parseResult = SignUpSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid registration data",
    };
  }

  const { fullName, email, password, storeName, subdomain } = parseResult.data;
  const normalizedSubdomain = subdomain.toLowerCase().trim();

  // 1. Check if subdomain is already taken
  const [existingStore] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.subdomain, normalizedSubdomain))
    .limit(1);

  if (existingStore) {
    return {
      success: false,
      error: `Subdomain '${normalizedSubdomain}' is already taken. Please choose another.`,
    };
  }

  // 2. Register user with Supabase Auth
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "Failed to create account. Please try again.",
    };
  }

  const userId = authData.user.id;

  try {
    // 3. Ensure user record exists in public.users
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        fullName,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email, fullName, updatedAt: new Date() },
      });

    // 4. Create Organization
    const orgSlug = `${normalizedSubdomain}-${Date.now().toString(36)}`;
    const [organization] = await db
      .insert(organizations)
      .values({
        name: `${storeName} Org`,
        slug: orgSlug,
        billingEmail: email,
      })
      .returning();

    // 5. Create Initial Store
    const [store] = await db
      .insert(stores)
      .values({
        organizationId: organization.id,
        name: storeName,
        slug: normalizedSubdomain,
        subdomain: normalizedSubdomain,
        currency: "INR",
        timezone: "Asia/Kolkata",
        isActive: true,
      })
      .returning();

    // 6. Create Default Store Settings
    await db.insert(storeSettings).values({
      storeId: store.id,
      codEnabled: true,
      taxInclusive: true,
    });

    // 7. Resolve OWNER Role and create Staff record
    const [ownerRole] = await db.select().from(roles).where(eq(roles.name, "OWNER")).limit(1);

    if (ownerRole) {
      await db.insert(staff).values({
        organizationId: organization.id,
        storeId: store.id,
        userId: userId,
        roleId: ownerRole.id,
        isActive: true,
      });
    }

    // 8. Set active store cookie
    const cookieStore = await cookies();
    cookieStore.set("storefy_active_store_id", store.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return {
      success: true,
      data: {
        storeId: store.id,
        subdomain: store.subdomain,
      },
    };
  } catch (dbError) {
    console.error("[STOREFY SIGNUP DB ERROR]", dbError);
    return {
      success: false,
      error: "Account created but failed to provision initial store. Please contact support.",
    };
  }
}

/**
 * Signs in an existing merchant with email and password.
 */
export async function signInAction(rawInput: unknown): Promise<AuthActionResult> {
  const parseResult = SignInSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid credentials",
    };
  }

  const { email, password } = parseResult.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: "Invalid email or password",
    };
  }

  // Resolve user's store and set active store cookie
  const [userStaff] = await db
    .select({
      storeId: staff.storeId,
      organizationId: staff.organizationId,
    })
    .from(staff)
    .where(eq(staff.userId, data.user.id))
    .limit(1);

  if (userStaff) {
    let targetStoreId = userStaff.storeId;
    if (!targetStoreId) {
      // Find any store in this org
      const [firstStore] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.organizationId, userStaff.organizationId))
        .limit(1);
      targetStoreId = firstStore?.id;
    }

    if (targetStoreId) {
      const cookieStore = await cookies();
      cookieStore.set("storefy_active_store_id", targetStoreId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return { success: true };
}

/**
 * Signs out the current merchant session and removes active store cookie.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("storefy_active_store_id");

  redirect("/login");
}

/**
 * Sends a password reset email.
 */
export async function requestPasswordResetAction(rawInput: unknown): Promise<AuthActionResult> {
  const parseResult = ForgotPasswordSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid email address",
    };
  }

  const { email } = parseResult.data;
  const supabase = await createServerSupabaseClient();

  const headerStore = await headers();
  const origin = headerStore.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to send reset email. Please try again.",
    };
  }

  return {
    success: true,
    data: { message: "Password reset instructions have been sent to your email." },
  };
}

/**
 * Updates the merchant's password during a recovery session.
 */
export async function updatePasswordAction(rawInput: unknown): Promise<AuthActionResult> {
  const parseResult = ResetPasswordSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid password data",
    };
  }

  const { password } = parseResult.data;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update password. Link may have expired.",
    };
  }

  return {
    success: true,
    data: { message: "Password updated successfully." },
  };
}
