"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpAction } from "@/modules/auth/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [isSubdomainManuallyEdited, setIsSubdomainManuallyEdited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Automatically suggest subdomain from store name until manually edited
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await signUpAction({
        fullName,
        email,
        password,
        storeName,
        subdomain,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create account");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Create Your Merchant Account
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Launch your multi-store brand in under 60 seconds
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-2">
          {errorMessage && (
            <Alert variant="destructive" className="border-rose-900/50 bg-rose-950/50 text-rose-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-slate-300">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Aarav Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isPending}
              autoComplete="name"
              className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
              Work Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="merchant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
              autoComplete="email"
              className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
              Password (min 8 chars, 1 uppercase, 1 number)
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
              autoComplete="new-password"
              className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>

          {/* Store Name */}
          <div className="space-y-1.5 pt-1">
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
              Store URL
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
                Live URL will be: <span className="font-mono">{subdomain}.storefy.shop</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            disabled={isPending || !fullName || !email || !password || !storeName || !subdomain}
            className="w-full bg-emerald-500 font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Provisioning Store...
              </>
            ) : (
              <>
                Create Store & Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
