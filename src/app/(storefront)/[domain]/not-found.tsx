import Link from "next/link";
import { SearchX, ArrowLeft, Home } from "lucide-react";

export default function StorefrontNotFound() {
  return (
    <div className="py-16 sm:py-24 text-center max-w-xl mx-auto space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <SearchX className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--store-accent,#2563eb)]">
          404 Error
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--store-text,#0f172a)] sm:text-4xl">
          Page Not Found
        </h1>
        <p className="text-base text-slate-600">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>

      <div className="pt-4 flex items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
        >
          <Home className="h-4 w-4" />
          <span>Go to Homepage</span>
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-[var(--store-text,#0f172a)] text-sm font-medium hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Browse Products</span>
        </Link>
      </div>
    </div>
  );
}
