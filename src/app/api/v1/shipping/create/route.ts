import { NextRequest, NextResponse } from "next/server";
import { createOrderShipment } from "@/modules/shipping/shipping-service";
import { CreateCarrierShipmentSchema } from "@/modules/shipping/validation";
import { getTenantContext } from "@/core/tenant/context";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const validated = CreateCarrierShipmentSchema.parse(body);

    const shipment = await createOrderShipment(
      tenant.store.id,
      validated.orderId,
      validated.carrier as "SHIPROCKET" | "DELHIVERY" | "MANUAL",
      validated.fulfillmentId,
      validated.weightGrams
    );

    return NextResponse.json({ success: true, data: shipment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create shipment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
