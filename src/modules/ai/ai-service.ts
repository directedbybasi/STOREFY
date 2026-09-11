import { db } from "@/database/client";
import { products, aiGenerationHistory } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ValidationError } from "@/core/errors";
import {
  AIStaleConflictError,
  AIPromptInjectionError,
} from "./core/errors";
import type { AiToolType, ProductToolContext } from "./core/types";
import { validateAiToolWhitelist, AiToolInputLimitsSchema } from "./core/validation";
import { aiProviderRegistry } from "./core/registry";
import { checkAiQuotaAndRateLimit, recordAiRequestAudit } from "./usage/quota-service";

// Tool handlers
import { generateProductTitleSuggestions } from "./product/title";
import { generateProductDescription } from "./product/description";
import { generateSeoDescription } from "./product/seo-description";
import { generateProductFeatures } from "./product/features";
import { generateProductSpecifications } from "./product/specifications";
import { generateProductTags } from "./product/tags";
import { suggestProductCategory } from "./product/category";

/**
 * Parameters to request an AI tool suggestion.
 */
export interface GenerateAiSuggestionParams {
  storeId: string;
  userId: string;
  productId?: string;
  tool: string; // validated against whitelist
  context: Partial<ProductToolContext>;
}

/**
 * Parameters to apply an AI tool suggestion to a product.
 */
export interface ApplyAiSuggestionParams {
  storeId: string;
  userId: string;
  productId: string;
  requestId: string;
  tool: string;
  suggestion: unknown;
  expectedUpdatedAt?: string;
}

/**
 * Orchestrates AI generation for any of the 7 approved product intelligence tools.
 */
export async function generateProductToolSuggestion(params: GenerateAiSuggestionParams) {
  // 1. Tool whitelist check
  validateAiToolWhitelist(params.tool);
  const tool = params.tool as AiToolType;

  // 2. Input limit validation
  AiToolInputLimitsSchema.parse({
    currentTitle: params.context.currentTitle,
    currentDescription: params.context.currentDescription,
    merchantGuidance: params.context.merchantGuidance,
  });

  // Prompt injection guard: Disallow explicit instruction bypass patterns in merchant guidance
  if (params.context.merchantGuidance) {
    const dangerousPatterns = [
      /ignore (all )?previous instructions/i,
      /reveal (system prompt|api key|credentials|passwords)/i,
      /drop database|delete from/i,
    ];
    for (const p of dangerousPatterns) {
      if (p.test(params.context.merchantGuidance)) {
        throw new AIPromptInjectionError();
      }
    }
  }

  // 3. Quota and rate-limit check
  const digest = `${params.productId || "new"}:${params.context.currentTitle || ""}`;
  await checkAiQuotaAndRateLimit(params.storeId, tool, digest);

  // 4. Resolve product context if productId provided
  let fullContext: ProductToolContext = {
    storeId: params.storeId,
    userId: params.userId,
    productId: params.productId,
    ...params.context,
  };

  if (params.productId) {
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, params.productId), eq(products.storeId, params.storeId)))
      .limit(1);

    if (!existingProduct) {
      throw new NotFoundError("Product");
    }

    fullContext = {
      ...fullContext,
      currentTitle: params.context.currentTitle || existingProduct.title,
      currentDescription: params.context.currentDescription || existingProduct.description || "",
      currentShortDescription: existingProduct.shortDescription || "",
      currentCategoryId: existingProduct.categoryId || undefined,
      currentTags: existingProduct.tags || [],
      currentFeatures: existingProduct.features || [],
      currentSpecifications: existingProduct.specifications || [],
      brand: existingProduct.brand || undefined,
      vendor: existingProduct.vendor || undefined,
      productType: existingProduct.productType || undefined,
    };
  }

  // 5. Invoke provider
  const provider = aiProviderRegistry.getProvider();
  let result: unknown;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    switch (tool) {
      case "AI_PRODUCT_TITLE": {
        const res = await generateProductTitleSuggestions(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_PRODUCT_DESCRIPTION": {
        const res = await generateProductDescription(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_SEO_DESCRIPTION": {
        const res = await generateSeoDescription(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_PRODUCT_FEATURES": {
        const res = await generateProductFeatures(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_PRODUCT_SPECIFICATIONS": {
        const res = await generateProductSpecifications(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_PRODUCT_TAGS": {
        const res = await generateProductTags(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
      case "AI_CATEGORY_SUGGESTION": {
        const res = await suggestProductCategory(fullContext, provider);
        result = res.result;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
        break;
      }
    }

    // 6. Record audit success
    const requestId = await recordAiRequestAudit({
      storeId: params.storeId,
      userId: params.userId,
      productId: params.productId,
      tool,
      provider: provider.name,
      model: "default",
      status: "SUCCEEDED",
      inputTokens,
      outputTokens,
      metadata: { productId: params.productId },
    });

    return {
      requestId,
      tool,
      suggestion: result,
      provider: provider.name,
    };
  } catch (err: unknown) {
    // Record audit failure
    await recordAiRequestAudit({
      storeId: params.storeId,
      userId: params.userId,
      productId: params.productId,
      tool,
      provider: provider.name,
      model: "default",
      status: "FAILED",
      inputTokens,
      outputTokens,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Explicitly applies an AI suggestion to a product after merchant review.
 * Enforces optimistic concurrency and store tenancy.
 */
export async function applyProductToolSuggestion(params: ApplyAiSuggestionParams) {
  validateAiToolWhitelist(params.tool);
  const tool = params.tool as AiToolType;

  // 1. Fetch existing product with strict store isolation
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, params.productId), eq(products.storeId, params.storeId)))
    .limit(1);

  if (!product) {
    throw new NotFoundError("Product");
  }

  // 2. Optimistic Concurrency check (stale conflict prevention)
  if (params.expectedUpdatedAt) {
    const currentUpdated = product.updatedAt.toISOString();
    if (new Date(currentUpdated).getTime() > new Date(params.expectedUpdatedAt).getTime() + 1000) {
      throw new AIStaleConflictError();
    }
  }

  let originalValue: unknown = null;
  const updates: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date(),
  };

  // 3. Map suggestion to product updates
  switch (tool) {
    case "AI_PRODUCT_TITLE": {
      const titleStr = typeof params.suggestion === "string" ? params.suggestion : (params.suggestion as { selectedTitle?: string })?.selectedTitle;
      if (!titleStr) throw new ValidationError("Invalid title suggestion payload.");
      originalValue = product.title;
      updates.title = titleStr;
      break;
    }
    case "AI_PRODUCT_DESCRIPTION": {
      const descStr = typeof params.suggestion === "string" ? params.suggestion : (params.suggestion as { description?: string })?.description;
      if (!descStr) throw new ValidationError("Invalid description suggestion payload.");
      originalValue = product.description;
      updates.description = descStr;
      break;
    }
    case "AI_SEO_DESCRIPTION": {
      const seoStr = typeof params.suggestion === "string" ? params.suggestion : (params.suggestion as { seoDescription?: string })?.seoDescription;
      if (!seoStr) throw new ValidationError("Invalid SEO description payload.");
      originalValue = product.seoDescription;
      updates.seoDescription = seoStr;
      break;
    }
    case "AI_PRODUCT_FEATURES": {
      const featuresArr = Array.isArray(params.suggestion) ? params.suggestion : (params.suggestion as { features?: string[] })?.features;
      if (!Array.isArray(featuresArr)) throw new ValidationError("Features suggestion must be an array of strings.");
      originalValue = product.features;
      updates.features = featuresArr;
      break;
    }
    case "AI_PRODUCT_SPECIFICATIONS": {
      const specsArr = Array.isArray(params.suggestion) ? params.suggestion : (params.suggestion as { specifications?: unknown[] })?.specifications;
      if (!Array.isArray(specsArr)) throw new ValidationError("Specifications must be an array.");
      originalValue = product.specifications;
      updates.specifications = specsArr as { name: string; value: string; confidence?: "SUPPORTED" | "INFERRED" | "UNKNOWN" }[];
      break;
    }
    case "AI_PRODUCT_TAGS": {
      const tagsArr = Array.isArray(params.suggestion) ? params.suggestion : (params.suggestion as { tags?: string[] })?.tags;
      if (!Array.isArray(tagsArr)) throw new ValidationError("Tags suggestion must be an array of strings.");
      originalValue = product.tags;
      updates.tags = tagsArr;
      break;
    }
    case "AI_CATEGORY_SUGGESTION": {
      const catId = typeof params.suggestion === "string" ? params.suggestion : (params.suggestion as { suggestedCategoryId?: string })?.suggestedCategoryId;
      if (!catId) throw new ValidationError("Invalid category suggestion ID.");
      originalValue = product.categoryId;
      updates.categoryId = catId;
      break;
    }
  }

  // 4. Update product in database
  const [updated] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, params.productId))
    .returning();

  // 5. Record generation history
  await db.insert(aiGenerationHistory).values({
    storeId: params.storeId,
    requestId: params.requestId,
    productId: params.productId,
    tool,
    originalValue,
    generatedSuggestion: params.suggestion,
    status: "APPLIED",
    appliedAt: new Date(),
    appliedBy: params.userId,
  });

  return {
    success: true,
    product: updated,
  };
}
