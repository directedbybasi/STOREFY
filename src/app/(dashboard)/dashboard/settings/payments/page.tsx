import React from "react";
import { getPaymentAccountsAction } from "@/modules/payments/actions";
import { PaymentSettingsForm } from "@/components/dashboard/payment-settings-form";
import { CreditCard } from "lucide-react";

export const metadata = {
  title: "Payment Gateway Settings — STOREFY",
  description: "Configure Razorpay, Cashfree, and Cash on Delivery gateways with AES-256-GCM vault security.",
};

export default async function PaymentSettingsPage() {
  const res = await getPaymentAccountsAction();
  const accounts = res.success && res.data?.accounts ? res.data.accounts : [];
  const codSettings = res.success && res.data?.codSettings ? res.data.codSettings : {
    enabled: true,
    minAmount: 0,
    maxAmount: 5000000,
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Payment Providers</h1>
        </div>
        <p className="text-sm text-slate-400">
          Manage your online payment gateways, test sandbox modes, and Cash on Delivery eligibility.
        </p>
      </div>

      <PaymentSettingsForm
        initialAccounts={accounts}
        initialCod={codSettings}
      />
    </div>
  );
}
