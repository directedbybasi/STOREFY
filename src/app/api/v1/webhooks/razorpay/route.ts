import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/modules/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    // 1. Capture raw request body before any parsing
    const rawBody = await req.text();

    // 2. Extract headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // 3. Process webhook idempotently with timing-safe HMAC validation
    const result = await handlePaymentWebhook("RAZORPAY", rawBody, headers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Webhook signature or processing failure" },
        { status: 400 }
      );
    }

    return NextResponse.json({ status: "ok", duplicate: !!result.duplicate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
