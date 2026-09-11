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
  Truck,
  Building2,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { saveShippingAccountAction } from "@/modules/shipping/actions";

interface ShippingAccountData {
  id?: string;
  carrier: string;
  isTestMode: boolean;
  isActive: boolean;
  isDefault: boolean;
  originAddress: Record<string, unknown>;
  credentials: Record<string, string | undefined>;
}

interface ShippingSettingsFormProps {
  initialAccounts: ShippingAccountData[];
}

export function ShippingSettingsForm({ initialAccounts }: ShippingSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Shiprocket state
  const srAccount = initialAccounts.find((a) => a.carrier === "SHIPROCKET");
  const [srActive, setSrActive] = useState(srAccount?.isActive ?? false);
  const [srTestMode, setSrTestMode] = useState(srAccount?.isTestMode ?? true);
  const [srApiToken, setSrApiToken] = useState(srAccount?.credentials?.apiToken || "");

  // Delhivery state
  const dlhAccount = initialAccounts.find((a) => a.carrier === "DELHIVERY");
  const [dlhActive, setDlhActive] = useState(dlhAccount?.isActive ?? false);
  const [dlhTestMode, setDlhTestMode] = useState(dlhAccount?.isTestMode ?? true);
  const [dlhApiToken, setDlhApiToken] = useState(dlhAccount?.credentials?.apiToken || "");

  // Origin address state (shared warehouse default)
  const defaultOrigin = (srAccount?.originAddress || dlhAccount?.originAddress || {}) as Record<string, string>;
  const [originName, setOriginName] = useState(defaultOrigin.name || "Central Warehouse Dispatch");
  const [originPhone, setOriginPhone] = useState(defaultOrigin.phone || "9876543210");
  const [originAddressLine1, setOriginAddressLine1] = useState(defaultOrigin.addressLine1 || "Building 4, Logistics Park");
  const [originCity, setOriginCity] = useState(defaultOrigin.city || "New Delhi");
  const [originState, setOriginState] = useState(defaultOrigin.state || "Delhi");
  const [originPostalCode, setOriginPostalCode] = useState(defaultOrigin.postalCode || "110001");

  const getOriginPayload = () => ({
    name: originName,
    phone: originPhone,
    addressLine1: originAddressLine1,
    city: originCity,
    state: originState,
    postalCode: originPostalCode,
    country: "India",
  });

  const handleSaveShiprocket = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveShippingAccountAction({
        carrier: "SHIPROCKET",
        isActive: srActive,
        isTestMode: srTestMode,
        isDefault: srActive,
        originAddress: getOriginPayload(),
        credentials: {
          apiToken: srApiToken,
        },
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Shiprocket carrier account configured successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save Shiprocket settings." });
      }
    });
  };

  const handleSaveDelhivery = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveShippingAccountAction({
        carrier: "DELHIVERY",
        isActive: dlhActive,
        isTestMode: dlhTestMode,
        isDefault: false,
        originAddress: getOriginPayload(),
        credentials: {
          apiToken: dlhApiToken,
        },
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Delhivery carrier account configured successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save Delhivery settings." });
      }
    });
  };

  return (
    <div className="space-y-8">
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

      {/* Origin Pickup Warehouse Card */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white">Default Origin & Pickup Address</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Couriers use this dispatch address to calculate live distance rates and schedule parcel pickups.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Dispatch Facility Name</Label>
            <Input
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Pickup Phone</Label>
            <Input
              value={originPhone}
              onChange={(e) => setOriginPhone(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Postal PIN Code</Label>
            <Input
              value={originPostalCode}
              onChange={(e) => setOriginPostalCode(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Address Line 1</Label>
            <Input
              value={originAddressLine1}
              onChange={(e) => setOriginAddressLine1(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">City & State</Label>
            <div className="flex gap-2">
              <Input
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                placeholder="City"
                className="bg-slate-950 border-slate-800 text-slate-100 text-xs w-1/2"
              />
              <Input
                value={originState}
                onChange={(e) => setOriginState(e.target.value)}
                placeholder="State"
                className="bg-slate-950 border-slate-800 text-slate-100 text-xs w-1/2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carriers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shiprocket Card */}
        <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      Shiprocket
                      {srActive && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Multi-courier aggregation (Bluedart, Ekart, DTDC, Xpressbees)
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={srActive}
                    onCheckedChange={setSrActive}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label className="text-xs font-medium text-slate-300">
                    {srActive ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200">Sandbox Test Mode</span>
                  <p className="text-[11px] text-slate-400">Simulate courier manifests without dispatching trucks</p>
                </div>
                <Switch
                  checked={srTestMode}
                  onCheckedChange={setSrTestMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-orange-400" />
                  Shiprocket API Bearer Token
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={srApiToken}
                  onChange={(e) => setSrApiToken(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-orange-500"
                />
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4 border-t border-slate-800/80 flex justify-end">
            <Button
              onClick={handleSaveShiprocket}
              disabled={isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              Save Shiprocket
            </Button>
          </CardFooter>
        </Card>

        {/* Delhivery Card */}
        <Card className="border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      Delhivery Direct
                      {dlhActive && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Direct courier integration with automated CMU waybill generation
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={dlhActive}
                    onCheckedChange={setDlhActive}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label className="text-xs font-medium text-slate-300">
                    {dlhActive ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200">Test / Staging Mode</span>
                  <p className="text-[11px] text-slate-400">Use staging environment for waybill creation</p>
                </div>
                <Switch
                  checked={dlhTestMode}
                  onCheckedChange={setDlhTestMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-red-400" />
                  Delhivery Client API Token
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={dlhApiToken}
                  onChange={(e) => setDlhApiToken(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs focus:border-red-500"
                />
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4 border-t border-slate-800/80 flex justify-end">
            <Button
              onClick={handleSaveDelhivery}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              Save Delhivery
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
