import { describe, it, expect } from "vitest";
import { ForbiddenError } from "@/core/errors";
import { hasPermission } from "@/core/tenant/rbac";
import { ROLE_PERMISSION_MATRIX } from "@/database/seeds/rbac-seed";
import type { PageAst } from "@/modules/builder/schema";

interface MockStaff {
  userId: string;
  organizationId: string;
  storeId: string | null;
  roleName: string;
  isActive: boolean;
}

interface MockStore {
  id: string;
  organizationId: string;
  name: string;
}

interface MockStoreTheme {
  id: string;
  storeId: string;
  name: string;
  version: number;
  isActive: boolean;
  settingsSchema: Record<string, unknown>;
  draftSettings: Record<string, unknown>;
}

interface MockPage {
  id: string;
  storeId: string;
  themeId: string;
  slug: string;
  content: PageAst;
  draftContent: PageAst;
}

interface MockThemeVersion {
  id: string;
  themeId: string;
  storeId: string;
  versionNumber: number;
  snapshotAst: {
    pageAst: PageAst;
    themeSettings: Record<string, unknown>;
  };
  createdBy: string;
  commitMessage: string;
  createdAt: Date;
}

// Simulated isolated tenant environment
class MockBuilderEnvironment {
  public stores: MockStore[] = [];
  public staff: MockStaff[] = [];
  public themes: MockStoreTheme[] = [];
  public pages: MockPage[] = [];
  public versions: MockThemeVersion[] = [];

  public verifyAccess(
    userId: string,
    targetStoreId: string,
    requiredPermission: string
  ): MockStaff {
    const store = this.stores.find((s) => s.id === targetStoreId);
    if (!store) {
      throw new ForbiddenError(`Store '${targetStoreId}' not found or access denied`);
    }

    const membership = this.staff.find(
      (m) =>
        m.userId === userId &&
        m.organizationId === store.organizationId &&
        m.isActive &&
        (m.storeId === null || m.storeId === store.id)
    );

    if (!membership) {
      throw new ForbiddenError(`User '${userId}' has no active staff membership in store '${targetStoreId}'`);
    }

    const isOwner = membership.roleName === "OWNER";
    const permissions = new Set(
      ROLE_PERMISSION_MATRIX[membership.roleName as keyof typeof ROLE_PERMISSION_MATRIX] || []
    );

    if (!hasPermission(permissions, requiredPermission, isOwner)) {
      throw new ForbiddenError(
        `User '${userId}' with role '${membership.roleName}' lacks required permission '${requiredPermission}'`
      );
    }

    return membership;
  }

  public saveDraft(userId: string, storeId: string, pageSlug: string, draftAst: PageAst, draftSettings?: Record<string, unknown>) {
    this.verifyAccess(userId, storeId, "builder:write");

    const theme = this.themes.find((t) => t.storeId === storeId && t.isActive);
    if (!theme) throw new Error("No active theme");

    if (draftSettings) {
      theme.draftSettings = draftSettings;
    }

    let page = this.pages.find((p) => p.storeId === storeId && p.slug === pageSlug);
    if (page) {
      page.draftContent = structuredClone(draftAst);
    } else {
      page = {
        id: `page-${Date.now()}`,
        storeId,
        themeId: theme.id,
        slug: pageSlug,
        content: { template: pageSlug, sections: [] },
        draftContent: structuredClone(draftAst),
      };
      this.pages.push(page);
    }

    return { success: true };
  }

  public publish(userId: string, storeId: string, pageSlug: string, commitMessage?: string) {
    const staff = this.verifyAccess(userId, storeId, "builder:publish");

    const theme = this.themes.find((t) => t.storeId === storeId && t.isActive);
    if (!theme) throw new Error("No active theme");

    const page = this.pages.find((p) => p.storeId === storeId && p.slug === pageSlug);
    if (!page) throw new Error("Page not found");

    const nextVersion = theme.version + 1;
    const publishedAst = structuredClone(page.draftContent);
    const publishedSettings = structuredClone(theme.draftSettings);

    // Atomic promotion
    page.content = publishedAst;
    theme.settingsSchema = publishedSettings;
    theme.version = nextVersion;

    // Record immutable snapshot
    const versionRecord: MockThemeVersion = {
      id: `v-rec-${Date.now()}-${nextVersion}`,
      themeId: theme.id,
      storeId,
      versionNumber: nextVersion,
      snapshotAst: {
        pageAst: publishedAst,
        themeSettings: publishedSettings,
      },
      createdBy: staff.userId,
      commitMessage: commitMessage || `Published version v${nextVersion}`,
      createdAt: new Date(),
    };
    this.versions.push(versionRecord);

    return { success: true, version: nextVersion };
  }

  public rollback(userId: string, storeId: string, versionId: string) {
    const staff = this.verifyAccess(userId, storeId, "builder:publish");

    const versionRecord = this.versions.find((v) => v.id === versionId && v.storeId === storeId);
    if (!versionRecord) {
      throw new ForbiddenError("Revision version not found or belongs to another store");
    }

    const theme = this.themes.find((t) => t.id === versionRecord.themeId && t.storeId === storeId);
    if (!theme) throw new Error("Theme not found");

    const pageSlug = versionRecord.snapshotAst.pageAst.template || "home";
    const page = this.pages.find((p) => p.storeId === storeId && p.slug === pageSlug);
    if (!page) throw new Error("Target page not found");

    const nextVersion = theme.version + 1;

    // Restore snapshot into live content
    page.content = structuredClone(versionRecord.snapshotAst.pageAst);
    page.draftContent = structuredClone(versionRecord.snapshotAst.pageAst);
    theme.settingsSchema = structuredClone(versionRecord.snapshotAst.themeSettings);
    theme.draftSettings = structuredClone(versionRecord.snapshotAst.themeSettings);
    theme.version = nextVersion;

    // Insert new version row for rollback audit trail (preserves history immutability)
    this.versions.push({
      id: `v-rollback-${Date.now()}`,
      themeId: theme.id,
      storeId,
      versionNumber: nextVersion,
      snapshotAst: versionRecord.snapshotAst,
      createdBy: staff.userId,
      commitMessage: `Rollback to version v${versionRecord.versionNumber}`,
      createdAt: new Date(),
    });

    return { success: true, restoredVersion: versionRecord.versionNumber, newVersion: nextVersion };
  }
}

describe("Phase 5: Builder Actions, RBAC & Cross-Tenant Security", () => {
  function setupEnvironment() {
    const env = new MockBuilderEnvironment();

    // Store A (Merchant A)
    env.stores.push({ id: "store-a", organizationId: "org-a", name: "Alpha Boutique" });
    // Store B (Merchant B)
    env.stores.push({ id: "store-b", organizationId: "org-b", name: "Beta Fashion" });

    // Staff for Store A
    env.staff.push({ userId: "user-owner-a", organizationId: "org-a", storeId: "store-a", roleName: "OWNER", isActive: true });
    env.staff.push({ userId: "user-admin-a", organizationId: "org-a", storeId: "store-a", roleName: "ADMIN", isActive: true });
    env.staff.push({ userId: "user-mktg-a", organizationId: "org-a", storeId: "store-a", roleName: "MARKETING_MANAGER", isActive: true });
    env.staff.push({ userId: "user-pm-a", organizationId: "org-a", storeId: "store-a", roleName: "PRODUCT_MANAGER", isActive: true });
    env.staff.push({ userId: "user-support-a", organizationId: "org-a", storeId: "store-a", roleName: "SUPPORT", isActive: true });

    // Staff for Store B
    env.staff.push({ userId: "user-owner-b", organizationId: "org-b", storeId: "store-b", roleName: "OWNER", isActive: true });

    // Themes
    env.themes.push({
      id: "theme-a",
      storeId: "store-a",
      name: "Alpha Theme",
      version: 1,
      isActive: true,
      settingsSchema: { primaryColor: "#0f172a" },
      draftSettings: { primaryColor: "#0f172a" },
    });
    env.themes.push({
      id: "theme-b",
      storeId: "store-b",
      name: "Beta Theme",
      version: 1,
      isActive: true,
      settingsSchema: { primaryColor: "#ef4444" },
      draftSettings: { primaryColor: "#ef4444" },
    });

    // Pages
    env.pages.push({
      id: "page-a-home",
      storeId: "store-a",
      themeId: "theme-a",
      slug: "home",
      content: { template: "home", sections: [] },
      draftContent: { template: "home", sections: [] },
    });
    env.pages.push({
      id: "page-b-home",
      storeId: "store-b",
      themeId: "theme-b",
      slug: "home",
      content: { template: "home", sections: [] },
      draftContent: { template: "home", sections: [] },
    });

    return env;
  }

  it("OWNER and ADMIN can save drafts and publish themes", () => {
    const env = setupEnvironment();
    const newAst: PageAst = {
      template: "home",
      sections: [{ id: "hero-1", type: "hero", settings: { title: "New Summer Drop" }, blocks: [] }],
    };

    // Owner saves draft
    expect(() => env.saveDraft("user-owner-a", "store-a", "home", newAst)).not.toThrow();

    // Draft is updated but live content is still unchanged
    const pageA = env.pages.find((p) => p.storeId === "store-a" && p.slug === "home")!;
    expect(pageA.draftContent.sections.length).toBe(1);
    expect(pageA.content.sections.length).toBe(0);

    // Admin publishes
    const pubResult = env.publish("user-admin-a", "store-a", "home", "Launch summer banner");
    expect(pubResult.success).toBe(true);
    expect(pubResult.version).toBe(2);

    // Live content is now updated and version record created
    expect(pageA.content.sections.length).toBe(1);
    expect(pageA.content.sections[0].settings.title).toBe("New Summer Drop");
    expect(env.versions.length).toBe(1);
    expect(env.versions[0].versionNumber).toBe(2);
  });

  it("MARKETING_MANAGER can save drafts (builder:write) but CANNOT publish (builder:publish)", () => {
    const env = setupEnvironment();
    const draftAst: PageAst = {
      template: "home",
      sections: [{ id: "banner-1", type: "promo_banner", settings: {}, blocks: [] }],
    };

    // Marketing manager can save draft
    expect(() => env.saveDraft("user-mktg-a", "store-a", "home", draftAst)).not.toThrow();

    // Marketing manager fails to publish
    expect(() => env.publish("user-mktg-a", "store-a", "home")).toThrow(ForbiddenError);
  });

  it("PRODUCT_MANAGER and SUPPORT cannot save drafts or publish", () => {
    const env = setupEnvironment();
    const draftAst: PageAst = { template: "home", sections: [] };

    expect(() => env.saveDraft("user-pm-a", "store-a", "home", draftAst)).toThrow(ForbiddenError);
    expect(() => env.publish("user-pm-a", "store-a", "home")).toThrow(ForbiddenError);

    expect(() => env.saveDraft("user-support-a", "store-a", "home", draftAst)).toThrow(ForbiddenError);
    expect(() => env.publish("user-support-a", "store-a", "home")).toThrow(ForbiddenError);
  });

  it("CRITICAL: Merchant A staff cannot access, save draft, publish, or rollback Merchant B's theme", () => {
    const env = setupEnvironment();
    const evilAst: PageAst = {
      template: "home",
      sections: [{ id: "hacked", type: "hero", settings: { title: "Defaced by A" }, blocks: [] }],
    };

    // User A attempts to save draft on Store B
    expect(() => env.saveDraft("user-owner-a", "store-b", "home", evilAst)).toThrow(ForbiddenError);

    // User A attempts to publish Store B
    expect(() => env.publish("user-owner-a", "store-b", "home")).toThrow(ForbiddenError);

    // User B publishes legitimate version v2
    env.saveDraft("user-owner-b", "store-b", "home", {
      template: "home",
      sections: [{ id: "b-legit", type: "hero", settings: { title: "Beta Exclusive" }, blocks: [] }],
    });
    env.publish("user-owner-b", "store-b", "home", "Beta v2 release");
    const versionBId = env.versions[0].id;

    // User A attempts to rollback Store B's version
    expect(() => env.rollback("user-owner-a", "store-b", versionBId)).toThrow(ForbiddenError);

    // User A attempts to rollback Store A with Store B's version ID
    expect(() => env.rollback("user-owner-a", "store-a", versionBId)).toThrow(ForbiddenError);
  });

  it("supports atomic rollback to a previous version and maintains immutable revision records", () => {
    const env = setupEnvironment();

    // 1. Publish v2
    env.saveDraft("user-owner-a", "store-a", "home", {
      template: "home",
      sections: [{ id: "v2-hero", type: "hero", settings: { title: "Version 2 Title" }, blocks: [] }],
    });
    env.publish("user-owner-a", "store-a", "home", "Release v2");
    const v2Record = env.versions[0];
    expect(v2Record.versionNumber).toBe(2);

    // 2. Publish v3 with mistake
    env.saveDraft("user-owner-a", "store-a", "home", {
      template: "home",
      sections: [{ id: "v3-broken", type: "hero", settings: { title: "Broken Typo" }, blocks: [] }],
    });
    env.publish("user-owner-a", "store-a", "home", "Release v3");
    expect(env.versions.length).toBe(2);

    const pageA = env.pages.find((p) => p.storeId === "store-a" && p.slug === "home")!;
    expect(pageA.content.sections[0].settings.title).toBe("Broken Typo");

    // 3. Rollback to v2
    const rollbackResult = env.rollback("user-owner-a", "store-a", v2Record.id);
    expect(rollbackResult.success).toBe(true);
    expect(rollbackResult.restoredVersion).toBe(2);
    expect(rollbackResult.newVersion).toBe(4);

    // Live storefront restored to v2 title
    expect(pageA.content.sections[0].settings.title).toBe("Version 2 Title");

    // Historical records are preserved: we now have 3 version records (v2, v3, and v4-rollback)
    expect(env.versions.length).toBe(3);
    expect(env.versions[2].commitMessage).toContain("Rollback to version v2");
  });
});
