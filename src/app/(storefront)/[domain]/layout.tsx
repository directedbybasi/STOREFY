import type { ReactNode } from "react";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { compileThemeCssVariables } from "@/modules/storefront/theme-engine";
import { StorefrontAnnouncementBar } from "@/components/storefront/announcement-bar";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/footer";
import { AlertCircle, Wrench, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface StorefrontLayoutProps {
  children: ReactNode;
  params: Promise<{ domain: string }>;
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  // 1. Domain / Store Not Found
  if (resolution.status === "NOT_FOUND") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Store Not Found
          </h1>
          <p className="text-sm text-slate-600">
            No active store is associated with domain{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs font-semibold">
              {domain}
            </code>
            . Please check the URL or contact support.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
            >
              Return to Platform
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              Merchant Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Suspended Store Lifecycle State
  if (resolution.status === "SUSPENDED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-rose-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Store Unavailable
          </h1>
          <p className="text-sm text-slate-600">
            <strong>{resolution.store.name}</strong> is currently unavailable.
            Store operations are temporarily suspended.
          </p>
        </div>
      </div>
    );
  }

  // 3. Maintenance Mode Lifecycle State
  if (resolution.status === "MAINTENANCE") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-amber-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Under Scheduled Maintenance
          </h1>
          <p className="text-sm text-slate-600">
            <strong>{resolution.store.name}</strong> is currently undergoing
            scheduled improvements. We will be back online shortly. Thank you
            for your patience.
          </p>
        </div>
      </div>
    );
  }

  // 4. ACTIVE Storefront Engine Render
  const { store, settings, themeSettings, navigation: navMenus } = resolution;
  const cssVariables = compileThemeCssVariables(themeSettings);

  return (
    <div
      style={cssVariables}
      className="min-h-screen flex flex-col bg-[var(--store-bg,#ffffff)] text-[var(--store-text,#0f172a)] font-sans antialiased selection:bg-[var(--store-primary,#0f172a)] selection:text-white"
    >
      {/* Announcement Bar */}
      {themeSettings.announcement?.enabled && (
        <StorefrontAnnouncementBar
          text={themeSettings.announcement.text}
          link={themeSettings.announcement.link}
        />
      )}

      {/* Dynamic Header */}
      <StorefrontHeader
        storeName={store.name}
        logoUrl={store.logoUrl}
        navigationItems={navMenus.main}
        domain={domain}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>

      {/* Dynamic Multi-Column Footer */}
      <StorefrontFooter
        storeName={store.name}
        aboutText={themeSettings.footer?.aboutText}
        copyrightText={themeSettings.footer?.copyrightText}
        navigationItems={navMenus.footer}
        settings={settings}
        domain={domain}
      />
    </div>
  );
}
