"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/modules/auth/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await signInAction({ email, password });
      if (!result.success) {
        setErrorMessage(result.error || "Authentication failed");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Sign In to Your Store
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Enter your merchant credentials to access your dashboard
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

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
              Email Address
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
              autoComplete="current-password"
              className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            disabled={isPending || !email || !password}
            className="w-full bg-emerald-500 font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="text-center text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
            >
              Start Free Trial
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md p-8 text-center text-slate-400">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-400" />
          <p className="mt-2 text-xs">Loading sign-in form...</p>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
