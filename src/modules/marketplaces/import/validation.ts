import { z } from "zod";

export const previewProductSchema = z.object({
  urlOrCode: z.string().min(1, "Product URL or code is required."),
});

export const importOverridesSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  retailPricePaise: z.number().int().positive("Retail price must be a positive integer Paise value.").optional(),
  compareAtPricePaise: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
});

export const importProductSchema = z.object({
  urlOrCode: z.string().min(1, "Product URL or code is required."),
  overrides: importOverridesSchema.optional(),
});

export const refreshProductSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
});
