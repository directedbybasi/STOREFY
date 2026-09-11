import { formatPaiseToRupees } from "@/lib/currency";

/**
 * Normalizes an Indian/international phone number strictly into digits without '+' or symbols.
 * Defaults to prepending '91' for 10-digit Indian numbers.
 * Rejects numbers containing forbidden characters to prevent injection (TEST 11).
 */
export function normalizeWhatsAppPhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;

  // Reject CRLF or script injection attempts
  if (/[\r\n\0<>]/.test(phone)) {
    return null;
  }

  // Strip all whitespace, hyphens, parentheses, plus
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly;
  }

  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return digitsOnly;
  }

  return null;
}

export interface WhatsAppOrderMessageParams {
  storeName: string;
  productTitle: string;
  variantTitle?: string;
  pricePaise: number;
  quantity?: number;
  domain?: string;
}

/**
 * Generates a sanitized, injection-proof WhatsApp Click-to-Chat URL for ordering a product.
 */
export function generateWhatsAppOrderUrl(
  phoneNumber: string,
  params: WhatsAppOrderMessageParams
): string | null {
  const normalizedPhone = normalizeWhatsAppPhone(phoneNumber);
  if (!normalizedPhone) return null;

  const qty = params.quantity && params.quantity > 0 ? params.quantity : 1;
  const variant = params.variantTitle && params.variantTitle !== "Default Variant"
    ? ` (${params.variantTitle})`
    : "";
  const price = formatPaiseToRupees(params.pricePaise * qty);

  const message = `Hello ${params.storeName}, I would like to order:
• Item: ${params.productTitle}${variant}
• Qty: ${qty}
• Total: ${price}

Please confirm availability and delivery details. Thank you!`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a sanitized WhatsApp Click-to-Chat URL for general customer support.
 */
export function generateWhatsAppSupportUrl(
  phoneNumber: string,
  storeName: string
): string | null {
  const normalizedPhone = normalizeWhatsAppPhone(phoneNumber);
  if (!normalizedPhone) return null;

  const message = `Hello ${storeName}, I have a question regarding my order / shopping on your store.`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
