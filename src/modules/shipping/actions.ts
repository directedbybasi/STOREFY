"use server";

import { db } from "@/database/client";
import { shippingAccounts, shipments, shipmentTrackingEvents } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTenantContext } from "@/core/tenant/context";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { ValidationError } from "@/core/errors";
import {
  encryptCredentials,
  decryptCredentials,
  getMaskedCredentials,
  isMaskedPlaceholder,
} from "../payments/vault";
import {
  fetchLiveShippingRates,
  createOrderShipment,
} from "./shipping-service";
import {
  SaveShippingAccountSchema,
  GetShippingRatesSchema,
  CreateCarrierShipmentSchema,
  type SaveShippingAccountInput,
} from "./validation";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves configured carrier accounts with masked credentials.
 */
export async function getShippingAccountsAction(): Promise<ActionResult<{
  accounts: Array<{
    id: string;
    carrier: string;
    isTestMode: boolean;
    isActive: boolean;
    isDefault: boolean;
    originAddress: Record<string, unknown>;
    credentials: Record<string, string | undefined>;
    updatedAt: Date;
  }>;
}>> {
  try {
    const tenant = await getTenantContext();
    const rows = await db
      .select()
      .from(shippingAccounts)
      .where(eq(shippingAccounts.storeId, tenant.store.id));

    const accounts = rows.map((r) => {
      let masked: Record<string, string | undefined> = {};
      try {
        const decrypted = decryptCredentials(r.encryptedCredentials);
        masked = getMaskedCredentials(decrypted);
      } catch {
        masked = { apiToken: "••••••••" };
      }

      return {
        id: r.id,
        carrier: r.carrier,
        isTestMode: r.isTestMode,
        isActive: r.isActive,
        isDefault: r.isDefault,
        originAddress: r.originAddress as unknown as Record<string, unknown>,
        credentials: masked,
        updatedAt: r.updatedAt,
      };
    });

    return { success: true, data: { accounts } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load shipping accounts",
    };
  }
}

/**
 * Saves or updates merchant shipping carrier account credentials and origin address.
 */
export async function saveShippingAccountAction(
  rawInput: SaveShippingAccountInput
): Promise<ActionResult> {
  try {
    const tenant = await getTenantContext();
    const validated = SaveShippingAccountSchema.parse(rawInput);

    const [existing] = await db
      .select()
      .from(shippingAccounts)
      .where(
        and(
          eq(shippingAccounts.storeId, tenant.store.id),
          eq(shippingAccounts.carrier, validated.carrier)
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

    if (validated.credentials) {
      for (const [k, v] of Object.entries(validated.credentials)) {
        if (v && !isMaskedPlaceholder(v)) {
          finalCreds[k] = v;
        }
      }
    }

    const encrypted = encryptCredentials(finalCreds);

    if (validated.isDefault) {
      await db
        .update(shippingAccounts)
        .set({ isDefault: false })
        .where(eq(shippingAccounts.storeId, tenant.store.id));
    }

    if (existing) {
      await db
        .update(shippingAccounts)
        .set({
          encryptedCredentials: encrypted,
          isTestMode: validated.isTestMode,
          isActive: validated.isActive,
          isDefault: validated.isDefault,
          originAddress: validated.originAddress,
          updatedAt: new Date(),
        })
        .where(eq(shippingAccounts.id, existing.id));
    } else {
      await db.insert(shippingAccounts).values({
        storeId: tenant.store.id,
        carrier: validated.carrier,
        encryptedCredentials: encrypted,
        isTestMode: validated.isTestMode,
        isActive: validated.isActive,
        isDefault: validated.isDefault,
        originAddress: validated.originAddress,
      });
    }

    revalidatePath("/dashboard/settings/shipping");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save shipping account",
    };
  }
}

/**
 * Fetches live carrier rates for storefront checkout.
 */
export async function getLiveShippingRatesAction(
  domain: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Store not found or inactive.");
    }
    const validated = GetShippingRatesSchema.parse(rawInput);
    const rates = await fetchLiveShippingRates(
      resolution.store.id,
      validated.destinationPostalCode,
      validated.weightGrams,
      validated.cod,
      validated.declaredValuePaise
    );
    return { success: true, data: rates };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch shipping rates",
    };
  }
}

/**
 * Creates a carrier shipment from the merchant dashboard order detail view.
 */
export async function createOrderShipmentAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const tenant = await getTenantContext();
    const validated = CreateCarrierShipmentSchema.parse(rawInput);
    const shipment = await createOrderShipment(
      tenant.store.id,
      validated.orderId,
      validated.carrier as "SHIPROCKET" | "DELHIVERY" | "MANUAL",
      validated.fulfillmentId,
      validated.weightGrams
    );
    revalidatePath(`/dashboard/orders/${validated.orderId}`);
    return { success: true, data: shipment };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create shipment",
    };
  }
}

/**
 * Retrieves carrier tracking events for an order shipment.
 */
export async function trackOrderShipmentAction(
  shipmentId: string
): Promise<ActionResult> {
  try {
    const events = await db
      .select()
      .from(shipmentTrackingEvents)
      .where(eq(shipmentTrackingEvents.shipmentId, shipmentId))
      .orderBy(desc(shipmentTrackingEvents.timestamp));

    return { success: true, data: events };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load tracking events",
    };
  }
}
