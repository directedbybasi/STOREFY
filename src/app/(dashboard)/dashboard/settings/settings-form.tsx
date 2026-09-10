"use client";

import React, { useState, useTransition } from "react";
import { updateStoreSettingsAction } from "@/modules/stores/actions";
import type { StoreSettingsInput } from "@/modules/stores/validation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle, Save, Store, Phone, CreditCard, FileText } from "lucide-react";

interface SettingsFormProps {
  initialValues: StoreSettingsInput;
}

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const [formData, setFormData] = useState<StoreSettingsInput>(initialValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof StoreSettingsInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateStoreSettingsAction(formData);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to update settings");
        return;
      }
      setSuccessMessage("Store settings successfully updated and saved to hosted database.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive" className="border-rose-900/50 bg-rose-950/50 text-rose-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-emerald-800/50 bg-emerald-950/40 text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="general" className="gap-1.5 text-xs data-[state=active]:bg-slate-800">
            <Store className="h-3.5 w-3.5" /> General
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs data-[state=active]:bg-slate-800">
            <Phone className="h-3.5 w-3.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 text-xs data-[state=active]:bg-slate-800">
            <CreditCard className="h-3.5 w-3.5" /> Payments & COD
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="gap-1.5 text-xs data-[state=active]:bg-slate-800">
            <FileText className="h-3.5 w-3.5" /> Invoicing
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-4 pt-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Store Identity</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Configure your public brand name, currency, and operational timezone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-slate-300">
                    Store Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs text-slate-300">
                    Store Slug
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs text-slate-300">
                    Currency (ISO-4217)
                  </Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value.toUpperCase())}
                    maxLength={3}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 font-mono text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs text-slate-300">
                    Timezone
                  </Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="isActive" className="text-xs text-slate-300">
                    Storefront Status
                  </Label>
                  <select
                    id="isActive"
                    value={formData.isActive ? "true" : "false"}
                    onChange={(e) => handleChange("isActive", e.target.value === "true")}
                    disabled={isPending}
                    className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="true">Live (Online)</option>
                    <option value="false">Maintenance (Offline)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logoUrl" className="text-xs text-slate-300">
                  Logo Public URL (Optional)
                </Label>
                <Input
                  id="logoUrl"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl || ""}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  disabled={isPending}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: WhatsApp Settings */}
        <TabsContent value="whatsapp" className="space-y-4 pt-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">WhatsApp Integration</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Configure automated WhatsApp order routing and direct merchant support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whatsappOrderEnabled" className="font-semibold text-slate-200">
                      WhatsApp Order Routing
                    </Label>
                    <input
                      id="whatsappOrderEnabled"
                      type="checkbox"
                      checked={formData.whatsappOrderEnabled}
                      onChange={(e) => handleChange("whatsappOrderEnabled", e.target.checked)}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                    />
                  </div>
                  <Input
                    placeholder="+919876543210"
                    value={formData.whatsappOrderPhone || ""}
                    onChange={(e) => handleChange("whatsappOrderPhone", e.target.value)}
                    disabled={isPending || !formData.whatsappOrderEnabled}
                    className="border-slate-800 bg-slate-900 text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">
                    Customers can place orders and receive notifications via WhatsApp.
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whatsappSupportEnabled" className="font-semibold text-slate-200">
                      WhatsApp Support Chat
                    </Label>
                    <input
                      id="whatsappSupportEnabled"
                      type="checkbox"
                      checked={formData.whatsappSupportEnabled}
                      onChange={(e) => handleChange("whatsappSupportEnabled", e.target.checked)}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                    />
                  </div>
                  <Input
                    placeholder="+919876543210"
                    value={formData.whatsappSupportPhone || ""}
                    onChange={(e) => handleChange("whatsappSupportPhone", e.target.value)}
                    disabled={isPending || !formData.whatsappSupportEnabled}
                    className="border-slate-800 bg-slate-900 text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">
                    Floating WhatsApp chat button displayed on customer storefront.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Payments & COD */}
        <TabsContent value="payments" className="space-y-4 pt-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Cash on Delivery (COD) Rules</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Control order limits and tax rules for COD orders in India.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div>
                  <span className="font-semibold text-slate-200">Enable Cash on Delivery</span>
                  <p className="text-[11px] text-slate-500">Allow customers to pay upon package delivery.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.codEnabled}
                  onChange={(e) => handleChange("codEnabled", e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="codMinAmountRupees" className="text-xs text-slate-300">
                    Minimum COD Order Value (₹)
                  </Label>
                  <Input
                    id="codMinAmountRupees"
                    type="number"
                    min={0}
                    value={formData.codMinAmountRupees}
                    onChange={(e) => handleChange("codMinAmountRupees", parseFloat(e.target.value) || 0)}
                    disabled={isPending || !formData.codEnabled}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="codMaxAmountRupees" className="text-xs text-slate-300">
                    Maximum COD Order Value (₹)
                  </Label>
                  <Input
                    id="codMaxAmountRupees"
                    type="number"
                    min={0}
                    max={500000}
                    value={formData.codMaxAmountRupees}
                    onChange={(e) => handleChange("codMaxAmountRupees", parseFloat(e.target.value) || 0)}
                    disabled={isPending || !formData.codEnabled}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div>
                  <span className="font-semibold text-slate-200">Tax Inclusive Pricing</span>
                  <p className="text-[11px] text-slate-500">Product catalog prices already include GST.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.taxInclusive}
                  onChange={(e) => handleChange("taxInclusive", e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Invoicing */}
        <TabsContent value="invoicing" className="space-y-4 pt-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Order & Invoice Sequences</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Custom prefixes for merchant orders and GST tax invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="orderIdPrefix" className="text-xs text-slate-300">
                    Order ID Prefix
                  </Label>
                  <Input
                    id="orderIdPrefix"
                    value={formData.orderIdPrefix}
                    onChange={(e) => handleChange("orderIdPrefix", e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 font-mono text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">Example: ORD-1001</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoicePrefix" className="text-xs text-slate-300">
                    Invoice Prefix
                  </Label>
                  <Input
                    id="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => handleChange("invoicePrefix", e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 font-mono text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">Example: INV-2026-001</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 gap-1.5 text-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Store Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
