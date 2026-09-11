import type { AIProvider, ProductToolContext, ProductFeaturesResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { ProductFeaturesOutputSchema, sanitizeToPlainText, validateSafeClaims } from "../core/validation";

/**
 * Tool 4: AI Product Features
 * Extracts and formats structured product features as clear, customer-centric bullet points.
 */
export async function generateProductFeatures(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: ProductFeaturesResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Extract 3 to 8 key functional features and benefits of the product.
RULES:
1. Every feature MUST be supported by the provided product data.
2. Do NOT hallucinate technical certifications, water-resistance, battery life, or materials unless explicitly stated.
3. Keep each feature concise and easy to read.
4. Return JSON adhering to: { "features": ["Feature 1", "Feature 2", "..."] }`,
    userPrompt: `TOOL: AI_PRODUCT_FEATURES\nExtract features for this product:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    ProductFeaturesOutputSchema
  );

  const cleanFeatures = data.features.map((f) => {
    const clean = sanitizeToPlainText(f);
    validateSafeClaims(clean);
    return clean;
  });

  return {
    result: { features: cleanFeatures },
    inputTokens,
    outputTokens,
  };
}
