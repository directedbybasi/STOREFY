import { NextRequest, NextResponse } from "next/server";
import { initiateOrderPayment } from "@/modules/payments/payment-service";
import { getTenantContext } from "@/core/tenant/context";
import { InitiatePaymentSchema } from "@/modules/payments/validation";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const validated = InitiatePaymentSchema.parse(body);

    const result = await initiateOrderPayment(
      tenant.store.id,
      validated.orderId,
      validated.provider,
      validated.idempotencyKey
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initiate payment";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
