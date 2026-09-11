import { NextRequest, NextResponse } from "next/server";
import { fetchLiveShippingRates } from "@/modules/shipping/shipping-service";
import { GetShippingRatesSchema } from "@/modules/shipping/validation";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";

export async function POST(req: NextRequest) {
  try {
    const domain = req.headers.get("x-storefront-domain") || req.nextUrl.searchParams.get("domain") || "demo-store";
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Store not found or inactive" }, { status: 404 });
    }
    const store = resolution.store;

    const body = await req.json();
    const validated = GetShippingRatesSchema.parse(body);

    const rates = await fetchLiveShippingRates(
      store.id,
      validated.destinationPostalCode,
      validated.weightGrams,
      validated.cod,
      validated.declaredValuePaise
    );

    return NextResponse.json({ success: true, data: rates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch rates";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
