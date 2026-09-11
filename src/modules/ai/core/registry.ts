import type { AIProvider } from "./types";
import { MockAIProvider, GeminiAIProvider } from "./provider";
import { AIProviderUnavailableError } from "./errors";

/**
 * AI Provider Registry.
 * Manages available providers and provides thread-safe access.
 */
class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProviderName = "mock";

  constructor() {
    // Register default providers
    const mock = new MockAIProvider();
    this.registerProvider(mock);

    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (geminiKey) {
      const gemini = new GeminiAIProvider(geminiKey);
      this.registerProvider(gemini);
      this.defaultProviderName = "gemini";
    }
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  setDefaultProvider(name: string): void {
    const key = name.toLowerCase();
    if (!this.providers.has(key)) {
      throw new AIProviderUnavailableError(`Provider '${name}' is not registered.`);
    }
    this.defaultProviderName = key;
  }

  getProvider(name?: string): AIProvider {
    const key = (name || this.defaultProviderName).toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      // Fallback to mock provider if requested provider is missing
      const mock = this.providers.get("mock");
      if (mock) return mock;
      throw new AIProviderUnavailableError(`No available AI provider found for '${key}'.`);
    }
    return provider;
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
