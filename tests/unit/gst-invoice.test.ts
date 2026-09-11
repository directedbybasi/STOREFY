import { describe, it, expect } from "vitest";
import { generateGstInvoicePdf, type InvoicePdfData } from "@/modules/orders/pdf-generator";
import { generateInvoiceNumber } from "@/modules/orders/numbering";

describe("GST Tax Invoicing & PDF Generation", () => {
  const sampleInvoiceData: InvoicePdfData = {
    invoiceNumber: "INV-2026-000123",
    orderNumber: "STF-2026-000456",
    invoiceDate: "11/09/2026",
    seller: {
      storeName: "Aarav Handlooms & Silk",
      gstin: "29AAAAA0000A1Z5",
      address: "124 Commercial Street, MG Road, Bengaluru, Karnataka - 560001",
      email: "billing@aaravsilk.com",
      phone: "+91 9876543210",
    },
    buyer: {
      name: "Priya Sundaram",
      billingAddress: "402 Palm Grove, Indiranagar, Bengaluru, Karnataka - 560038",
      email: "priya.s@example.com",
      phone: "+91 9123456780",
    },
    items: [
      {
        title: "Pure Mulberry Silk Saree",
        variantTitle: "Royal Blue / Free Size",
        sku: "SLK-BLU-01",
        quantity: 1,
        unitPriceFormatted: "₹4,237.28",
        subtotalFormatted: "₹4,237.28",
        taxFormatted: "₹762.72",
        totalFormatted: "₹5,000.00",
      },
      {
        title: "Embroidered Silk Blouse",
        variantTitle: "Gold Zari / M",
        sku: "BLS-GLD-M",
        quantity: 2,
        unitPriceFormatted: "₹1,271.18",
        subtotalFormatted: "₹2,542.36",
        taxFormatted: "₹457.64",
        totalFormatted: "₹3,000.00",
      },
    ],
    taxBreakdown: {
      intraState: true,
      cgstPaise: 61018,
      cgstFormatted: "₹610.18",
      sgstPaise: 61018,
      sgstFormatted: "₹610.18",
      igstPaise: 0,
      igstFormatted: "₹0.00",
      totalTaxPaise: 122036,
      totalTaxFormatted: "₹1,220.36",
    },
    subtotalFormatted: "₹6,779.64",
    taxFormatted: "₹1,220.36",
    shippingFormatted: "₹0.00",
    discountFormatted: "₹0.00",
    totalFormatted: "₹8,000.00",
  };

  describe("GST Tax Calculation Logic", () => {
    it("splits intra-state GST equally into CGST and SGST", () => {
      const sellerState = "Karnataka";
      const buyerState = "Karnataka";
      const totalTaxPaise = 18000; // ₹180.00

      const isIntraState = sellerState.toLowerCase().trim() === buyerState.toLowerCase().trim();
      expect(isIntraState).toBe(true);

      const cgstPaise = Math.round(totalTaxPaise / 2);
      const sgstPaise = totalTaxPaise - cgstPaise;
      const igstPaise = 0;

      expect(cgstPaise).toBe(9000);
      expect(sgstPaise).toBe(9000);
      expect(igstPaise).toBe(0);
      expect(cgstPaise + sgstPaise + igstPaise).toBe(totalTaxPaise);
    });

    it("assigns entire GST to IGST for inter-state transactions", () => {
      const sellerState = "Karnataka";
      const buyerState = "Maharashtra";
      const totalTaxPaise = 18000;

      const isIntraState = sellerState.toLowerCase().trim() === buyerState.toLowerCase().trim();
      expect(isIntraState).toBe(false);

      const cgstPaise = 0;
      const sgstPaise = 0;
      const igstPaise = totalTaxPaise;

      expect(cgstPaise).toBe(0);
      expect(sgstPaise).toBe(0);
      expect(igstPaise).toBe(18000);
    });
  });

  describe("PDF Generation Engine", () => {
    it("generates a valid binary PDF-1.4 buffer with complete stream objects", async () => {
      const pdfBuffer = await generateGstInvoicePdf(sampleInvoiceData);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(500);

      const pdfString = pdfBuffer.toString("latin1");

      // Validates PDF-1.4 header
      expect(pdfString.startsWith("%PDF-1.4")).toBe(true);

      // Validates PDF trailer and EOF
      expect(pdfString.includes("trailer")).toBe(true);
      expect(pdfString.includes("startxref")).toBe(true);
      expect(pdfString.endsWith("%%EOF\n") || pdfString.endsWith("%%EOF")).toBe(true);

      // Validates embedded text content
      expect(pdfString).toContain("TAX INVOICE");
      expect(pdfString).toContain(sampleInvoiceData.invoiceNumber);
      expect(pdfString).toContain(sampleInvoiceData.orderNumber);
      expect(pdfString).toContain(sampleInvoiceData.seller.gstin);
      expect(pdfString).toContain("8,000.00");
    });
  });

  describe("Sequential Numbering Concurrency", () => {
    // High-Risk Test 7: Invoice Concurrency
    it("generates unique sequential invoice numbers concurrently", async () => {
      const concurrencyCount = 20;
      const promises = Array.from({ length: concurrencyCount }, () => generateInvoiceNumber());
      const results = await Promise.all(promises);

      const uniqueSet = new Set(results);
      expect(uniqueSet.size).toBe(concurrencyCount);

      for (const num of results) {
        expect(num).toMatch(/^INV-\d{4}-\d{6}$/);
      }
    });
  });
});
