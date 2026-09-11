import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { AI_TOOLS, type AiToolType } from "./types";
import { AIUnauthorizedToolError, AIValidationError } from "./errors";

/**
 * 1. AI Tool Whitelist Guard
 * Strictly permits only the 7 approved tools.
 */
export function validateAiToolWhitelist(tool: string): asserts tool is AiToolType {
  if (!AI_TOOLS.includes(tool as AiToolType)) {
    throw new AIUnauthorizedToolError(tool);
  }
}

/**
 * 2. Text Sanitization (XSS Prevention)
 */
export function sanitizeAiText(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
}

/**
 * Strips all HTML to pure text.
 */
export function sanitizeToPlainText(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

/**
 * 3. Disallowed Medical / Extreme Guarantees Checker
 */
const DISALLOWED_CLAIM_PATTERNS = [
  /\b(cure|cures|curing) (cancer|diabetes|covid|aids|disease)\b/i,
  /\b100% guaranteed (cure|healing|medical recovery)\b/i,
  /\bfda approved cure\b/i,
  /\bfake certification\b/i,
  /\bguaranteed return on investment\b/i,
];

export function validateSafeClaims(text: string): void {
  for (const pattern of DISALLOWED_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      throw new AIValidationError("AI output flagged for containing unsupported or prohibited medical/financial claims.");
    }
  }
}

/**
 * 4. Tool Output Schemas
 */

// Tool 1: AI Product Title
export const ProductTitleOutputSchema = z.object({
  suggestions: z
    .array(z.string().min(3).max(200))
    .min(1)
    .max(5)
    .describe("Set of 1 to 5 improved factual product title suggestions"),
});

// Tool 2: AI Product Description
export const ProductDescriptionOutputSchema = z.object({
  summary: z.string().min(10).max(500),
  paragraphs: z.array(z.string().min(10).max(1000)).min(1).max(5),
  bulletPoints: z.array(z.string().min(3).max(250)).min(2).max(10),
});

// Tool 3: AI SEO Description
export const SeoDescriptionOutputSchema = z.object({
  seoDescription: z
    .string()
    .min(20)
    .max(160)
    .describe("Concise meta description up to 160 characters"),
});

// Tool 4: AI Product Features
export const ProductFeaturesOutputSchema = z.object({
  features: z
    .array(z.string().min(3).max(200))
    .min(1)
    .max(10)
    .describe("List of 1 to 10 key product features"),
});

// Tool 5: AI Product Specifications
export const SpecificationConfidenceSchema = z.enum(["SUPPORTED", "INFERRED", "UNKNOWN"]);

export const ProductSpecificationsOutputSchema = z.object({
  specifications: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(200),
        confidence: SpecificationConfidenceSchema,
      })
    )
    .min(1)
    .max(30),
});

// Tool 6: AI Product Tags
export const ProductTagsOutputSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-zA-Z0-9\s-_]+$/, "Tags should only contain alphanumeric characters, hyphens or spaces")
    )
    .min(1)
    .max(20)
    .describe("List of 1 to 20 relevant product tags"),
});

// Tool 7: AI Category Suggestion
export const CategorySuggestionOutputSchema = z.object({
  suggestedCategoryId: z.string().uuid().nullable(),
  suggestedCategoryName: z.string().min(1).max(200).nullable(),
  path: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  matchStatus: z.enum(["MATCHED", "NO_CONFIDENT_MATCH"]),
});

/**
 * Input Size Limit Validations (Denial of Service Prevention)
 */
export const AiToolInputLimitsSchema = z.object({
  currentTitle: z.string().max(500).optional(),
  currentDescription: z.string().max(10000).optional(),
  merchantGuidance: z.string().max(1000).optional(),
});
