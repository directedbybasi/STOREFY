import { NextRequest, NextResponse } from "next/server";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontSitemapXml } from "@/modules/marketing/seo/sitemap";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain } = await context.params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const sitemapXml = await generateStorefrontSitemapXml(resolution.store.id, domain);

  return new NextResponse(sitemapXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
