import { db } from "../../database/client";
import { stores, storeDomains } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  normalizeHostname,
  isPlatformApexDomain,
  isInternalOrSystemRoute,
} from "./platform-domains";

export { normalizeHostname, isPlatformApexDomain, isInternalOrSystemRoute };

export interface ResolvedTenant {
  storeId: string;
  organizationId: string;
  storeName: string;
  subdomain: string;
  customDomain: string | null;
  isCustomDomain: boolean;
  isActive: boolean;
}

/**
 * Extracts candidate subdomain from host if it matches platform pattern.
 * e.g., "my-brand.storefy.shop" -> "my-brand"
 * e.g., "demo.localhost" -> "demo"
 */
export function extractSubdomain(normalizedHost: string, baseDomain = "storefy.shop"): string | null {
  if (!normalizedHost) return null;

  // Local development: e.g. demo.localhost
  if (normalizedHost.endsWith(".localhost")) {
    const parts = normalizedHost.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      return parts[0];
    }
  }

  // Production/Staging platform domain: e.g. demo.storefy.shop
  if (normalizedHost.endsWith(`.${baseDomain}`)) {
    const prefix = normalizedHost.slice(0, -(baseDomain.length + 1));
    if (prefix && prefix !== "www" && !prefix.includes(".")) {
      return prefix;
    }
  }

  return null;
}

/**
 * Resolves a store and its organization by normalized hostname or subdomain.
 */
export async function resolveStoreByHost(rawHost: string): Promise<ResolvedTenant | null> {
  const host = normalizeHostname(rawHost);
  if (!host) return null;

  const candidateSubdomain = extractSubdomain(host);

  // 1. Try subdomain lookup if candidate detected
  if (candidateSubdomain) {
    const [store] = await db
      .select({
        id: stores.id,
        organizationId: stores.organizationId,
        name: stores.name,
        subdomain: stores.subdomain,
        customDomain: stores.customDomain,
        isActive: stores.isActive,
      })
      .from(stores)
      .where(eq(stores.subdomain, candidateSubdomain))
      .limit(1);

    if (store) {
      return {
        storeId: store.id,
        organizationId: store.organizationId,
        storeName: store.name,
        subdomain: store.subdomain,
        customDomain: store.customDomain,
        isCustomDomain: false,
        isActive: store.isActive,
      };
    }
  }

  // 2. Try custom domain lookup
  const [domainRecord] = await db
    .select({
      storeId: storeDomains.storeId,
      sslStatus: storeDomains.sslStatus,
      store: stores,
    })
    .from(storeDomains)
    .innerJoin(stores, eq(storeDomains.storeId, stores.id))
    .where(eq(storeDomains.domain, host))
    .limit(1);

  if (domainRecord && domainRecord.store) {
    return {
      storeId: domainRecord.store.id,
      organizationId: domainRecord.store.organizationId,
      storeName: domainRecord.store.name,
      subdomain: domainRecord.store.subdomain,
      customDomain: host,
      isCustomDomain: true,
      isActive: domainRecord.store.isActive,
    };
  }

  return null;
}
