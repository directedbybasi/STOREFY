"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Key,
  HelpCircle,
  IndianRupee,
} from "lucide-react";
import { savePaymentAccountAction } from "@/modules/payments/actions";

interface PaymentAccountData {
  id?: string;
  provider: string;
  isTestMode: boolean;
  isActive: boolean;
  isDefault: boolean;
  credentials: Record<string, string | undefined>;
  updatedAt?: Date;
}

interface PaymentSettingsFormProps {
  initialAccounts: PaymentAccountData[];
  initialCod: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
  };
}

export function PaymentSettingsForm({
  initialAccounts,
  initialCod,
}: PaymentSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Razorpay state
  const rzpAccount = initialAccounts.find((a) => a.provider === "RAZORPAY");
  const [rzpActive, setRzpActive] = useState(rzpAccount?.isActive ?? false);
  const [rzpTestMode, setRzpTestMode] = useState(rzpAccount?.isTestMode ?? true);
  const [rzpKeyId, setRzpKeyId] = useState(rzpAccount?.credentials?.keyId || "");
  const [rzpKeySecret, setRzpKeySecret] = useState(rzpAccount?.credentials?.keySecret || "");
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState(rzpAccount?.credentials?.webhookSecret || "");

  // Cashfree state
  const cfAccount = initialAccounts.find((a) => a.provider === "CASHFREE");
  const [cfActive, setCfActive] = useState(cfAccount?.isActive ?? false);
  const [cfTestMode, setCfTestMode] = useState(cfAccount?.isTestMode ?? true);
  const [cfAppId, setCfAppId] = useState(cfAccount?.credentials?.appId || "");
  const [cfSecretKey, setCfSecretKey] = useState(cfAccount?.credentials?.secretKey || "");
  const [cfWebhookSecret, setCfWebhookSecret] = useState(cfAccount?.credentials?.webhookSecret || "");

  // COD state
  const [codEnabled, setCodEnabled] = useState(initialCod.enabled);

  const handleSaveRazorpay = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await savePaymentAccountAction({
        provider: "RAZORPAY",
        isActive: rzpActive,
        isTestMode: rzpTestMode,
        isDefault: rzpActive,
        credentials: {
          keyId: rzpKeyId,
          keySecret: rzpKeySecret,
          webhookSecret: rzpWebhookSecret,
        },
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Razorpay credentials securely encrypted and saved." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save Razorpay settings." });
      }
    });
  };

  const handleSaveCashfree = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await savePaymentAccountAction({
        provider: "CASHFREE",
        isActive: cfActive,
        isTestMode: cfTestMode,
        isDefault: false,
        credentials: {
          appId: cfAppId,
          secretKey: cfSecretKey,
          webhookSecret: cfWebhookSecret,
        },
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Cashfree credentials securely encrypted and saved." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save Cashfree settings." });
      }
    });
  };

  const handleSaveCod = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await savePaymentAccountAction({
        provider: "COD",
        isActive: codEnabled,
        isTestMode: false,
        isDefault: false,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Cash on Delivery preferences updated." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update COD settings." });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Security Vault Banner */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-emerald-950/30 border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            Zero-Trust Credential Vault
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-mono">
              AES-256-GCM
            </Badge>
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            All gateway keys, App IDs, and webhook secrets are encrypted with AES-256-GCM before writing to the database. Plaintext secrets are never returned to the browser or stored in client state.
          </p>
        </div>
      </div>

      {/* Gateway Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Razorpay Gateway Card */}
        <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      Razorpay
                      {rzpActive && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Accept UPI, Cards, Netbanking & Wallets across India
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="rzp-active-toggle"
                    checked={rzpActive}
                    onCheckedChange={setRzpActive}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor="rzp-active-toggle" className="text-xs font-medium text-slate-300 cursor-pointer">
                    {rzpActive ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200">Test / Sandbox Mode</span>
                  <p className="text-[11px] text-slate-400">Test payments without moving real money</p>
                </div>
                <Switch
                  checked={rzpTestMode}
                  onCheckedChange={setRzpTestMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-400" />
                  Razorpay Key ID
                </Label>
                <Input
                  type="text"
                  placeholder="rzp_test_..."
                  value={rzpKeyId}
                  onChange={(e) => setRzpKeyId(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-400" />
                  Razorpay Key Secret
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={rzpKeySecret}
                  onChange={(e) => setRzpKeySecret(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  Webhook Secret (HMAC SHA-256)
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={rzpWebhookSecret}
                  onChange={(e) => setRzpWebhookSecret(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Webhook URL: <code className="text-blue-300 font-mono">/api/v1/webhooks/razorpay</code></span>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4 border-t border-slate-800/80 flex justify-between items-center">
            <span className="text-[11px] text-slate-500 font-mono">
              {rzpAccount?.updatedAt ? `Saved: ${new Date(rzpAccount.updatedAt).toLocaleDateString()}` : "Not saved"}
            </span>
            <Button
              onClick={handleSaveRazorpay}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              Save Razorpay
            </Button>
          </CardFooter>
        </Card>

        {/* Cashfree Gateway Card */}
        <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      Cashfree Payments
                      {cfActive && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Payment Gateway & Auto-Collect for high volume merchants
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="cf-active-toggle"
                    checked={cfActive}
                    onCheckedChange={setCfActive}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor="cf-active-toggle" className="text-xs font-medium text-slate-300 cursor-pointer">
                    {cfActive ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200">Sandbox Test Mode</span>
                  <p className="text-[11px] text-slate-400">Route via sandbox.cashfree.com</p>
                </div>
                <Switch
                  checked={cfTestMode}
                  onCheckedChange={setCfTestMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-purple-400" />
                  Cashfree App ID
                </Label>
                <Input
                  type="text"
                  placeholder="cf_app_..."
                  value={cfAppId}
                  onChange={(e) => setCfAppId(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-purple-400" />
                  Cashfree Secret Key
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={cfSecretKey}
                  onChange={(e) => setCfSecretKey(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                  Cashfree Webhook Secret
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={cfWebhookSecret}
                  onChange={(e) => setCfWebhookSecret(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-purple-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Webhook URL: <code className="text-purple-300 font-mono">/api/v1/webhooks/cashfree</code></span>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4 border-t border-slate-800/80 flex justify-between items-center">
            <span className="text-[11px] text-slate-500 font-mono">
              {cfAccount?.updatedAt ? `Saved: ${new Date(cfAccount.updatedAt).toLocaleDateString()}` : "Not saved"}
            </span>
            <Button
              onClick={handleSaveCashfree}
              disabled={isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              Save Cashfree
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Cash on Delivery (COD) Card */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Cash on Delivery (COD)
                  {codEnabled && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Enabled
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Allow customers to pay in cash upon physical parcel delivery
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="cod-toggle"
                checked={codEnabled}
                onCheckedChange={setCodEnabled}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="cod-toggle" className="text-xs font-medium text-slate-300 cursor-pointer">
                {codEnabled ? "Active" : "Inactive"}
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-xs font-medium text-slate-400">Minimum Order Amount</span>
              <p className="text-base font-bold text-slate-100">
                ₹{(initialCod.minAmount / 100).toFixed(2)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-xs font-medium text-slate-400">Maximum Order Threshold</span>
              <p className="text-base font-bold text-slate-100">
                ₹{(initialCod.maxAmount / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-slate-800/80 flex justify-end">
          <Button
            onClick={handleSaveCod}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-6"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <ShieldCheck className="h-3.5 w-3.5 mr-2" />}
            Update COD Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
