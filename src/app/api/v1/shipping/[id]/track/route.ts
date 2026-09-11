import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { shipments, shipmentTrackingEvents } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id))
      .limit(1);

    if (!shipment) {
      return NextResponse.json({ success: false, error: "Shipment not found" }, { status: 404 });
    }

    const events = await db
      .select()
      .from(shipmentTrackingEvents)
      .where(eq(shipmentTrackingEvents.shipmentId, id))
      .orderBy(desc(shipmentTrackingEvents.timestamp));

    return NextResponse.json({
      success: true,
      data: {
        shipment: {
          id: shipment.id,
          carrier: shipment.carrier,
          awb: shipment.awb,
          status: shipment.carrierStatus,
          rtoState: shipment.rtoState,
          trackingUrl: shipment.trackingUrl,
          labelUrl: shipment.labelUrl,
        },
        events,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to track shipment";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
