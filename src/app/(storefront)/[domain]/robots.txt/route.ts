import { NextRequest, NextResponse } from "next/server";
import { generateStorefrontRobotsTxt } from "@/modules/marketing/seo/robots";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain } = await context.params;
  const content = generateStorefrontRobotsTxt(domain);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
