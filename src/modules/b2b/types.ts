import { z } from "zod";

export const CreateB2bCompanySchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(2),
  code: z.string().min(2),
  taxId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  creditLimitPaise: z.number().int().min(0).default(0),
  paymentTerms: z.enum(["PREPAID", "NET_7", "NET_15", "NET_30", "NET_60"]).default("PREPAID"),
  billingAddress: z.record(z.unknown()).optional(),
  shippingAddresses: z.array(z.record(z.unknown())).optional(),
  notes: z.string().optional(),
});

export type CreateB2bCompanyInput = z.infer<typeof CreateB2bCompanySchema>;

export const AddB2bUserSchema = z.object({
  storeId: z.string().uuid(),
  companyId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["COMPANY_ADMIN", "APPROVER", "BUYER"]).default("BUYER"),
});

export type AddB2bUserInput = z.infer<typeof AddB2bUserSchema>;

export const CreateB2bPriceListSchema = z.object({
  storeId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  name: z.string().min(2),
  code: z.string().min(2),
  currency: z.string().length(3).default("INR"),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
      minQuantity: z.number().int().min(1).default(1),
      pricePaise: z.number().int().min(0),
    })
  ).default([]),
});

export type CreateB2bPriceListInput = z.infer<typeof CreateB2bPriceListSchema>;

export const SubmitB2bOrderSchema = z.object({
  storeId: z.string().uuid(),
  companyId: z.string().uuid(),
  orderId: z.string().uuid(),
  poNumber: z.string().optional(),
  requiresApproval: z.boolean().default(false),
});

export type SubmitB2bOrderInput = z.infer<typeof SubmitB2bOrderSchema>;
