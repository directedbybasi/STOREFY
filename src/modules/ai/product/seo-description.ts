import type { AIProvider, ProductToolContext, SeoDescriptionResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { SeoDescriptionOutputSchema, sanitizeToPlainText, validateSafeClaims } from "../core/validation";

/**
 * Tool 3: AI SEO Description
 * Generates concise, search-engine-optimized meta descriptions under 160 characters.
 */
export async function generateSeoDescription(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: SeoDescriptionResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Generate a concise, click-worthy, factual SEO meta description.
RULES:
1. MUST be under 160 characters.
2. Incorporate key product attributes naturally without keyword stuffing.
3. No fake discounts or unsupported claims.
4. Return JSON adhering to: { "seoDescription": "..." }`,
    userPrompt: `TOOL: AI_SEO_DESCRIPTION\nGenerate an SEO meta description for this product:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    SeoDescriptionOutputSchema
  );

  let clean = sanitizeToPlainText(data.seoDescription);
  if (clean.length > 160) {
    clean = clean.slice(0, 157).trim() + "...";
  }
  validateSafeClaims(clean);

  return {
    result: { seoDescription: clean },
    inputTokens,
    outputTokens,
  };
}
