import type { AIProvider, ProductToolContext, ProductTagsResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { ProductTagsOutputSchema, sanitizeToPlainText } from "../core/validation";

/**
 * Tool 6: AI Product Tags
 * Generates 3-15 relevant, clean, searchable product tags.
 */
export async function generateProductTags(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: ProductTagsResult; inputTokens: number; outputTokens: number }> {
  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Generate 4 to 12 relevant, search-friendly e-commerce product tags.
RULES:
1. Tags must be lowercase, concise (1-3 words), and alphanumeric with hyphens or spaces.
2. No spam tags, competitor trademark stuffing, or offensive keywords.
3. Return JSON adhering to: { "tags": ["tag1", "tag2", "tag3"] }`,
    userPrompt: `TOOL: AI_PRODUCT_TAGS\nGenerate search tags for this product:\n${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    ProductTagsOutputSchema
  );

  // Normalize, deduplicate, and lowercase
  const seen = new Set<string>();
  const cleanTags: string[] = [];

  for (const rawTag of data.tags) {
    const clean = sanitizeToPlainText(rawTag).toLowerCase().replace(/[^a-z0-9\s-_]/g, "").trim();
    if (clean.length >= 2 && !seen.has(clean)) {
      seen.add(clean);
      cleanTags.push(clean);
    }
  }

  return {
    result: { tags: cleanTags.slice(0, 15) },
    inputTokens,
    outputTokens,
  };
}
