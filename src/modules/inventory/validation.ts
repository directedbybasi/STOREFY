import { z } from "zod";

export const INVENTORY_REASONS = [
  "INITIAL_STOCK",
  "SALE",
  "RESERVATION",
  "RELEASE",
  "ADJUSTMENT",
  "RETURN",
  "RESTOCK",
  "DAMAGE",
  "TRANSFER",
  "OTHER",
] as const;

export type InventoryReason = (typeof INVENTORY_REASONS)[number];

export const StockAdjustmentSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantityDelta: z
    .number()
    .int("Quantity must be an integer")
    .refine((val) => val !== 0, "Quantity adjustment cannot be 0"),
  reason: z.enum(INVENTORY_REASONS, {
    errorMap: () => ({ message: "Invalid adjustment reason" }),
  }),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export const BulkInventoryAdjustmentSchema = z.object({
  adjustments: z
    .array(
      z.object({
        variantId: z.string().uuid("Invalid variant ID"),
        quantityDelta: z
          .number()
          .int("Quantity must be an integer")
          .refine((val) => val !== 0, "Quantity adjustment cannot be 0"),
      })
    )
    .min(1, "At least one variant must be selected")
    .max(100, "Cannot adjust more than 100 variants at once"),
  reason: z.enum(INVENTORY_REASONS, {
    errorMap: () => ({ message: "Invalid adjustment reason" }),
  }),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type BulkInventoryAdjustmentInput = z.infer<typeof BulkInventoryAdjustmentSchema>;

export const InventoryThresholdSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  lowStockThreshold: z
    .number()
    .int("Threshold must be an integer")
    .min(0, "Threshold cannot be negative"),
});

export type InventoryThresholdInput = z.infer<typeof InventoryThresholdSchema>;

export const ReservationSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Reservation quantity must be positive"),
  referenceType: z.string().min(1, "Reference type is required").max(50),
  referenceId: z.string().min(1, "Reference ID is required").max(100),
});

export type ReservationInput = z.infer<typeof ReservationSchema>;

export const InventoryFilterSchema = z.object({
  search: z.string().optional(),
  stockStatus: z.enum(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "sku", "available", "on_hand", "reserved"]).default("available"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type InventoryFilterInput = z.infer<typeof InventoryFilterSchema>;
