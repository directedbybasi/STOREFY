import { z } from "zod";

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(2, "Coupon code must be at least 2 characters")
    .max(50, "Coupon code must not exceed 50 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "BOGO", "FREE_SHIPPING"]),
  value: z
    .number()
    .min(0, "Value must be non-negative")
    .refine((v) => Number.isInteger(v), "Value must be an integer"),
  minSpendAmount: z.number().int().min(0).default(0), // in Paise
  maxDiscountAmount: z.number().int().min(0).nullable().optional(), // in Paise
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).default(1),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  targetType: z.enum(["ALL", "PRODUCTS", "CATEGORIES", "COLLECTIONS"]).default("ALL"),
  targetIds: z.array(z.string().uuid()).default([]),
  bogoConfig: z
    .object({
      buyQuantity: z.number().int().min(1),
      getQuantity: z.number().int().min(1),
      rewardProductId: z.string().uuid().optional(),
      rewardVariantId: z.string().uuid().optional(),
    })
    .nullable()
    .optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(100),
  checkoutSessionId: z.string().uuid("Invalid checkout session ID"),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
