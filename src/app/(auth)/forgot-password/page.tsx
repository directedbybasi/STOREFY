"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/modules/auth/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, MailCheck, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      if (!result.success) {
        setErrorMessage(result.error || "Failed to send reset link");
        return;
      }
      setSuccessMessage("Password reset instructions have been sent to your email address.");
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Reset Password
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Enter your account email to receive a recovery link
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

          {successMessage ? (
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 p-4 text-center">
              <MailCheck className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-xs font-semibold text-emerald-300">{successMessage}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Check your spam folder if you do not see it within a few minutes.
              </p>
            </div>
          ) : (
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
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          {!successMessage && (
            <Button
              type="submit"
              disabled={isPending || !email}
              className="w-full bg-emerald-500 font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          )}

          <div className="text-center text-xs text-slate-400">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
