/**
 * Generates dynamic robots.txt content for storefronts.
 * Blocks private and merchant administrative paths while allowing public catalog resources (TEST 10).
 */
export function generateStorefrontRobotsTxt(domain: string): string {
  return `# STOREFY Search Engine Directives for ${domain}
User-agent: *
Disallow: /dashboard/
Disallow: /account/
Disallow: /cart/
Disallow: /checkout/
Disallow: /api/
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

Allow: /
Allow: /products/
Allow: /collections/
Allow: /pages/

Sitemap: https://${domain}/sitemap.xml
`;
}
