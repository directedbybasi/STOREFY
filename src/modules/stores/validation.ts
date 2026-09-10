import { z } from "zod";

export const StoreSettingsSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters").max(255),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  currency: z.string().length(3, "Currency code must be 3 characters").default("INR"),
  timezone: z.string().min(2).default("Asia/Kolkata"),
  isActive: z.boolean().default(true),
  logoUrl: z.string().nullable().optional(),
  whatsappOrderPhone: z.string().max(32).nullable().optional(),
  whatsappOrderEnabled: z.boolean().default(false),
  whatsappSupportPhone: z.string().max(32).nullable().optional(),
  whatsappSupportEnabled: z.boolean().default(false),
  codEnabled: z.boolean().default(true),
  codMinAmountRupees: z.number().min(0).default(0),
  codMaxAmountRupees: z.number().min(0).max(500000).default(50000), // Max ₹5,00,000
  taxInclusive: z.boolean().default(true),
  orderIdPrefix: z.string().min(1).max(10).default("ORD-"),
  invoicePrefix: z.string().min(1).max(10).default("INV-"),
});

export type StoreSettingsInput = z.infer<typeof StoreSettingsSchema>;
