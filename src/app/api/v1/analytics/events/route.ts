import { NextRequest, NextResponse } from "next/server";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { recordAnalyticsEvent } from "@/modules/marketing/analytics/analytics-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain, ...payload } = body;

    if (!domain) {
      return NextResponse.json({ success: false, error: "Domain parameter required." }, { status: 400 });
    }

    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Store not active." }, { status: 404 });
    }

    await recordAnalyticsEvent({
      storeId: resolution.store.id,
      sessionId: payload.sessionId || "anonymous",
      eventName: payload.eventName,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      metadata: payload.metadata,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmContent: payload.utmContent,
      utmTerm: payload.utmTerm,
      referrer: payload.referrer,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
