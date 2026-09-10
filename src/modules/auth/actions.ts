"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { db } from "../../database/client";
import { users, organizations, stores, storeSettings, staff, roles } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  AccountSignUpSchema,
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
 * Signs up a new merchant, creating their user, organization, and OWNER staff membership.
 * In the multi-store model, stores are provisioned during subsequent onboarding or in the dashboard.
 */
export async function signUpAction(rawInput: unknown): Promise<AuthActionResult> {
  // Support both AccountSignUpSchema (new account-first flow) and legacy SignUpSchema
  const accountParse = AccountSignUpSchema.safeParse(rawInput);
  let fullName: string;
  let email: string;
  let password: string;
  let legacyStoreName: string | undefined;
  let legacySubdomain: string | undefined;

  if (accountParse.success) {
    fullName = accountParse.data.fullName;
    email = accountParse.data.email;
    password = accountParse.data.password;
  } else {
    const legacyParse = SignUpSchema.safeParse(rawInput);
    if (!legacyParse.success) {
      return {
        success: false,
        error:
          accountParse.error.errors[0]?.message ||
          legacyParse.error.errors[0]?.message ||
          "Invalid registration data",
      };
    }
    fullName = legacyParse.data.fullName;
    email = legacyParse.data.email;
    password = legacyParse.data.password;
    legacyStoreName = legacyParse.data.storeName;
    legacySubdomain = legacyParse.data.subdomain;
  }

  // If legacy signup specified a subdomain, check if it's already taken
  if (legacySubdomain) {
    const normalizedSub = legacySubdomain.toLowerCase().trim();
    const [existingStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.subdomain, normalizedSub))
      .limit(1);

    if (existingStore) {
      return {
        success: false,
        error: `Subdomain '${normalizedSub}' is already taken. Please choose another.`,
      };
    }
  }

  // 1. Register user with Supabase Auth
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

  // 2. Auto-confirm user via privileged admin client so they can access immediately
  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
  } catch (adminErr) {
    console.warn("[STOREFY ADMIN AUTO-CONFIRM WARNING]", adminErr);
  }

  // 3. Establish active session cookies immediately
  try {
    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  } catch (signInErr) {
    console.warn("[STOREFY AUTO SIGN-IN WARNING]", signInErr);
  }

  try {
    // 4. Ensure user record exists in public.users
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

    // 5. Create Organization
    const userSlug =
      fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30) || "merchant";
    const orgSlug = `${userSlug}-${Date.now().toString(36)}`;
    const [organization] = await db
      .insert(organizations)
      .values({
        name: `${fullName}'s Organization`,
        slug: orgSlug,
        billingEmail: email,
      })
      .returning();

    // 6. Resolve OWNER Role and create Staff record (storeId: null for org-wide owner)
    const [ownerRole] = await db.select().from(roles).where(eq(roles.name, "OWNER")).limit(1);

    if (ownerRole) {
      await db.insert(staff).values({
        organizationId: organization.id,
        storeId: null, // Org-wide OWNER
        userId: userId,
        roleId: ownerRole.id,
        isActive: true,
      });
    }

    // 7. If legacy signup included storeName & subdomain, provision initial store
    let createdStoreId: string | undefined;
    let createdSubdomain: string | undefined;
    if (legacyStoreName && legacySubdomain) {
      const normalizedSub = legacySubdomain.toLowerCase().trim();
      const [store] = await db
        .insert(stores)
        .values({
          organizationId: organization.id,
          name: legacyStoreName,
          slug: normalizedSub,
          subdomain: normalizedSub,
          currency: "INR",
          timezone: "Asia/Kolkata",
          isActive: true,
        })
        .returning();

      await db.insert(storeSettings).values({
        storeId: store.id,
        codEnabled: true,
        taxInclusive: true,
      });

      createdStoreId = store.id;
      createdSubdomain = store.subdomain;

      const cookieStore = await cookies();
      cookieStore.set("storefy_active_store_id", store.id, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return {
      success: true,
      data: {
        userId,
        organizationId: organization.id,
        storeId: createdStoreId,
        subdomain: createdSubdomain,
        redirectTo: createdStoreId ? "/dashboard" : "/onboarding",
      },
    };
  } catch (dbError) {
    console.error("[STOREFY SIGNUP DB ERROR]", dbError);
    return {
      success: false,
      error: "Account created but failed to provision organization. Please contact support.",
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
