import Link from "next/link";
import { CheckCircle2, Shield, Layers, Database, ArrowRight, Server } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 md:p-24 bg-gradient-to-b from-background via-slate-50/50 to-slate-100/50 dark:from-background dark:to-slate-900/50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex">
        <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-primary">
          <Layers className="h-6 w-6 text-primary" />
          <span>STOREFY</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Phase 1 Foundation Active
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Hosted-First Topology
          </span>
        </div>
      </div>

      <div className="my-auto max-w-3xl text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
          <Server className="h-3.5 w-3.5" />
          <span>Hosted Supabase Development &bull; Next.js 15 App Router</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Next-Generation <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            Multi-Tenant Commerce
          </span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Production-grade SaaS operating platform powering Normal E-Commerce, Platform
          Dropshipping, and Meesho Reselling through unified multi-tenant architecture.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/api/v1/health"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm"
          >
            <span>Inspect API Health</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition border"
          >
            <span>Architecture Docs</span>
          </a>
        </div>
      </div>

      {/* Infrastructure Verification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full pt-8 border-t">
        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3>Modular Monolith</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            19 encapsulated domain modules with strict boundaries, Zod schema validation, and RFC
            7807 error envelopes.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Database className="h-5 w-5 text-indigo-500" />
            <h3>Hosted Persistence</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hosted Supabase PostgreSQL with pooled Drizzle ORM runtime client, direct migration
            pipeline, and RLS policies.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3>Zero-Trust Security</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AES-256-GCM encrypted credential vault, server-authoritative pricing calculations, and
            strict client/server barriers.
          </p>
        </div>
      </div>
    </main>
  );
}
