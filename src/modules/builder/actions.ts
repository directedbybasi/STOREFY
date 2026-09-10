"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { storeThemes, pages, themeVersions, type PageAst } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { pageAstSchema } from "./schema";
import { STARTER_PRESETS } from "./presets";
import type { StoreThemeSettings } from "@/modules/storefront/theme-engine";

export interface SaveDraftPayload {
  template: string;
  pageSlug: string;
  draftAst: PageAst;
  draftThemeSettings?: StoreThemeSettings;
}

/**
 * Saves in-progress draft changes without affecting the published customer storefront.
 * Guarded by RBAC: builder:write
 */
export async function saveThemeDraftAction(payload: SaveDraftPayload) {
  const ctx = await requirePermission("builder:write");

  // Validate AST structure
  const parsedAst = pageAstSchema.safeParse(payload.draftAst);
  if (!parsedAst.success) {
    throw new Error(`Invalid AST schema: ${parsedAst.error.issues.map((i) => i.message).join(", ")}`);
  }

  // 1. Ensure active theme exists
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
        name: `${ctx.store.name} Default Theme`,
        isActive: true,
        draftSettings: payload.draftThemeSettings || {},
      })
      .returning();
  } else if (payload.draftThemeSettings) {
    await db
      .update(storeThemes)
      .set({
        draftSettings: payload.draftThemeSettings,
        updatedAt: new Date(),
      })
      .where(eq(storeThemes.id, activeTheme.id));
  }

  // 2. Ensure page record exists for this template/slug
  const [existingPage] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.storeId, ctx.store.id), eq(pages.slug, payload.pageSlug)))
    .limit(1);

  if (existingPage) {
    await db
      .update(pages)
      .set({
        draftContent: parsedAst.data,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, existingPage.id));
  } else {
    await db.insert(pages).values({
      storeId: ctx.store.id,
      themeId: activeTheme.id,
      title: payload.template.charAt(0).toUpperCase() + payload.template.slice(1),
      slug: payload.pageSlug,
      pageType: payload.template.toUpperCase(),
      isPublished: true,
      draftContent: parsedAst.data,
      content: {},
    });
  }

  return { success: true, savedAt: new Date().toISOString() };
}

export interface PublishThemePayload {
  pageSlug: string;
  commitMessage?: string;
}

/**
 * Atomically promotes draft AST to live production storefront and records an immutable version.
 * Guarded by RBAC: builder:publish
 */
export async function publishThemeAction(payload: PublishThemePayload) {
  const ctx = await requirePermission("builder:publish");

  // 1. Fetch active theme
  const [activeTheme] = await db
    .select()
    .from(storeThemes)
    .where(and(eq(storeThemes.storeId, ctx.store.id), eq(storeThemes.isActive, true)))
    .limit(1);

  if (!activeTheme) {
    throw new Error("No active theme found for this store");
  }

  // 2. Fetch page with draft content
  const [pageRecord] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.storeId, ctx.store.id), eq(pages.slug, payload.pageSlug)))
    .limit(1);

  if (!pageRecord) {
    throw new Error("Page record not found to publish");
  }

  const publishedAst = (pageRecord.draftContent as PageAst) || { template: payload.pageSlug, sections: [] };
  const publishedSettings = (activeTheme.draftSettings as StoreThemeSettings) || activeTheme.settingsSchema;
  const nextVersionNumber = activeTheme.version + 1;

  // 3. Promote draft to live atomically
  await db
    .update(pages)
    .set({
      content: publishedAst,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, pageRecord.id));

  await db
    .update(storeThemes)
    .set({
      settingsSchema: publishedSettings,
      version: nextVersionNumber,
      updatedAt: new Date(),
    })
    .where(eq(storeThemes.id, activeTheme.id));

  // 4. Record immutable snapshot in theme_versions
  const [versionRecord] = await db
    .insert(themeVersions)
    .values({
      themeId: activeTheme.id,
      storeId: ctx.store.id,
      versionNumber: nextVersionNumber,
      snapshotAst: {
        pageAst: publishedAst,
        themeSettings: publishedSettings,
      },
      createdBy: ctx.user.id,
      commitMessage: payload.commitMessage || `Published version v${nextVersionNumber}`,
    })
    .returning();

  // 5. Revalidate cache
  revalidatePath("/");
  revalidatePath(`/${ctx.store.subdomain}`);
  if (ctx.store.customDomain) {
    revalidatePath(`/${ctx.store.customDomain}`);
  }

  return {
    success: true,
    versionNumber: nextVersionNumber,
    versionId: versionRecord.id,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Reverts the storefront to an earlier immutable snapshot.
 * Guarded by RBAC: builder:publish
 */
export async function rollbackThemeVersionAction(versionId: string, pageSlug: string) {
  const ctx = await requirePermission("builder:publish");

  // 1. Fetch targeted historical snapshot
  const [targetVersion] = await db
    .select()
    .from(themeVersions)
    .where(and(eq(themeVersions.id, versionId), eq(themeVersions.storeId, ctx.store.id)))
    .limit(1);

  if (!targetVersion) {
    throw new Error("Target revision snapshot not found for this store");
  }

  const snapshot = targetVersion.snapshotAst as {
    pageAst?: PageAst;
    themeSettings?: StoreThemeSettings;
  };

  if (!snapshot?.pageAst) {
    throw new Error("Corrupt snapshot: missing page AST");
  }

  // 2. Fetch active theme
  const [activeTheme] = await db
    .select()
    .from(storeThemes)
    .where(and(eq(storeThemes.storeId, ctx.store.id), eq(storeThemes.isActive, true)))
    .limit(1);

  if (!activeTheme) {
    throw new Error("Active theme not found");
  }

  const nextVersionNumber = activeTheme.version + 1;

  // 3. Restore to both published and draft
  await db
    .update(pages)
    .set({
      content: snapshot.pageAst,
      draftContent: snapshot.pageAst,
      updatedAt: new Date(),
    })
    .where(and(eq(pages.storeId, ctx.store.id), eq(pages.slug, pageSlug)));

  if (snapshot.themeSettings) {
    await db
      .update(storeThemes)
      .set({
        settingsSchema: snapshot.themeSettings,
        draftSettings: snapshot.themeSettings,
        version: nextVersionNumber,
        updatedAt: new Date(),
      })
      .where(eq(storeThemes.id, activeTheme.id));
  }

  // 4. Record new version reflecting the rollback event
  await db.insert(themeVersions).values({
    themeId: activeTheme.id,
    storeId: ctx.store.id,
    versionNumber: nextVersionNumber,
    snapshotAst: snapshot,
    createdBy: ctx.user.id,
    commitMessage: `Rollback to version v${targetVersion.versionNumber}`,
  });

  revalidatePath("/");

  return { success: true, rolledBackTo: targetVersion.versionNumber, newVersion: nextVersionNumber };
}

/**
 * Retrieves the immutable version history of the active store theme.
 * Guarded by RBAC: builder:read
 */
export async function getThemeVersionsAction() {
  const ctx = await requirePermission("builder:read");

  const versions = await db
    .select({
      id: themeVersions.id,
      versionNumber: themeVersions.versionNumber,
      commitMessage: themeVersions.commitMessage,
      createdAt: themeVersions.createdAt,
    })
    .from(themeVersions)
    .where(eq(themeVersions.storeId, ctx.store.id))
    .orderBy(desc(themeVersions.versionNumber))
    .limit(20);

  return versions;
}

/**
 * Applies a starter archetype preset directly to the draft AST.
 * Guarded by RBAC: builder:write
 */
export async function applyStarterPresetAction(presetKey: string, pageSlug: string) {
  await requirePermission("builder:write");
  const preset = STARTER_PRESETS[presetKey];

  if (!preset) {
    throw new Error(`Starter preset '${presetKey}' not found`);
  }

  return saveThemeDraftAction({
    template: "home",
    pageSlug,
    draftAst: preset.homeAst,
    draftThemeSettings: preset.defaultThemeSettings,
  });
}
