import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/modules/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await handlePaymentWebhook("CASHFREE", rawBody, headers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Cashfree webhook signature failure" },
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
