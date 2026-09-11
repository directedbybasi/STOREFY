import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { invoices, orders } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getInvoiceByOrderId, buildInvoiceDTO } from "@/modules/orders/invoice-service";
import { generateInvoicePdf } from "@/modules/orders/pdf-generator";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/invoices/[id]/pdf
 * Streams GST Tax Invoice PDF for an order.
 */
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  // Find by order_id or invoice_id
  let [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, id))
    .limit(1);

  if (!invoice) {
    [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
  }

  if (!invoice) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, invoice.orderId))
    .limit(1);

  const invoiceDTO = buildInvoiceDTO(invoice);
  const pdfBuffer = generateInvoicePdf(invoiceDTO, order?.orderNumber || "ORD");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Tax-Invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
