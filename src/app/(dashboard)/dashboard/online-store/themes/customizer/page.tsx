import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { storeThemes, pages, type PageAst } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { CustomizerWorkspace } from "@/components/builder/customizer-workspace";
import { STARTER_PRESETS } from "@/modules/builder/presets";
import { DEFAULT_THEME_SETTINGS, type StoreThemeSettings } from "@/modules/storefront/theme-engine";

export default async function ThemeCustomizerPage() {
  const ctx = await requirePermission("builder:read");

  // 1. Resolve or create active theme
  let [activeTheme] = await db
    .select()
    .from(storeThemes)
    .where(and(eq(storeThemes.storeId, ctx.store.id), eq(storeThemes.isActive, true)))
    .limit(1);

  if (!activeTheme) {
    [activeTheme] = await db
      .insert(storeThemes)
      .values({
        storeId: ctx.store.id,
        name: `${ctx.store.name} Standard Theme`,
        isActive: true,
        version: 1,
        draftSettings: DEFAULT_THEME_SETTINGS,
        settingsSchema: DEFAULT_THEME_SETTINGS,
      })
      .returning();
  }

  // 2. Fetch page draft content for 'home'
  const [homePage] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.storeId, ctx.store.id), eq(pages.slug, "home")))
    .limit(1);

  let initialAst: PageAst;

  if (homePage?.draftContent && typeof homePage.draftContent === "object" && (homePage.draftContent as PageAst).sections) {
    initialAst = homePage.draftContent as PageAst;
  } else if (homePage?.content && typeof homePage.content === "object" && (homePage.content as PageAst).sections) {
    initialAst = homePage.content as PageAst;
  } else {
    // Default to general starter preset
    initialAst = STARTER_PRESETS.general.homeAst;
  }

  const initialThemeSettings =
    (activeTheme.draftSettings as StoreThemeSettings) ||
    (activeTheme.settingsSchema as StoreThemeSettings) ||
    DEFAULT_THEME_SETTINGS;

  return (
    <CustomizerWorkspace
      initialAst={initialAst}
      initialThemeSettings={initialThemeSettings}
      store={{
        id: ctx.store.id,
        name: ctx.store.name,
        subdomain: ctx.store.subdomain,
        customDomain: ctx.store.customDomain,
        currency: ctx.store.currency,
        logoUrl: null,
      }}
      initialPageSlug="home"
    />
  );
}
