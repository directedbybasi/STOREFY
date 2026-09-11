import type { AIProvider, ProductToolContext, ProductDescriptionResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import {
  ProductDescriptionOutputSchema,
  sanitizeAiText,
  sanitizeToPlainText,
  validateSafeClaims,
} from "../core/validation";

/**
 * Tool 2: AI Product Description
 * Generates customer-facing, high-converting, truthful descriptions with structured paragraphs & bullet points.
 */
export async function generateProductDescription(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: ProductDescriptionResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Generate an engaging, structured, and factual e-commerce product description.
RULES:
1. Do NOT invent medical benefits, cures, fake certifications, or fake warranties.
2. Structure into:
   - "summary": 1-2 sentence hook.
   - "paragraphs": 2-3 readable, informative paragraphs describing usability and lifestyle fit.
   - "bulletPoints": 3-6 distinct selling points supported by the product facts.
3. Return JSON adhering to: { "summary": "...", "paragraphs": ["..."], "bulletPoints": ["..."] }`,
    userPrompt: `TOOL: AI_PRODUCT_DESCRIPTION\nGenerate a description for this product:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    ProductDescriptionOutputSchema
  );

  // Sanitize and validate claims
  const summary = sanitizeToPlainText(data.summary);
  validateSafeClaims(summary);

  const paragraphs = data.paragraphs.map((p) => {
    const clean = sanitizeAiText(p);
    validateSafeClaims(clean);
    return clean;
  });

  const bulletPoints = data.bulletPoints.map((b) => {
    const clean = sanitizeToPlainText(b);
    validateSafeClaims(clean);
    return clean;
  });

  return {
    result: {
      summary,
      paragraphs,
      bulletPoints,
    },
    inputTokens,
    outputTokens,
  };
}
