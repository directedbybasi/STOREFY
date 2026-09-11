"use server";

import { db } from "@/database/client";
import { paymentAccounts, storeSettings } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { getTenantContext } from "@/core/tenant/context";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { ValidationError } from "@/core/errors";
import {
  encryptCredentials,
  decryptCredentials,
  getMaskedCredentials,
  isMaskedPlaceholder,
} from "./vault";
import {
  initiateOrderPayment,
  verifyOrderPayment,
  refundOrderPayment,
} from "./payment-service";
import {
  SavePaymentAccountSchema,
  VerifyPaymentSchema,
  InitiatePaymentSchema,
  ProcessPaymentRefundSchema,
  type SavePaymentAccountInput,
} from "./validation";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves all configured payment accounts for the active store with masked credentials.
 */
export async function getPaymentAccountsAction(): Promise<ActionResult<{
  accounts: Array<{
    id: string;
    provider: string;
    isTestMode: boolean;
    isActive: boolean;
    isDefault: boolean;
    credentials: Record<string, string | undefined>;
    updatedAt: Date;
  }>;
  codSettings: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
  };
}>> {
  try {
    const tenant = await getTenantContext();
    const rows = await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.storeId, tenant.store.id));

    const [storeSet] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, tenant.store.id))
      .limit(1);

    const accounts = rows.map((r) => {
      let masked: Record<string, string | undefined> = {};
      try {
        const decrypted = decryptCredentials(r.encryptedCredentials);
        masked = getMaskedCredentials(decrypted);
      } catch {
        masked = { keyId: "••••••••", keySecret: "••••••••" };
      }

      return {
        id: r.id,
        provider: r.provider,
        isTestMode: r.isTestMode,
        isActive: r.isActive,
        isDefault: r.isDefault,
        credentials: masked,
        updatedAt: r.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        accounts,
        codSettings: {
          enabled: storeSet?.codEnabled ?? true,
          minAmount: storeSet?.codMinAmount ?? 0,
          maxAmount: storeSet?.codMaxAmount ?? 5000000,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load payment settings",
    };
  }
}

/**
 * Saves or updates merchant payment gateway credentials into the AES-256-GCM vault.
 */
export async function savePaymentAccountAction(
  rawInput: SavePaymentAccountInput
): Promise<ActionResult> {
  try {
    const tenant = await getTenantContext();
    const validated = SavePaymentAccountSchema.parse(rawInput);

    if (validated.provider === "COD") {
      // Update store settings COD status
      await db
        .update(storeSettings)
        .set({
          codEnabled: validated.isActive,
          updatedAt: new Date(),
        })
        .where(eq(storeSettings.storeId, tenant.store.id));

      revalidatePath("/dashboard/settings/payments");
      return { success: true };
    }

    // Retrieve existing credentials to preserve unedited masked values
    const [existing] = await db
      .select()
      .from(paymentAccounts)
      .where(
        and(
          eq(paymentAccounts.storeId, tenant.store.id),
          eq(paymentAccounts.provider, validated.provider)
        )
      )
      .limit(1);

    let finalCreds: Record<string, string | undefined> = {};
    if (existing) {
      try {
        finalCreds = decryptCredentials(existing.encryptedCredentials);
      } catch {
        finalCreds = {};
      }
    }

    // Merge incoming credentials (ignore masked placeholders)
    if (validated.credentials) {
      for (const [key, val] of Object.entries(validated.credentials)) {
        if (val && !isMaskedPlaceholder(val)) {
          finalCreds[key] = val;
        }
      }
    }

    const encrypted = encryptCredentials(finalCreds);

    if (validated.isDefault) {
      // Unset other default accounts
      await db
        .update(paymentAccounts)
        .set({ isDefault: false })
        .where(eq(paymentAccounts.storeId, tenant.store.id));
    }

    if (existing) {
      await db
        .update(paymentAccounts)
        .set({
          encryptedCredentials: encrypted,
          isTestMode: validated.isTestMode,
          isActive: validated.isActive,
          isDefault: validated.isDefault,
          updatedAt: new Date(),
        })
        .where(eq(paymentAccounts.id, existing.id));
    } else {
      await db.insert(paymentAccounts).values({
        storeId: tenant.store.id,
        provider: validated.provider,
        encryptedCredentials: encrypted,
        isTestMode: validated.isTestMode,
        isActive: validated.isActive,
        isDefault: validated.isDefault,
      });
    }

    revalidatePath("/dashboard/settings/payments");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save payment account",
    };
  }
}

/**
 * Initiates payment from storefront checkout.
 */
export async function initiateStorefrontPaymentAction(
  orderId: string,
  provider: "RAZORPAY" | "CASHFREE" | "COD",
  domain: string,
  idempotencyKey?: string
): Promise<ActionResult> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Store not found or inactive.");
    }
    const result = await initiateOrderPayment(resolution.store.id, orderId, provider, idempotencyKey);
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate payment",
    };
  }
}

/**
 * Cryptographically verifies payment returned to storefront.
 */
export async function verifyStorefrontPaymentAction(
  input: {
    orderId: string;
    provider: "RAZORPAY" | "CASHFREE" | "COD";
    gatewayOrderId: string;
    gatewayPaymentId: string;
    signature?: string;
    rawPayload?: Record<string, unknown>;
  },
  domain: string
): Promise<ActionResult> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Store not found or inactive.");
    }
    const validated = VerifyPaymentSchema.parse(input);
    const result = await verifyOrderPayment(resolution.store.id, validated);
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Payment verification failed",
    };
  }
}

/**
 * Merchant refund execution Server Action.
 */
export async function processPaymentRefundAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const tenant = await getTenantContext();
    const validated = ProcessPaymentRefundSchema.parse(rawInput);
    const result = await refundOrderPayment(
      tenant.store.id,
      validated.paymentId,
      validated.amountPaise,
      validated.reason
    );
    revalidatePath(`/dashboard/orders`);
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process refund",
    };
  }
}
