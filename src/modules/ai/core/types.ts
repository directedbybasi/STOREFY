import type { z } from "zod";
import {
  AI_TOOLS,
  type AiToolType,
  AI_REQUEST_STATUSES,
  type AiRequestStatusType,
} from "@/database/schema/ai";

export { AI_TOOLS, type AiToolType, AI_REQUEST_STATUSES, type AiRequestStatusType };

/**
 * Common payload sent to an AI Provider.
 */
export interface AIPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Universal Provider Interface.
 * Enables zero-coupling with any specific AI vendor (Mock, Gemini, OpenAI, Claude).
 */
export interface AIProvider {
  readonly name: string;

  /**
   * Generates structured output validated against a Zod schema.
   */
  generateStructured<T>(
    prompt: AIPrompt,
    schema: z.ZodType<T>
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }>;

  /**
   * Generates plain text response.
   */
  generateText(
    prompt: AIPrompt
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }>;

  /**
   * Verifies provider connectivity and availability.
   */
  validateAvailability(): Promise<boolean>;
}

/**
 * Standard Context given to any AI Product Tool.
 */
export interface ProductToolContext {
  storeId: string;
  userId: string;
  productId?: string;
  currentTitle?: string;
  currentDescription?: string;
  currentShortDescription?: string;
  currentCategoryName?: string;
  currentCategoryId?: string;
  currentTags?: string[];
  currentFeatures?: string[];
  currentSpecifications?: { name: string; value: string; confidence?: string }[];
  brand?: string;
  vendor?: string;
  productType?: string;
  variants?: {
    title: string;
    pricePaise?: number;
    options?: Record<string, string>;
  }[];
  merchantGuidance?: string;
}

/**
 * Confidence state for generated attributes/specifications.
 */
export type AttributeConfidence = "SUPPORTED" | "INFERRED" | "UNKNOWN";

export interface SpecificationItem {
  name: string;
  value: string;
  confidence: AttributeConfidence;
}

/**
 * Output DTOs for the 7 tools
 */
export interface ProductTitleResult {
  suggestions: string[];
}

export interface ProductDescriptionResult {
  summary: string;
  paragraphs: string[];
  bulletPoints: string[];
}

export interface SeoDescriptionResult {
  seoDescription: string;
}

export interface ProductFeaturesResult {
  features: string[];
}

export interface ProductSpecificationsResult {
  specifications: SpecificationItem[];
}

export interface ProductTagsResult {
  tags: string[];
}

export interface CategorySuggestionResult {
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  path: string | null;
  confidence: number;
  matchStatus: "MATCHED" | "NO_CONFIDENT_MATCH";
}
