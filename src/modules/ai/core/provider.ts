import type { z } from "zod";
import type { AIProvider, AIPrompt } from "./types";
import {
  AIProviderUnavailableError,
  AIRateLimitError,
  AIValidationError,
} from "./errors";

/**
 * Configuration options to control MockAIProvider behavior during unit tests.
 */
export interface MockProviderOptions {
  mode?: "normal" | "timeout" | "rate_limit" | "provider_error" | "malformed";
  latencyMs?: number;
}

/**
 * Deterministic, resilient Mock AI Provider.
 * Used for zero-dependency unit tests, local development, and fallback.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  private options: MockProviderOptions;

  constructor(options: MockProviderOptions = { mode: "normal" }) {
    this.options = options;
  }

  setOptions(options: MockProviderOptions) {
    this.options = { ...this.options, ...options };
  }

  async validateAvailability(): Promise<boolean> {
    return this.options.mode !== "provider_error";
  }

  async generateText(
    prompt: AIPrompt
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    await this.handleSimulatedModes();

    const text = `AI Generated Response for: ${prompt.userPrompt.slice(0, 100)}`;
    return {
      text,
      inputTokens: Math.ceil(prompt.userPrompt.length / 4),
      outputTokens: Math.ceil(text.length / 4),
    };
  }

  async generateStructured<T>(
    prompt: AIPrompt,
    schema: z.ZodType<T>
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    await this.handleSimulatedModes();

    if (this.options.mode === "malformed") {
      // Return invalid JSON structure that deliberately fails Zod schema
      const malformedData = { invalidField: "This is completely malformed" };
      const parsed = schema.safeParse(malformedData);
      if (!parsed.success) {
        throw new AIValidationError(`AI output malformed: ${parsed.error.message}`);
      }
      return {
        data: malformedData as unknown as T,
        inputTokens: 10,
        outputTokens: 10,
      };
    }

    // Extract product title and hints from user prompt
    const rawData = this.generateMockDataForPrompt(prompt.userPrompt);
    const parsed = schema.safeParse(rawData);

    if (!parsed.success) {
      throw new AIValidationError(`Mock generation schema validation failed: ${parsed.error.message}`);
    }

    const inputTokens = Math.max(10, Math.ceil((prompt.systemPrompt.length + prompt.userPrompt.length) / 4));
    const outputTokens = Math.max(10, Math.ceil(JSON.stringify(parsed.data).length / 4));

    return {
      data: parsed.data,
      inputTokens,
      outputTokens,
    };
  }

  private async handleSimulatedModes() {
    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.options.latencyMs));
    }

    if (this.options.mode === "timeout") {
      throw new AIProviderUnavailableError("AI provider request timed out after 30000ms.");
    }

    if (this.options.mode === "provider_error") {
      throw new AIProviderUnavailableError("AI provider returned HTTP 500 internal server error.");
    }

    if (this.options.mode === "rate_limit") {
      throw new AIRateLimitError("AI provider rate limit exceeded. Please wait before retrying.");
    }
  }

  private generateMockDataForPrompt(promptText: string): unknown {
    const titleMatch = promptText.match(/Title:\s*([^\n\r<]+)/i);
    const brandMatch = promptText.match(/Brand:\s*([^\n\r<]+)/i);
    const categoryMatch = promptText.match(/Current Category:\s*([^\n\r<]+)/i);

    const baseTitle = titleMatch ? titleMatch[1].trim() : "Premium Quality Product";
    const brand = brandMatch ? brandMatch[1].trim() : "";
    const category = categoryMatch ? categoryMatch[1].trim() : "";

    // 1. Title Tool
    if (promptText.includes("AI_PRODUCT_TITLE") || promptText.includes("title suggestions")) {
      return {
        suggestions: [
          brand ? `${brand} ${baseTitle}` : `Premium ${baseTitle}`,
          `Handcrafted ${baseTitle} with Elegant Finish`,
          `Authentic ${baseTitle} for Daily Use`,
        ],
      };
    }

    // 2. Description Tool
    if (promptText.includes("AI_PRODUCT_DESCRIPTION") || promptText.includes("product description")) {
      return {
        summary: `Discover the unmatched craftsmanship and everyday elegance of our ${baseTitle}.`,
        paragraphs: [
          `Carefully designed to provide exceptional durability and seamless everyday usability. Built with premium materials for lasting quality.`,
          `Whether for daily routine or special occasions, this versatile piece fits effortlessly into your lifestyle.`,
        ],
        bulletPoints: [
          `Premium build quality crafted for longevity`,
          `Ergonomic and comfortable modern design`,
          `Versatile aesthetic suitable for diverse occasions`,
        ],
      };
    }

    // 3. SEO Description Tool
    if (promptText.includes("AI_SEO_DESCRIPTION") || promptText.includes("SEO meta description")) {
      return {
        seoDescription: `Shop the ${baseTitle}${brand ? ` by ${brand}` : ""}. Enjoy premium quality, reliable craftsmanship, and fast delivery at best prices.`,
      };
    }

    // 4. Features Tool
    if (promptText.includes("AI_PRODUCT_FEATURES") || promptText.includes("product features")) {
      return {
        features: [
          "Durable and lightweight construction",
          "Ergonomic design for effortless daily handling",
          "High-grade finish resistant to daily wear and tear",
          "Precision-engineered for reliable long-term performance",
        ],
      };
    }

    // 5. Specifications Tool
    if (promptText.includes("AI_PRODUCT_SPECIFICATIONS") || promptText.includes("specifications")) {
      const specs = [];
      if (brand) {
        specs.push({ name: "Brand", value: brand, confidence: "SUPPORTED" });
      }
      specs.push({ name: "Product Type", value: category || "Apparel", confidence: "SUPPORTED" });
      specs.push({ name: "Material", value: "Premium Composite", confidence: "INFERRED" });
      // Crucial: Weight is not in the input prompt, so it MUST be returned as UNKNOWN, never hallucinated!
      specs.push({ name: "Weight", value: "UNKNOWN", confidence: "UNKNOWN" });
      specs.push({ name: "Warranty", value: "UNKNOWN", confidence: "UNKNOWN" });

      return {
        specifications: specs,
      };
    }

    // 6. Tags Tool
    if (promptText.includes("AI_PRODUCT_TAGS") || promptText.includes("product tags")) {
      const words = baseTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const tags = Array.from(
        new Set([
          ...words,
          brand ? brand.toLowerCase() : "trending",
          "bestseller",
          "quality",
        ])
      );
      return {
        tags: tags.slice(0, 8),
      };
    }

    // 7. Category Suggestion Tool
    if (promptText.includes("AI_CATEGORY_SUGGESTION") || promptText.includes("category suggestion")) {
      // Check if categories list was provided in the prompt
      const catIdMatch = promptText.match(/id:\s*([a-f0-9-]+)\s*,\s*name:\s*([^\n\r]+)/i);
      if (catIdMatch) {
        return {
          suggestedCategoryId: catIdMatch[1],
          suggestedCategoryName: catIdMatch[2].trim(),
          path: catIdMatch[2].trim(),
          confidence: 0.92,
          matchStatus: "MATCHED",
        };
      }

      return {
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        path: null,
        confidence: 0.0,
        matchStatus: "NO_CONFIDENT_MATCH",
      };
    }

    // Default fallback
    return { data: baseTitle };
  }
}

/**
 * Real Google Gemini Provider (Server-Side Only).
 */
export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = "gemini-1.5-flash") {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
    this.model = model;
  }

  async validateAvailability(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async generateText(
    prompt: AIPrompt
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    if (!this.apiKey) {
      throw new AIProviderUnavailableError("Gemini API key is not configured.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt.systemPrompt}\n\n${prompt.userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: prompt.temperature ?? 0.3,
          maxOutputTokens: prompt.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AIRateLimitError("Gemini rate limit exceeded.");
      }
      throw new AIProviderUnavailableError(`Gemini returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const inputTokens = data?.usageMetadata?.promptTokenCount || 50;
    const outputTokens = data?.usageMetadata?.candidatesTokenCount || 50;

    return {
      text: candidateText,
      inputTokens,
      outputTokens,
    };
  }

  async generateStructured<T>(
    prompt: AIPrompt,
    schema: z.ZodType<T>
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    const jsonPrompt: AIPrompt = {
      ...prompt,
      systemPrompt: `${prompt.systemPrompt}\nYou MUST respond ONLY with valid JSON conforming to the requested schema. Do NOT wrap output in markdown codeblocks.`,
    };

    const result = await this.generateText(jsonPrompt);
    let cleanJson = result.text.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsedRaw = JSON.parse(cleanJson);
      const validated = schema.parse(parsedRaw);
      return {
        data: validated,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch (err: unknown) {
      throw new AIValidationError(
        `Gemini output failed schema validation: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
