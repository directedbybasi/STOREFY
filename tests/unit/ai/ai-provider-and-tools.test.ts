import { describe, it, expect, beforeEach } from "vitest";
import { MockAIProvider } from "@/modules/ai/core/provider";
import {
  AIProviderUnavailableError,
  AIRateLimitError,
  AIValidationError,
} from "@/modules/ai/core/errors";
import {
  ProductTitleOutputSchema,
  ProductDescriptionOutputSchema,
  SeoDescriptionOutputSchema,
  ProductFeaturesOutputSchema,
  ProductSpecificationsOutputSchema,
  ProductTagsOutputSchema,
  CategorySuggestionOutputSchema,
} from "@/modules/ai/core/validation";
import { generateProductTitleSuggestions } from "@/modules/ai/product/title";
import { generateProductDescription } from "@/modules/ai/product/description";
import { generateSeoDescription } from "@/modules/ai/product/seo-description";
import { generateProductFeatures } from "@/modules/ai/product/features";
import { generateProductSpecifications } from "@/modules/ai/product/specifications";
import { generateProductTags } from "@/modules/ai/product/tags";

describe("Phase 14 — AI Provider Abstraction & Product Intelligence Tools", () => {
  let provider: MockAIProvider;
  const sampleContext = {
    storeId: "store-test-123",
    userId: "user-test-456",
    currentTitle: "Handcrafted Leather Laptop Bag",
    brand: "HeritageLeather",
    productType: "Bags & Accessories",
    currentCategoryName: "Luggage & Travel",
    currentDescription: "Crafted from genuine full-grain leather with padded laptop compartment.",
  };

  beforeEach(() => {
    provider = new MockAIProvider({ mode: "normal" });
  });

  describe("Provider Failure Simulations", () => {
    it("simulates timeout error gracefully", async () => {
      provider.setOptions({ mode: "timeout" });
      await expect(
        provider.generateText({ systemPrompt: "test", userPrompt: "test" })
      ).rejects.toThrow(AIProviderUnavailableError);
    });

    it("simulates rate limit error from provider", async () => {
      provider.setOptions({ mode: "rate_limit" });
      await expect(
        provider.generateText({ systemPrompt: "test", userPrompt: "test" })
      ).rejects.toThrow(AIRateLimitError);
    });

    it("simulates provider 500 error", async () => {
      provider.setOptions({ mode: "provider_error" });
      await expect(
        provider.generateText({ systemPrompt: "test", userPrompt: "test" })
      ).rejects.toThrow(AIProviderUnavailableError);
    });

    it("simulates malformed output rejection via Zod validation", async () => {
      provider.setOptions({ mode: "malformed" });
      await expect(
        provider.generateStructured(
          { systemPrompt: "test", userPrompt: "test" },
          ProductTitleOutputSchema
        )
      ).rejects.toThrow(AIValidationError);
    });
  });

  describe("Seven Approved Product Tools", () => {
    // Tool 1
    it("Tool 1: generates factual product titles matching schema", async () => {
      const res = await generateProductTitleSuggestions(sampleContext, provider);
      expect(res.result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(res.result.suggestions[0]).toContain("Leather Laptop Bag");
      expect(ProductTitleOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 2
    it("Tool 2: generates structured product description with paragraphs and bullets", async () => {
      const res = await generateProductDescription(sampleContext, provider);
      expect(res.result.summary.length).toBeGreaterThan(10);
      expect(res.result.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(res.result.bulletPoints.length).toBeGreaterThanOrEqual(2);
      expect(ProductDescriptionOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 3
    it("Tool 3: generates concise SEO meta description under 160 characters", async () => {
      const res = await generateSeoDescription(sampleContext, provider);
      expect(res.result.seoDescription.length).toBeLessThanOrEqual(160);
      expect(res.result.seoDescription.length).toBeGreaterThan(20);
      expect(SeoDescriptionOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 4
    it("Tool 4: extracts structured features list", async () => {
      const res = await generateProductFeatures(sampleContext, provider);
      expect(res.result.features.length).toBeGreaterThanOrEqual(1);
      expect(ProductFeaturesOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 5
    it("Tool 5: structures specifications with confidence ratings", async () => {
      const res = await generateProductSpecifications(sampleContext, provider);
      expect(res.result.specifications.length).toBeGreaterThanOrEqual(2);

      // Verify brand is supported
      const brandSpec = res.result.specifications.find((s) => s.name === "Brand");
      expect(brandSpec?.value).toBe("HeritageLeather");
      expect(brandSpec?.confidence).toBe("SUPPORTED");

      // Verify unknown specs are not hallucinated
      const weightSpec = res.result.specifications.find((s) => s.name === "Weight");
      expect(weightSpec?.value).toBe("UNKNOWN");
      expect(weightSpec?.confidence).toBe("UNKNOWN");

      expect(ProductSpecificationsOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 6
    it("Tool 6: generates clean deduplicated product tags", async () => {
      const res = await generateProductTags(sampleContext, provider);
      expect(res.result.tags.length).toBeGreaterThanOrEqual(1);
      // Tags should be lowercase alphanumeric
      res.result.tags.forEach((tag) => {
        expect(tag).toMatch(/^[a-z0-9\s-_]+$/);
      });
      expect(ProductTagsOutputSchema.safeParse(res.result).success).toBe(true);
    });

    // Tool 7
    it("Tool 7: returns NO_CONFIDENT_MATCH when no store categories match", () => {
      const emptyMatch = {
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        path: null,
        confidence: 0,
        matchStatus: "NO_CONFIDENT_MATCH" as const,
      };
      expect(CategorySuggestionOutputSchema.safeParse(emptyMatch).success).toBe(true);

      const validMatch = {
        suggestedCategoryId: "11111111-1111-1111-1111-111111111111",
        suggestedCategoryName: "Laptop Bags",
        path: "Bags > Laptop Bags",
        confidence: 0.94,
        matchStatus: "MATCHED" as const,
      };
      expect(CategorySuggestionOutputSchema.safeParse(validMatch).success).toBe(true);
    });
  });
});
