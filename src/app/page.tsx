import Link from "next/link";
import {
  CheckCircle2,
  Shield,
  Layers,
  Database,
  ArrowRight,
  Sparkles,
  LayoutTemplate,
  LogIn,
  Store,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 sm:p-8 md:p-16 bg-gradient-to-b from-background via-slate-50/50 to-slate-100/50 dark:from-background dark:to-slate-900/50">
      {/* Top Navigation */}
      <header className="z-10 max-w-6xl w-full items-center justify-between font-mono text-sm flex flex-wrap gap-4">
        <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-primary">
          <Layers className="h-6 w-6 text-primary" />
          <span>STOREFY</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition px-3 py-1.5"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition px-3 py-1.5 hidden sm:inline"
          >
            Register
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <span>Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="my-auto max-w-4xl text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Shopify-Style Theme Customizer &bull; Hosted-First Multi-Tenancy</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
          Next-Generation <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            Multi-Tenant Commerce
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Production-grade SaaS operating platform powering Normal E-Commerce, Platform
          Dropshipping, and Meesho Reselling through unified multi-tenant architecture.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm"
          >
            <Store className="h-4 w-4" />
            <span>Merchant Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/online-store/themes/customizer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition border text-sm"
          >
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <span>Theme Customizer</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border bg-background hover:bg-muted text-foreground transition text-sm font-medium"
          >
            <LogIn className="h-4 w-4 text-muted-foreground" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>

      {/* Feature / Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full pt-8 border-t">
        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <LayoutTemplate className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold">Theme Customizer</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Shopify-style visual editor with Section & Block tree, real-time responsive canvas,
            reordering, presets, and atomic draft-to-live publishing.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Database className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-bold">Multi-Tenant Engine</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hosted Supabase PostgreSQL with pooled Drizzle ORM client, tenant subdomain routing,
            custom domains, and strict PostgreSQL RLS policies.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Zero-Trust RBAC</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multi-store isolation, granular merchant permissions, server-authoritative state,
            and complete draft revision rollback history.
          </p>
        </div>
      </div>

      {/* Footer System Status */}
      <footer className="w-full max-w-5xl pt-8 pb-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>System Operational &bull; Hosted-First Cloud Architecture</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/api/v1/health" className="hover:underline">
            API Health
          </Link>
          <span>&bull;</span>
          <Link href="/login" className="hover:underline">
            Merchant Portal
          </Link>
        </div>
      </footer>
    </main>
  );
}
