"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStoreAction } from "@/modules/stores/actions";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, ArrowRight, AlertCircle, Sparkles, SkipForward } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [isSubdomainManuallyEdited, setIsSubdomainManuallyEdited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Suggest subdomain automatically from store name
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    if (!isSubdomainManuallyEdited) {
      const suggested = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSubdomain(suggested);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSubdomainManuallyEdited(true);
    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(cleaned);
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createStoreAction({
        name: storeName,
        subdomain,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create store. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  };

  const handleSkip = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Store className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Welcome to STOREFY
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Create your first store to launch your brand
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleCreateStore}>
        <CardContent className="space-y-4 pt-2">
          {errorMessage && (
            <Alert variant="destructive" className="border-rose-900/50 bg-rose-950/50 text-rose-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Store Name */}
          <div className="space-y-1.5">
            <Label htmlFor="storeName" className="text-xs font-semibold text-slate-300">
              Store / Brand Name
            </Label>
            <div className="relative">
              <Input
                id="storeName"
                type="text"
                placeholder="Velvet Bloom"
                value={storeName}
                onChange={handleStoreNameChange}
                required
                disabled={isPending}
                className="border-slate-800 bg-slate-950 pr-10 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
              />
              <Store className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Subdomain with live preview */}
          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-xs font-semibold text-slate-300">
              Store URL / Subdomain
            </Label>
            <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 focus-within:border-emerald-500">
              <input
                id="subdomain"
                type="text"
                placeholder="velvet-bloom"
                value={subdomain}
                onChange={handleSubdomainChange}
                required
                disabled={isPending}
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
                .storefy.shop
              </span>
            </div>
            {subdomain && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Your storefront URL: <span className="font-mono">{subdomain}.storefy.shop</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button
            type="submit"
            disabled={isPending || !storeName || !subdomain}
            className="w-full bg-emerald-500 font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-50 shadow-md"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Store...
              </>
            ) : (
              <>
                Create Store
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isPending}
            className="w-full text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <SkipForward className="mr-1.5 h-3.5 w-3.5" />
            Skip for now
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
