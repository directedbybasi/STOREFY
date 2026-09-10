import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Subtle radial backdrop illumination */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-3xl -translate-y-24" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-105"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="h-5 w-5 font-bold" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              STORE<span className="text-emerald-400">FY</span>
            </span>
          </Link>
          <p className="mt-2 text-xs font-medium text-slate-400">
            Next-Gen Multi-Tenant E-Commerce Platform
          </p>
        </div>

        {/* Auth Card Content */}
        {children}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Protected by enterprise-grade Zero-Trust RLS &bull; STOREFY Inc.
        </p>
      </div>
    </div>
  );
}
