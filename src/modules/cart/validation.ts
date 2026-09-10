import { z } from "zod";

export const AddToCartSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID format"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(99, "Maximum quantity per item is 99"),
});

export const UpdateCartItemQuantitySchema = z.object({
  variantId: z.string().uuid("Invalid variant ID format"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(99, "Maximum quantity per item is 99"),
});

export const RemoveCartItemSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID format"),
});

export const MergeCartSchema = z.object({
  guestSessionToken: z.string().min(10, "Invalid guest session token"),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemQuantityInput = z.infer<typeof UpdateCartItemQuantitySchema>;
export type RemoveCartItemInput = z.infer<typeof RemoveCartItemSchema>;
export type MergeCartInput = z.infer<typeof MergeCartSchema>;
