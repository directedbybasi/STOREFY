import type { AIProvider, ProductToolContext, ProductSpecificationsResult, SpecificationItem } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { ProductSpecificationsOutputSchema, sanitizeToPlainText } from "../core/validation";

/**
 * Tool 5: AI Product Specifications
 * Formulates structured technical specifications with strict confidence levels:
 * - "SUPPORTED": Directly verified from input data (e.g. brand, material explicitly mentioned).
 * - "INFERRED": Logically deduced from context (e.g. style/fit deduced from description).
 * - "UNKNOWN": Missing or unverified attributes (e.g. unknown weight/dimensions). NEVER invented!
 */
export async function generateProductSpecifications(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: ProductSpecificationsResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Extract and structure product specifications (e.g. Brand, Material, Color, Dimensions, Weight, Country of Origin, Model, Capacity).
CRITICAL INVARIANT:
- NEVER invent a missing specification.
- If weight, dimensions, battery capacity, or material is NOT explicitly stated in the input data, mark its value as "UNKNOWN" and its confidence as "UNKNOWN".
- Allowed confidence levels: "SUPPORTED", "INFERRED", "UNKNOWN".
- Return JSON adhering to:
{
  "specifications": [
    { "name": "Material", "value": "Cotton", "confidence": "SUPPORTED" },
    { "name": "Weight", "value": "UNKNOWN", "confidence": "UNKNOWN" }
  ]
}`,
    userPrompt: `TOOL: AI_PRODUCT_SPECIFICATIONS\nGenerate structured specifications for this product:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    ProductSpecificationsOutputSchema
  );

  const cleanSpecs: SpecificationItem[] = data.specifications.map((s) => ({
    name: sanitizeToPlainText(s.name),
    value: sanitizeToPlainText(s.value),
    confidence: s.confidence,
  }));

  return {
    result: { specifications: cleanSpecs },
    inputTokens,
    outputTokens,
  };
}
