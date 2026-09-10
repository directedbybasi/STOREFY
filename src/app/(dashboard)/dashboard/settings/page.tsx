import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { stores, storeSettings } from "@/database/schema";
import { eq } from "drizzle-orm";
import { SettingsForm } from "./settings-form";
import type { StoreSettingsInput } from "@/modules/stores/validation";

export const metadata = {
  title: "Store Settings — STOREFY",
};

export default async function SettingsPage() {
  const ctx = await requirePermission("settings:read");

  // Fetch current store row
  const [storeRow] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, ctx.store.id))
    .limit(1);

  // Fetch current store_settings row
  const [settingsRow] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, ctx.store.id))
    .limit(1);

  const initialValues: StoreSettingsInput = {
    name: storeRow?.name || ctx.store.name,
    slug: storeRow?.slug || ctx.store.slug,
    currency: storeRow?.currency || "INR",
    timezone: storeRow?.timezone || "Asia/Kolkata",
    isActive: storeRow?.isActive ?? true,
    logoUrl: storeRow?.logoUrl || null,
    whatsappOrderPhone: settingsRow?.whatsappOrderPhone || null,
    whatsappOrderEnabled: settingsRow?.whatsappOrderEnabled || false,
    whatsappSupportPhone: settingsRow?.whatsappSupportPhone || null,
    whatsappSupportEnabled: settingsRow?.whatsappSupportEnabled || false,
    codEnabled: settingsRow?.codEnabled ?? true,
    codMinAmountRupees: settingsRow?.codMinAmount ? Number(settingsRow.codMinAmount) / 100 : 0,
    codMaxAmountRupees: settingsRow?.codMaxAmount ? Number(settingsRow.codMaxAmount) / 100 : 50000,
    taxInclusive: settingsRow?.taxInclusive ?? true,
    orderIdPrefix: settingsRow?.orderIdPrefix || "ORD-",
    invoicePrefix: settingsRow?.invoicePrefix || "INV-",
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold text-white">Store Settings</h1>
        <p className="text-xs text-slate-400">
          Manage identity, currency, payments, and WhatsApp automation for{" "}
          <span className="font-semibold text-emerald-400">{ctx.store.name}</span>.
        </p>
      </div>

      <SettingsForm initialValues={initialValues} />
    </div>
  );
}
