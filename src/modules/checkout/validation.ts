import { z } from "zod";

export const CheckoutContactSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long")
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
});

export const CheckoutAddressSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long")
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
  addressLine1: z.string().min(5, "Address Line 1 is required").max(500),
  addressLine2: z.string().max(500).optional().nullable(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  postalCode: z
    .string()
    .min(4, "Postal code must be at least 4 characters")
    .max(10, "Postal code is too long")
    .regex(/^[A-Z0-9\s-]+$/i, "Invalid postal code format"),
  country: z.string().min(2).max(100).default("India"),
});

export const CheckoutShippingSchema = z.object({
  shippingMethodId: z.enum(["standard", "express", "free"]),
});

export const CheckoutPaymentSchema = z.object({
  paymentMethod: z.enum(["COD", "ONLINE"]),
});

export type CheckoutContactInput = z.infer<typeof CheckoutContactSchema>;
export type CheckoutAddressInput = z.infer<typeof CheckoutAddressSchema>;
export type CheckoutShippingInput = z.infer<typeof CheckoutShippingSchema>;
export type CheckoutPaymentInput = z.infer<typeof CheckoutPaymentSchema>;
