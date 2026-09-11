import { z } from "zod";

export const supplierAddressSchema = z.object({
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).nullish(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(4).max(10),
  country: z.string().min(2).max(50).default("India"),
});

export const supplierBankDetailsSchema = z.object({
  accountHolderName: z.string().min(1).max(255),
  accountNumber: z.string().min(5).max(30),
  ifscCode: z.string().min(8).max(15),
  bankName: z.string().min(1).max(255),
  branchName: z.string().max(255).nullish(),
});

export const registerSupplierSchema = z.object({
  businessName: z.string().min(2).max(255),
  displayName: z.string().min(2).max(255),
  contactName: z.string().min(2).max(255),
  email: z.string().email().max(255),
  phone: z.string().min(8).max(32),
  businessAddress: supplierAddressSchema,
  pickupAddress: supplierAddressSchema,
  gstin: z.string().max(20).optional(),
  panNumber: z.string().max(15).optional(),
  bankDetails: supplierBankDetailsSchema.optional(),
  description: z.string().max(2000).optional(),
});

export type RegisterSupplierInput = z.infer<typeof registerSupplierSchema>;

export const updateSupplierProfileSchema = z.object({
  displayName: z.string().min(2).max(255).optional(),
  contactName: z.string().min(2).max(255).optional(),
  phone: z.string().min(8).max(32).optional(),
  businessAddress: supplierAddressSchema.optional(),
  pickupAddress: supplierAddressSchema.optional(),
  gstin: z.string().max(20).optional(),
  panNumber: z.string().max(15).optional(),
  bankDetails: supplierBankDetailsSchema.optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
});

export type UpdateSupplierProfileInput = z.infer<typeof updateSupplierProfileSchema>;

export const verifySupplierSchema = z.object({
  supplierId: z.string().uuid(),
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
  reason: z.string().max(1000).optional(),
});

export type VerifySupplierInput = z.infer<typeof verifySupplierSchema>;
