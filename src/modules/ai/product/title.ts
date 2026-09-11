import type { AIProvider, ProductToolContext, ProductTitleResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { ProductTitleOutputSchema, sanitizeToPlainText, validateSafeClaims } from "../core/validation";

/**
 * Tool 1: AI Product Title
 * Generates 1-5 improved, high-converting, factual product title suggestions.
 */
export async function generateProductTitleSuggestions(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: ProductTitleResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Generate 3 to 5 clear, compelling, and factual product title suggestions.
RULES:
1. Do NOT keyword-stuff.
2. Do NOT invent fake brands, certifications, or materials not in the data.
3. Keep titles between 15 and 150 characters.
4. Avoid emojis unless the merchant note explicitly requests them.
5. Return JSON adhering to: { "suggestions": ["Title 1", "Title 2", "Title 3"] }`,
    userPrompt: `TOOL: AI_PRODUCT_TITLE\nAnalyze the following product data and generate title suggestions:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    ProductTitleOutputSchema
  );

  // Sanitize and validate claims
  const sanitizedSuggestions = data.suggestions.map((t) => {
    const clean = sanitizeToPlainText(t);
    validateSafeClaims(clean);
    return clean;
  });

  return {
    result: { suggestions: sanitizedSuggestions },
    inputTokens,
    outputTokens,
  };
}
