import type { InvoiceDTO } from "./types";

export interface InvoicePdfData {
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate?: string;
  seller: {
    storeName: string;
    gstin?: string | null;
    address: string;
    email?: string | null;
    phone?: string | null;
  };
  buyer: {
    name: string;
    billingAddress:
      | string
      | {
          name?: string;
          phone?: string;
          addressLine1?: string;
          addressLine2?: string | null;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
    email?: string | null;
    phone?: string | null;
  };
  items?: Array<{
    title: string;
    variantTitle?: string;
    sku?: string | null;
    quantity: number;
    unitPriceFormatted: string;
    subtotalFormatted: string;
    taxFormatted?: string;
    totalFormatted: string;
  }>;
  taxBreakdown: {
    intraState?: boolean;
    isInterState?: boolean;
    ratePercent?: number;
    cgstPaise?: number;
    cgstFormatted?: string;
    sgstPaise?: number;
    sgstFormatted?: string;
    igstPaise?: number;
    igstFormatted?: string;
    totalTaxPaise?: number;
    totalTaxFormatted?: string;
  };
  subtotalFormatted: string;
  taxFormatted: string;
  shippingFormatted?: string;
  discountFormatted?: string;
  totalFormatted: string;
}

/**
 * Pure TypeScript PDF-1.4 Generator for GST-Compliant Tax Invoices.
 * Produces standards-compliant vector PDF buffers without external native or browser dependencies.
 */
export function generateInvoicePdf(invoice: InvoiceDTO, orderNumber: string): Buffer {
  const data: InvoicePdfData = {
    invoiceNumber: invoice.invoiceNumber,
    orderNumber,
    invoiceDate: new Date(invoice.createdAt).toLocaleDateString("en-IN"),
    seller: {
      storeName: invoice.sellerDetails.storeName,
      gstin: invoice.sellerDetails.gstin,
      address: invoice.sellerDetails.address,
      email: invoice.sellerDetails.email,
      phone: invoice.sellerDetails.phone,
    },
    buyer: {
      name: invoice.buyerDetails.name,
      billingAddress: invoice.buyerDetails.billingAddress,
      email: invoice.buyerDetails.email,
      phone: invoice.buyerDetails.phone,
    },
    taxBreakdown: invoice.taxBreakdown,
    subtotalFormatted: invoice.subtotalFormatted,
    taxFormatted: invoice.taxFormatted,
    shippingFormatted: invoice.shippingFormatted,
    totalFormatted: invoice.totalFormatted,
  };

  return generateGstInvoicePdf(data);
}

export function generateGstInvoicePdf(data: InvoicePdfData): Buffer {
  const streamCommands: string[] = [];

  const escapePdfText = (text: string) =>
    (text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, " "); // Replace non-ascii chars safely for PDF standard fonts

  // Helper to draw text
  const drawText = (
    text: string,
    x: number,
    y: number,
    fontSize = 10,
    font = "/F1",
    gray = 0
  ) => {
    streamCommands.push(
      `BT ${font} ${fontSize} Tf ${gray} g ${x} ${y} Td (${escapePdfText(text)}) Tj ET`
    );
  };

  // Helper to draw horizontal line
  const drawLine = (x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5) => {
    streamCommands.push(`${lineWidth} w 0.8 G ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  // Helper to draw filled rectangle
  const drawRect = (x: number, y: number, w: number, h: number, gray = 0.95) => {
    streamCommands.push(`${gray} g ${x} ${y} ${w} ${h} re f`);
  };

  // Page Header (Top margin at y = 800)
  drawText("TAX INVOICE", 440, 790, 16, "/F2", 0.1);
  drawText("(Original for Recipient)", 440, 775, 8, "/F1", 0.4);

  // Seller Details (Left column)
  drawText(data.seller.storeName || "STOREFY MERCHANT", 50, 790, 14, "/F2", 0);
  drawText(`GSTIN: ${data.seller.gstin || "29AAAAA0000A1Z5"}`, 50, 775, 9, "/F1", 0.2);
  drawText(`Address: ${data.seller.address || "Main Market Road"}`, 50, 762, 8, "/F1", 0.3);
  if (data.seller.email) {
    drawText(`Email: ${data.seller.email}`, 50, 750, 8, "/F1", 0.3);
  }

  // Invoice & Order Metadata Box (Right column)
  drawRect(350, 685, 200, 55, 0.96);
  drawLine(350, 685, 550, 685, 0.5);
  drawText(`Invoice No:`, 360, 725, 9, "/F2", 0);
  drawText(data.invoiceNumber, 440, 725, 9, "/F1", 0.1);
  drawText(`Invoice Date:`, 360, 710, 9, "/F2", 0);
  drawText(data.invoiceDate || new Date().toLocaleDateString("en-IN"), 440, 710, 9, "/F1", 0.1);
  drawText(`Order No:`, 360, 695, 9, "/F2", 0);
  drawText(data.orderNumber, 440, 695, 9, "/F1", 0.1);

  // Buyer Details Box
  drawRect(50, 685, 280, 55, 0.96);
  drawText(`Bill To:`, 60, 725, 9, "/F2", 0);
  drawText(data.buyer.name || "Customer", 110, 725, 9, "/F1", 0.1);

  const rawAddr = data.buyer.billingAddress;
  const addrStr =
    typeof rawAddr === "string"
      ? rawAddr
      : `${rawAddr?.addressLine1 || ""}, ${rawAddr?.city || ""}, ${rawAddr?.state || ""} - ${rawAddr?.postalCode || ""}`;

  drawText(addrStr.slice(0, 45), 60, 710, 8, "/F1", 0.3);
  if (data.buyer.phone) {
    drawText(`Phone: ${data.buyer.phone}`, 60, 695, 8, "/F1", 0.3);
  }

  // Line Items Table Header (y = 650)
  drawRect(50, 640, 500, 20, 0.15);
  streamCommands.push(`1 g`); // White text for header
  streamCommands.push(`BT /F2 9 Tf 60 646 Td (Item Description) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 300 646 Td (Qty) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 360 646 Td (Unit Price) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 480 646 Td (Total Amount) Tj ET`);

  let currentY = 620;

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      drawText(item.title.slice(0, 35), 60, currentY, 9, "/F1", 0.1);
      drawText(String(item.quantity), 310, currentY, 9, "/F1", 0.1);
      drawText(item.unitPriceFormatted, 360, currentY, 9, "/F1", 0.1);
      drawText(item.totalFormatted, 480, currentY, 9, "/F1", 0.1);
      currentY -= 15;
      drawLine(50, currentY + 5, 550, currentY + 5, 0.5);
    }
  } else {
    // Default single summary row
    drawText("Merchandise Products (Tax Inclusive)", 60, currentY, 9, "/F1", 0.1);
    drawText("1", 310, currentY, 9, "/F1", 0.1);
    drawText(data.subtotalFormatted, 360, currentY, 9, "/F1", 0.1);
    drawText(data.subtotalFormatted, 480, currentY, 9, "/F1", 0.1);
    currentY -= 15;
    drawLine(50, currentY + 5, 550, currentY + 5, 0.5);
  }

  currentY -= 20;

  // Financial Breakdown Box (Right aligned)
  const summaryX = 350;
  drawText("Subtotal:", summaryX, currentY, 9, "/F1", 0.2);
  drawText(data.subtotalFormatted, 480, currentY, 9, "/F1", 0.1);
  currentY -= 15;

  if (data.shippingFormatted && data.shippingFormatted !== "₹0.00") {
    drawText("Shipping & Handling:", summaryX, currentY, 9, "/F1", 0.2);
    drawText(data.shippingFormatted, 480, currentY, 9, "/F1", 0.1);
    currentY -= 15;
  }

  // GST Breakdown
  const isInter = data.taxBreakdown.isInterState || !data.taxBreakdown.intraState;
  if (isInter) {
    drawText(
      `IGST (${data.taxBreakdown.ratePercent || 18}%):`,
      summaryX,
      currentY,
      8,
      "/F1",
      0.3
    );
    drawText(
      data.taxBreakdown.igstFormatted || data.taxFormatted,
      480,
      currentY,
      8,
      "/F1",
      0.2
    );
    currentY -= 14;
  } else {
    const halfRate = (data.taxBreakdown.ratePercent || 18) / 2;
    drawText(`CGST (${halfRate}%):`, summaryX, currentY, 8, "/F1", 0.3);
    drawText(
      data.taxBreakdown.cgstFormatted || data.taxFormatted,
      480,
      currentY,
      8,
      "/F1",
      0.2
    );
    currentY -= 14;

    drawText(`SGST (${halfRate}%):`, summaryX, currentY, 8, "/F1", 0.3);
    drawText(
      data.taxBreakdown.sgstFormatted || data.taxFormatted,
      480,
      currentY,
      8,
      "/F1",
      0.2
    );
    currentY -= 14;
  }

  drawLine(summaryX, currentY + 5, 550, currentY + 5, 1);
  currentY -= 8;

  // Grand Total Row
  drawRect(summaryX, currentY - 6, 200, 22, 0.93);
  drawText("Grand Total (INR):", summaryX + 8, currentY, 11, "/F2", 0);
  drawText(data.totalFormatted, 470, currentY, 11, "/F2", 0);

  // Footer / Declaration
  currentY -= 60;
  drawText("Declaration:", 50, currentY, 8, "/F2", 0.2);
  currentY -= 12;
  drawText(
    "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    50,
    currentY,
    7,
    "/F1",
    0.4
  );
  currentY -= 40;
  drawLine(400, currentY + 15, 530, currentY + 15, 0.5);
  drawText("Authorized Signatory", 420, currentY, 8, "/F1", 0.3);

  // Construct standard PDF 1.4 structure
  const contentStream = streamCommands.join("\n");
  const streamLength = Buffer.byteLength(contentStream, "utf-8");

  const pdfObjects = [
    // 1: Catalog
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    // 2: Pages
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`,
    // 4: Content Stream
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`,
    // 5: Normal Font (Helvetica)
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    // 6: Bold Font (Helvetica-Bold)
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
  ];

  const xrefOffsets: number[] = [0];

  let body = "%PDF-1.4\n";
  for (const obj of pdfObjects) {
    xrefOffsets.push(Buffer.byteLength(body, "utf-8"));
    body += obj + "\n";
  }

  const xrefOffset = Buffer.byteLength(body, "utf-8");
  let xref = `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= pdfObjects.length; i++) {
    xref += String(xrefOffsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, "utf-8");
}
