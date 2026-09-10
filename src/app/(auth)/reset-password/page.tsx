"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/modules/auth/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordAction({ password, confirmPassword });
      if (!result.success) {
        setErrorMessage(result.error || "Failed to update password");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Set New Password
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Enter and confirm your new secure password
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

          {success ? (
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-xs font-semibold text-emerald-300">
                Password updated successfully!
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Redirecting you to login...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  New Password (min 8 chars, 1 uppercase, 1 number)
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="new-password"
                  className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          {!success && (
            <Button
              type="submit"
              disabled={isPending || !password || !confirmPassword}
              className="w-full bg-emerald-500 font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          )}

          <div className="text-center text-xs text-slate-400">
            <Link
              href="/login"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
