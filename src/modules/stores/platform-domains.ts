/**
 * Pure helper utilities for hostname normalization and platform domain routing.
 * Zero external database or node-specific dependencies for 100% Edge runtime compatibility.
 */

/**
 * Normalizes host strings by lowercasing, stripping ports, and removing trailing dots.
 */
export function normalizeHostname(rawHost: string): string {
  if (!rawHost) return "";
  let host = rawHost.trim().toLowerCase();
  if (host.includes(":")) {
    host = host.split(":")[0];
  }
  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  return host;
}

/**
 * Determines whether a normalized host is a platform apex/management domain
 * (e.g. localhost, storefy.shop, or Vercel preview/production deployments)
 * rather than a merchant custom domain or tenant storefront subdomain.
 */
export function isPlatformApexDomain(
  normalizedHost: string,
  rootDomain: string = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "storefy.shop"
): boolean {
  if (!normalizedHost) return false;

  const normalizedRoot = normalizeHostname(rootDomain);

  // 1. Localhost and loopback interfaces
  if (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "::1"
  ) {
    return true;
  }

  // 2. Production platform root and platform system subdomains
  if (
    normalizedHost === normalizedRoot ||
    normalizedHost === `www.${normalizedRoot}` ||
    normalizedHost === `dev.${normalizedRoot}` ||
    normalizedHost === `staging.${normalizedRoot}` ||
    normalizedHost === "storefy.shop" ||
    normalizedHost === "www.storefy.shop" ||
    normalizedHost === "dev.storefy.shop" ||
    normalizedHost === "staging.storefy.shop"
  ) {
    return true;
  }

  // 3. Vercel deployment preview / branch / production hosts (*.vercel.app)
  // Ensures preview deployment URLs (e.g. storefy-nc0iesgau-storefy1.vercel.app)
  // serve the platform dashboard and auth flows rather than failing tenant lookup.
  if (normalizedHost.endsWith(".vercel.app")) {
    return true;
  }

  // 4. Vercel environment variable matchers
  if (
    process.env.VERCEL_URL &&
    normalizedHost === normalizeHostname(process.env.VERCEL_URL)
  ) {
    return true;
  }
  if (
    process.env.VERCEL_BRANCH_URL &&
    normalizedHost === normalizeHostname(process.env.VERCEL_BRANCH_URL)
  ) {
    return true;
  }
  if (
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    normalizedHost === normalizeHostname(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a request pathname targets internal platform routes
 * (API, Dashboard, Authentication) which must never be rewritten to a storefront.
 */
export function isInternalOrSystemRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/onboarding")
  );
}
