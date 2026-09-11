import { db } from "@/database/client";
import { categories } from "@/database/schema";
import { eq } from "drizzle-orm";
import type { AIProvider, ProductToolContext, CategorySuggestionResult } from "../core/types";
import { BASE_SYSTEM_PROMPT, buildProductDataBlock } from "../core/prompts";
import { CategorySuggestionOutputSchema } from "../core/validation";

interface StoreCategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

/**
 * Tool 7: AI Category Suggestion
 * Analyzes product attributes and maps them strictly to an EXISTING category within the merchant store's category tree.
 *
 * CRITICAL SECURITY & DATA INVARIANTS:
 * 1. AI cannot invent new category IDs.
 * 2. Category IDs must belong strictly to the requesting store (Cross-tenant category forgery prevention).
 * 3. If no store category matches with confidence, returns NO_CONFIDENT_MATCH.
 */
export async function suggestProductCategory(
  ctx: ProductToolContext,
  provider: AIProvider
): Promise<{ result: CategorySuggestionResult; inputTokens: number; outputTokens: number }> {
  // Query all active categories for this specific store
  const storeCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.storeId, ctx.storeId));

  if (storeCategories.length === 0) {
    return {
      result: {
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        path: null,
        confidence: 0,
        matchStatus: "NO_CONFIDENT_MATCH",
      },
      inputTokens: 10,
      outputTokens: 10,
    };
  }

  // Build category hierarchy list for the prompt
  const categoryListText = storeCategories
    .map((c) => `- id: ${c.id}, name: ${c.name}, slug: ${c.slug}${c.parentId ? `, parentId: ${c.parentId}` : ""}`)
    .join("\n");

  const dataBlock = buildProductDataBlock(ctx);

  const prompt = {
    systemPrompt: `${BASE_SYSTEM_PROMPT}
TASK: Suggest the best matching category for this product from the store's existing category list.
RULES:
1. ONLY select a category from the provided STORE CATEGORIES list. NEVER invent a category ID or name.
2. If no category fits reasonably (confidence < 0.6), return:
   { "suggestedCategoryId": null, "suggestedCategoryName": null, "path": null, "confidence": 0, "matchStatus": "NO_CONFIDENT_MATCH" }
3. If a category matches, return its exact id, name, full path, confidence (0.0 to 1.0), and "matchStatus": "MATCHED".`,
    userPrompt: `TOOL: AI_CATEGORY_SUGGESTION
STORE CATEGORIES:
${categoryListText}

PRODUCT DATA:
${dataBlock}`,
  };

  const { data, inputTokens, outputTokens } = await provider.generateStructured(
    prompt,
    CategorySuggestionOutputSchema
  );

  // Cross-tenant verification: Ensure the suggested category ID actually belongs to this store
  if (data.suggestedCategoryId) {
    const verifiedCat = storeCategories.find((c) => c.id === data.suggestedCategoryId);
    if (!verifiedCat) {
      // AI attempted to forge or hallucinate a non-existent/cross-tenant category ID!
      return {
        result: {
          suggestedCategoryId: null,
          suggestedCategoryName: null,
          path: null,
          confidence: 0,
          matchStatus: "NO_CONFIDENT_MATCH",
        },
        inputTokens,
        outputTokens,
      };
    }
  }

  return {
    result: data,
    inputTokens,
    outputTokens,
  };
}
