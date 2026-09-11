import React from "react";
import { getShippingAccountsAction } from "@/modules/shipping/actions";
import { ShippingSettingsForm } from "@/components/dashboard/shipping-settings-form";
import { Truck } from "lucide-react";

export const metadata = {
  title: "Shipping & Delivery Carriers — STOREFY",
  description: "Configure Shiprocket and Delhivery courier integrations with origin dispatch address.",
};

export default async function ShippingSettingsPage() {
  const res = await getShippingAccountsAction();
  const accounts = res.success && res.data?.accounts ? res.data.accounts : [];

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Truck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Shipping & Carrier Integration</h1>
        </div>
        <p className="text-sm text-slate-400">
          Connect your Shiprocket and Delhivery accounts for automated live checkout rates, AWB generation, and tracking.
        </p>
      </div>

      <ShippingSettingsForm initialAccounts={accounts} />
    </div>
  );
}
