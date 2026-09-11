import { NextRequest, NextResponse } from "next/server";
import { verifyOrderPayment } from "@/modules/payments/payment-service";
import { VerifyPaymentSchema } from "@/modules/payments/validation";
import { db } from "@/database/client";
import { orders } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = VerifyPaymentSchema.parse(body);

    // Look up storeId from order
    const [order] = await db
      .select({ storeId: orders.storeId })
      .from(orders)
      .where(eq(orders.id, validated.orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const result = await verifyOrderPayment(order.storeId, validated);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
