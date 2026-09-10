import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  slugify,
  ProductCreateSchema,
  ProductUpdateSchema,
  CategorySchema,
  CollectionSchema,
  BulkActionSchema,
  ProductCsvRowSchema,
} from "@/modules/catalog/validation";

describe("Catalog Financial Utilities (Paise & Precision)", () => {
  it("converts Rupees to integer Paise correctly", () => {
    expect(rupeesToPaise(999)).toBe(99900);
    expect(rupeesToPaise(999.5)).toBe(99950);
    expect(rupeesToPaise(999.99)).toBe(99999);
    expect(rupeesToPaise("49.90")).toBe(4990);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(null)).toBe(0);
    expect(rupeesToPaise(undefined)).toBe(0);
  });

  it("converts integer Paise back to Rupees correctly", () => {
    expect(paiseToRupees(99900)).toBe(999);
    expect(paiseToRupees(99950)).toBe(999.5);
    expect(paiseToRupees(99999)).toBe(999.99);
    expect(paiseToRupees(BigInt(149900))).toBe(1499);
    expect(paiseToRupees(0)).toBe(0);
    expect(paiseToRupees(null)).toBe(0);
  });

  it("formats Paise as Indian Rupee (INR) currency string", () => {
    const formatted = formatINR(99900);
    expect(formatted).toContain("999");
    expect(formatted).toMatch(/₹|INR/);
  });
});

describe("Catalog Slugification", () => {
  it("generates safe, lowercase, hyphenated URL slugs", () => {
    expect(slugify("Premium Leather Bag")).toBe("premium-leather-bag");
    expect(slugify("Men's Classic Cotton T-Shirt (Blue & White)")).toBe(
      "mens-classic-cotton-t-shirt-blue-white"
    );
    expect(slugify("   Trim   Spaces   ")).toBe("trim-spaces");
    expect(slugify("Special-Chars--Here!!")).toBe("special-chars-here");
  });
});

describe("Catalog Zod Validation Schemas", () => {
  it("validates valid product creation payload", () => {
    const validPayload = {
      title: "Handcrafted Ceramic Mug",
      slug: "handcrafted-ceramic-mug",
      description: "Artisanal stoneware mug for morning brew.",
      basePriceRupees: 599,
      compareAtPriceRupees: 799,
      costPriceRupees: 250,
      sku: "MUG-CER-001",
      status: "DRAFT" as const,
      tags: ["ceramic", "kitchenware"],
    };

    const result = ProductCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    const updateResult = ProductUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Updated Mug",
      basePriceRupees: 649,
    });
    expect(updateResult.success).toBe(true);
  });

  it("rejects product with negative price", () => {
    const invalidPayload = {
      title: "Invalid Price Product",
      basePriceRupees: -50,
    };

    const result = ProductCreateSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("rejects product with empty title", () => {
    const invalidPayload = {
      title: " ",
      basePriceRupees: 100,
    };

    const result = ProductCreateSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("validates category creation schema", () => {
    const validCategory = {
      name: "Apparel",
      slug: "apparel",
      description: "Clothing and fashion",
    };

    const result = CategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("validates collection creation schema", () => {
    const validCollection = {
      title: "Summer Collection",
      slug: "summer-collection",
      isActive: true,
      productIds: ["550e8400-e29b-41d4-a716-446655440000"],
    };

    const result = CollectionSchema.safeParse(validCollection);
    expect(result.success).toBe(true);
  });

  it("validates bulk action schema", () => {
    const validBulk = {
      action: "PUBLISH" as const,
      productIds: ["550e8400-e29b-41d4-a716-446655440000"],
    };

    const result = BulkActionSchema.safeParse(validBulk);
    expect(result.success).toBe(true);

    const emptyIds = {
      action: "PUBLISH" as const,
      productIds: [],
    };
    expect(BulkActionSchema.safeParse(emptyIds).success).toBe(false);
  });

  it("validates CSV row schema", () => {
    const validRow = {
      Title: "Cotton Shirt",
      Price: "499.00",
      SKU: "COT-001",
      Status: "ACTIVE",
    };

    const result = ProductCsvRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });
});
