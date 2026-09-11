import { NextRequest, NextResponse } from "next/server";
import { handleCarrierWebhook } from "@/modules/shipping/shipping-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await handleCarrierWebhook("SHIPROCKET", rawBody, headers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Shiprocket webhook failure" },
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
