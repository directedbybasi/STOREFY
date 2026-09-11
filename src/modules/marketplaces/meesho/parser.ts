import type { ProductReferenceValidation } from "../core/types";

/**
 * Parses and validates a Meesho product reference (URL or product ID/code).
 *
 * Supported formats:
 * - https://www.meesho.com/s/p/3b2a1
 * - https://meesho.com/trendy-kurti/p/3b2a1?utm_source=...
 * - https://www.meesho.com/product/123456
 * - Direct codes: 3b2a1, msh-123456, 123456
 */
export function parseMeeshoReference(input: string): ProductReferenceValidation {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: false,
      marketplace: "MEESHO",
      canonicalReference: "",
      error: "Product reference input cannot be empty.",
    };
  }

  // Check if input is a URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const hostname = url.hostname.toLowerCase();

      if (!hostname.endsWith("meesho.com")) {
        return {
          isValid: false,
          marketplace: "MEESHO",
          canonicalReference: trimmed,
          error: "Invalid domain. Only official meesho.com URLs are supported.",
        };
      }

      // Pattern 1: /s/p/<id> or /<slug>/p/<id>
      const pMatch = url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/i);
      if (pMatch && pMatch[1]) {
        const id = pMatch[1];
        return {
          isValid: true,
          marketplace: "MEESHO",
          canonicalReference: `https://www.meesho.com/s/p/${id}`,
          sourceProductId: id,
        };
      }

      // Pattern 2: /product/<id>
      const prodMatch = url.pathname.match(/\/product\/([a-zA-Z0-9_-]+)/i);
      if (prodMatch && prodMatch[1]) {
        const id = prodMatch[1];
        return {
          isValid: true,
          marketplace: "MEESHO",
          canonicalReference: `https://www.meesho.com/s/p/${id}`,
          sourceProductId: id,
        };
      }

      return {
        isValid: false,
        marketplace: "MEESHO",
        canonicalReference: trimmed,
        error: "Could not identify a valid Meesho product code in the provided URL.",
      };
    } catch {
      return {
        isValid: false,
        marketplace: "MEESHO",
        canonicalReference: trimmed,
        error: "Malformed URL format.",
      };
    }
  }

  // Direct product code / ID (alphanumeric, e.g. 3b2a1, 123456, msh-789)
  const codeRegex = /^[a-zA-Z0-9_-]{3,64}$/;
  if (codeRegex.test(trimmed)) {
    return {
      isValid: true,
      marketplace: "MEESHO",
      canonicalReference: `https://www.meesho.com/s/p/${trimmed}`,
      sourceProductId: trimmed,
    };
  }

  return {
    isValid: false,
    marketplace: "MEESHO",
    canonicalReference: trimmed,
    error: "Invalid Meesho product ID or code. Must be alphanumeric (3-64 characters).",
  };
}
