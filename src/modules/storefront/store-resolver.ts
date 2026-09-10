import { db } from "@/database/client";
import { stores, storeDomains, storeSettings, storeThemes, navigation, type Store, type StoreSettings, type StoreTheme, type NavigationItem, type Navigation } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { normalizeHostname, extractSubdomain } from "@/modules/stores/domain-service";
import { DEFAULT_THEME_SETTINGS, type StoreThemeSettings } from "./theme-engine";

export type StorefrontResolutionResult =
  | { status: "NOT_FOUND"; domain: string }
  | { status: "SUSPENDED"; store: Store; domain: string }
  | { status: "MAINTENANCE"; store: Store; domain: string }
  | {
      status: "ACTIVE";
      store: Store;
      settings: StoreSettings | null;
      theme: StoreTheme | null;
      themeSettings: StoreThemeSettings;
      navigation: {
        main: NavigationItem[];
        footer: NavigationItem[];
      };
      domain: string;
    };

/**
 * Resolves a public storefront tenant context exclusively from the normalized domain.
 *
 * CRITICAL ZERO-TRUST INVARIANT:
 * Resolution occurs strictly via database queries keyed by the normalized hostname or
 * subdomain. Client cookies, query parameters, or forged headers are NEVER trusted.
 */
export async function resolveStorefrontTenant(rawDomain: string): Promise<StorefrontResolutionResult> {
  const host = normalizeHostname(rawDomain);
  if (!host) {
    return { status: "NOT_FOUND", domain: rawDomain };
  }

  let resolvedStore: Store | null = null;

  // 1. Check if host has an extracted merchant subdomain (e.g. acme.storefy.shop, brand.localhost)
  const candidateSubdomain = extractSubdomain(host);

  if (candidateSubdomain) {
    const [found] = await db
      .select()
      .from(stores)
      .where(eq(stores.subdomain, candidateSubdomain))
      .limit(1);
    if (found) {
      resolvedStore = found;
    }
  }

  // 2. If not resolved via subdomain, try custom domain in store_domains
  if (!resolvedStore) {
    const [domainRecord] = await db
      .select({ store: stores })
      .from(storeDomains)
      .innerJoin(stores, eq(storeDomains.storeId, stores.id))
      .where(eq(storeDomains.domain, host))
      .limit(1);

    if (domainRecord?.store) {
      resolvedStore = domainRecord.store;
    }
  }

  // 3. Fallback: Check if host directly equals stores.customDomain or stores.subdomain
  // (Supports preview domains, direct slug paths in development, and custom domain on stores table)
  if (!resolvedStore) {
    const [fallbackStore] = await db
      .select()
      .from(stores)
      .where(eq(stores.subdomain, host))
      .limit(1);

    if (fallbackStore) {
      resolvedStore = fallbackStore;
    } else {
      const [customDomainStore] = await db
        .select()
        .from(stores)
        .where(eq(stores.customDomain, host))
        .limit(1);
      if (customDomainStore) {
        resolvedStore = customDomainStore;
      }
    }
  }

  // If no store matches the requested domain
  if (!resolvedStore) {
    return { status: "NOT_FOUND", domain: host };
  }

  // 4. Store Lifecycle State Evaluation
  // If store is explicitly inactive or status is SUSPENDED
  if (!resolvedStore.isActive || resolvedStore.status === "SUSPENDED") {
    return { status: "SUSPENDED", store: resolvedStore, domain: host };
  }

  // If store is undergoing maintenance
  if (resolvedStore.status === "MAINTENANCE") {
    return { status: "MAINTENANCE", store: resolvedStore, domain: host };
  }

  // 5. Store is ACTIVE: Fetch operational settings, active theme, and navigation
  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, resolvedStore.id))
    .limit(1);

  // Active theme
  const [activeTheme] = await db
    .select()
    .from(storeThemes)
    .where(and(eq(storeThemes.storeId, resolvedStore.id), eq(storeThemes.isActive, true)))
    .limit(1);

  // Navigation menus
  let navMenus: Navigation[] = [];
  try {
    const rawNav = await db
      .select()
      .from(navigation)
      .where(eq(navigation.storeId, resolvedStore.id));
    if (Array.isArray(rawNav)) {
      navMenus = rawNav;
    }
  } catch {
    navMenus = [];
  }

  const mainMenu = navMenus.find((m) => m?.handle === "main");
  const footerMenu = navMenus.find((m) => m?.handle === "footer");

  // Parse navigation items safely
  const parsedMainMenu: NavigationItem[] = Array.isArray(mainMenu?.items)
    ? (mainMenu.items as unknown as NavigationItem[])
    : [
        { id: "1", label: "Home", url: "/", order: 1 },
        { id: "2", label: "Products", url: "/products", order: 2 },
        { id: "3", label: "Collections", url: "/collections", order: 3 },
        { id: "4", label: "About", url: "/pages/about", order: 4 },
        { id: "5", label: "Contact", url: "/pages/contact", order: 5 },
      ];

  const parsedFooterMenu: NavigationItem[] = Array.isArray(footerMenu?.items)
    ? (footerMenu.items as unknown as NavigationItem[])
    : [
        { id: "1", label: "Home", url: "/", order: 1 },
        { id: "2", label: "Products", url: "/products", order: 2 },
        { id: "3", label: "About Us", url: "/pages/about", order: 3 },
        { id: "4", label: "Contact Us", url: "/pages/contact", order: 4 },
      ];

  const themeSettings = (activeTheme?.settingsSchema as StoreThemeSettings) || DEFAULT_THEME_SETTINGS;

  return {
    status: "ACTIVE",
    store: resolvedStore,
    settings: settings || null,
    theme: activeTheme || null,
    themeSettings,
    navigation: {
      main: parsedMainMenu,
      footer: parsedFooterMenu,
    },
    domain: host,
  };
}
