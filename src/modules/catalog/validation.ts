import { z } from "zod";

/**
 * Currency conversion utilities.
 * Financial precision: all database monetary amounts are integer Paise.
 */
export function rupeesToPaise(rupees: number | string | undefined | null): number {
  if (rupees === undefined || rupees === null || rupees === "") return 0;
  const num = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number | bigint | undefined | null): number {
  if (paise === undefined || paise === null) return 0;
  const num = typeof paise === "bigint" ? Number(paise) : paise;
  return num / 100;
}

export function formatINR(paise: number | bigint | undefined | null): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

// ------------------------------------------------------------------------------
// Product Schemas
// ------------------------------------------------------------------------------

export const VariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Variant title is required").max(255),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  priceRupees: z.number().min(0, "Price must be non-negative"),
  compareAtPriceRupees: z.number().min(0).optional().nullable(),
  costPriceRupees: z.number().min(0).optional().nullable(),
  option1: z.string().max(100).optional().nullable(),
  option2: z.string().max(100).optional().nullable(),
  option3: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  weight: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const ImageInputSchema = z.object({
  id: z.string().uuid().optional(),
  imageUrl: z.string().url("Valid image URL is required"),
  storagePath: z.string().min(1, "Storage path is required"),
  altText: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const ProductCreateSchema = z.object({
  title: z.string().min(2, "Product title must be at least 2 characters").max(500),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(500)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  productType: z.string().max(100).optional().nullable(),
  vendor: z.string().max(255).optional().nullable(),
  brand: z.string().max(255).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  collectionIds: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  basePriceRupees: z.number().min(0, "Base price must be non-negative"),
  compareAtPriceRupees: z.number().min(0).optional().nullable(),
  costPriceRupees: z.number().min(0).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  trackInventory: z.boolean().default(true),
  allowBackorders: z.boolean().default(false),
  lowStockThreshold: z.number().int().min(0).default(5),
  isPhysical: z.boolean().default(true),
  weight: z.number().min(0).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  variants: z.array(VariantInputSchema).default([]),
  images: z.array(ImageInputSchema).default([]),
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  id: z.string().uuid("Invalid product ID"),
});

// ------------------------------------------------------------------------------
// Category Schemas
// ------------------------------------------------------------------------------

export const CategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(255),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

// ------------------------------------------------------------------------------
// Collection Schemas
// ------------------------------------------------------------------------------

export const CollectionSchema = z.object({
  title: z.string().min(2, "Collection title must be at least 2 characters").max(255),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  isAutomatic: z.boolean().default(false),
  rules: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })
    )
    .default([]),
  productIds: z.array(z.string().uuid()).default([]),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

// ------------------------------------------------------------------------------
// Bulk Action Schema
// ------------------------------------------------------------------------------

export const BulkActionSchema = z.object({
  action: z.enum([
    "PUBLISH",
    "UNPUBLISH",
    "ARCHIVE",
    "DELETE",
    "SET_CATEGORY",
    "ADD_TO_COLLECTION",
  ]),
  productIds: z.array(z.string().uuid()).min(1, "Select at least one product"),
  categoryId: z.string().uuid().optional().nullable(),
  collectionId: z.string().uuid().optional().nullable(),
});

// ------------------------------------------------------------------------------
// CSV Row Schema
// ------------------------------------------------------------------------------

export const ProductCsvRowSchema = z.object({
  Title: z.string().min(1, "Title is required"),
  Handle: z.string().optional(),
  Description: z.string().optional(),
  Price: z.string().or(z.number()),
  "Compare At Price": z.string().or(z.number()).optional(),
  "Cost Price": z.string().or(z.number()).optional(),
  SKU: z.string().optional(),
  Barcode: z.string().optional(),
  Category: z.string().optional(),
  Tags: z.string().optional(),
  Status: z.string().optional(),
  "Option1 Name": z.string().optional(),
  "Option1 Value": z.string().optional(),
  "Option2 Name": z.string().optional(),
  "Option2 Value": z.string().optional(),
  "Option3 Name": z.string().optional(),
  "Option3 Value": z.string().optional(),
  "Image URL": z.string().optional(),
});

export type VariantInput = z.input<typeof VariantInputSchema>;
export type ImageInput = z.input<typeof ImageInputSchema>;
export type ProductCreateInput = z.input<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.input<typeof ProductUpdateSchema>;
export type CategoryInput = z.input<typeof CategorySchema>;
export type CollectionInput = z.input<typeof CollectionSchema>;
export type BulkActionInput = z.input<typeof BulkActionSchema>;
export type ProductCsvRow = z.input<typeof ProductCsvRowSchema>;
