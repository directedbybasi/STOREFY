import { describe, it, expect } from "vitest";
import {
  resolveBindingValue,
  interpolateBindings,
  type BindingContext,
} from "@/modules/builder/bindings";

describe("Phase 5: Builder Dynamic Data Bindings & Injection Protection", () => {
  const sampleContext: BindingContext = {
    store: {
      name: "Heritage Silks",
      subdomain: "heritage-silks",
      customDomain: "heritagesilks.in",
      currency: "INR",
      description: "Handcrafted pure banarasi sarees",
    },
    product: {
      id: "prod-001",
      title: "Royal Crimson Silk Saree",
      description: "Woven with gold zari threads",
      price: 18500,
      compareAtPrice: 24000,
      sku: "SILK-BAN-001",
      primaryImageUrl: "https://example.com/saree.jpg",
    },
    collection: {
      id: "col-001",
      title: "Bridal Collection",
      description: "Exclusive bridal wedding edit",
      productsCount: 42,
    },
  };

  it("should resolve valid approved tokens from context", () => {
    expect(resolveBindingValue("store.name", sampleContext)).toBe("Heritage Silks");
    expect(resolveBindingValue("store.currency", sampleContext)).toBe("INR");
    expect(resolveBindingValue("product.title", sampleContext)).toBe("Royal Crimson Silk Saree");
    expect(resolveBindingValue("product.price", sampleContext)).toBe("18500");
    expect(resolveBindingValue("collection.title", sampleContext)).toBe("Bridal Collection");
    expect(resolveBindingValue("collection.productsCount", sampleContext)).toBe("42");
  });

  it("should interpolate tokens into sentences", () => {
    const template = "Welcome to {{ store.name }}! Shop our {{ collection.title }} in {{ store.currency }}.";
    const interpolated = interpolateBindings(template, sampleContext);
    expect(interpolated).toBe("Welcome to Heritage Silks! Shop our Bridal Collection in INR.");
  });

  it("should leave unrecognized tokens as-is or gracefully handle missing values", () => {
    const template = "Check out {{ store.nonExistent }} or {{ product.compareAtPrice }}.";
    const interpolated = interpolateBindings(template, sampleContext);
    // store.nonExistent is not in whitelist, so remains unparsed
    expect(interpolated).toBe("Check out {{ store.nonExistent }} or 24000.");

    // If context is completely empty
    const emptyInterpolated = interpolateBindings("Hello {{ store.name }}", {});
    expect(emptyInterpolated).toBe("Hello {{ store.name }}");
  });

  it("should strictly reject arbitrary code execution, prototype pollution, or sensitive path traversal", () => {
    const maliciousPaths = [
      "process.env",
      "__proto__.polluted",
      "constructor.prototype",
      "eval('alert(1)')",
      "function(){return 1}()",
      "global.process",
      "window.document",
      "store.password",
      "store.secretKey",
      "store.__proto__",
    ];

    for (const path of maliciousPaths) {
      const resolved = resolveBindingValue(path, sampleContext);
      expect(resolved).toBeUndefined();
    }

    const dangerousTemplate = "Secret: {{ process.env.DATABASE_URL }} and {{ store.__proto__ }}";
    const result = interpolateBindings(dangerousTemplate, sampleContext);
    // Malicious tokens must NOT be evaluated or leaked
    expect(result).toBe("Secret: {{ process.env.DATABASE_URL }} and {{ store.__proto__ }}");
  });

  it("should handle null, undefined, and non-string template inputs gracefully", () => {
    expect(interpolateBindings(null, sampleContext)).toBe("");
    expect(interpolateBindings(undefined, sampleContext)).toBe("");
    expect(interpolateBindings("" as unknown as string, sampleContext)).toBe("");
  });
});
