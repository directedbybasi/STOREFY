import { db } from "@/database/client";
import { invoices, stores, orders, storeSettings } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "@/core/errors";
import { formatPaiseToRupees } from "@/modules/cart/service";
import { generateInvoiceNumber } from "./numbering";
import { generateInvoicePdf } from "./pdf-generator";
import type { InvoiceDTO, OrderDetailDTO } from "./types";
import type { InvoiceTaxBreakdown } from "@/database/schema/orders";

const DEFAULT_GST_RATE = 18; // Standard GST rate %

/**
 * Computes GST breakdown in integer Paise.
 */
export function calculateGstBreakdown(
  subtotalPaise: number,
  sellerState: string,
  buyerState: string,
  ratePercent = DEFAULT_GST_RATE
): InvoiceTaxBreakdown {
  const isInterState =
    sellerState.trim().toLowerCase() !== buyerState.trim().toLowerCase();

  // Assuming tax-inclusive pricing
  const taxableAmountPaise = Math.round((subtotalPaise * 100) / (100 + ratePercent));
  const totalTaxPaise = subtotalPaise - taxableAmountPaise;

  if (isInterState) {
    return {
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalTaxPaise,
      taxableAmountPaise,
      ratePercent,
      isInterState: true,
    };
  } else {
    const cgstPaise = Math.floor(totalTaxPaise / 2);
    const sgstPaise = totalTaxPaise - cgstPaise;
    return {
      cgstPaise,
      sgstPaise,
      igstPaise: 0,
      taxableAmountPaise,
      ratePercent,
      isInterState: false,
    };
  }
}

/**
 * Creates or returns existing GST tax invoice for an order.
 */
export async function createOrderInvoice(
  storeId: string,
  orderId: string
): Promise<InvoiceDTO> {
  // Check if invoice already exists (idempotency)
  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.storeId, storeId), eq(invoices.orderId, orderId)))
    .limit(1);

  if (existing) {
    return buildInvoiceDTO(existing);
  }

  // Load store details
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store) throw new NotFoundError("Store not found.");

  // Load order
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) throw new NotFoundError("Order not found.");

  const invoiceNumber = await generateInvoiceNumber(storeId);

  const sellerState = "Karnataka"; // Default merchant jurisdiction
  const buyerState = order.billingAddress?.state || "Karnataka";
  const taxBreakdown = calculateGstBreakdown(
    order.subtotalAmount,
    sellerState,
    buyerState
  );

  const sellerDetails = {
    storeName: store.name,
    gstin: "29AAAAA0000A1Z5", // Standard test GSTIN
    address: "MG Road, Bengaluru, Karnataka - 560001",
    email: "billing@" + store.slug + ".com",
    phone: "+91 80 1234 5678",
  };

  const buyerDetails = {
    name: order.customerSnapshot.fullName,
    billingAddress: order.billingAddress,
    email: order.customerSnapshot.email,
    phone: order.customerSnapshot.phone,
  };

  const [created] = await db
    .insert(invoices)
    .values({
      storeId,
      orderId,
      invoiceNumber,
      sellerDetails,
      buyerDetails,
      lineItems: [],
      taxBreakdown,
      subtotalAmount: order.subtotalAmount,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      pdfUrl: `/api/v1/invoices/${order.id}/pdf`,
    })
    .returning();

  return buildInvoiceDTO(created);
}

export async function getInvoiceByOrderId(
  storeId: string,
  orderId: string
): Promise<InvoiceDTO | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.storeId, storeId), eq(invoices.orderId, orderId)))
    .limit(1);

  if (!invoice) return null;
  return buildInvoiceDTO(invoice);
}

export function buildInvoiceDTO(invoice: typeof invoices.$inferSelect): InvoiceDTO {
  return {
    id: invoice.id,
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    sellerDetails: invoice.sellerDetails,
    buyerDetails: invoice.buyerDetails,
    taxBreakdown: invoice.taxBreakdown,
    subtotalPaise: invoice.subtotalAmount,
    subtotalFormatted: formatPaiseToRupees(invoice.subtotalAmount),
    taxPaise: invoice.taxAmount,
    taxFormatted: formatPaiseToRupees(invoice.taxAmount),
    shippingPaise: invoice.shippingAmount,
    shippingFormatted: formatPaiseToRupees(invoice.shippingAmount),
    totalPaise: invoice.totalAmount,
    totalFormatted: formatPaiseToRupees(invoice.totalAmount),
    createdAt: invoice.createdAt,
  };
}
