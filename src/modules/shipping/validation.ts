import { z } from "zod";

export const CarrierEnum = z.enum(["SHIPROCKET", "DELHIVERY", "MANUAL"]);

export const OriginAddressSchema = z.object({
  name: z.string().min(2, "Origin contact name is required"),
  company: z.string().optional(),
  phone: z.string().min(10, "Valid 10-digit phone is required"),
  email: z.string().email().optional(),
  addressLine1: z.string().min(5, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(6, "Valid 6-digit PIN code is required"),
  country: z.string().default("India"),
});

export const SaveShippingAccountSchema = z.object({
  carrier: CarrierEnum,
  isTestMode: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  originAddress: OriginAddressSchema,
  credentials: z.record(z.string()).optional(),
});

export const GetShippingRatesSchema = z.object({
  destinationPostalCode: z.string().min(6, "Postal code required"),
  weightGrams: z.number().int().positive().default(500),
  cod: z.boolean().default(false),
  declaredValuePaise: z.number().int().nonnegative().default(0),
});

export const CreateCarrierShipmentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  fulfillmentId: z.string().uuid().optional(),
  carrier: CarrierEnum,
  weightGrams: z.number().int().positive().default(500),
});

export type SaveShippingAccountInput = z.infer<typeof SaveShippingAccountSchema>;
export type GetShippingRatesInput = z.infer<typeof GetShippingRatesSchema>;
export type CreateCarrierShipmentInput = z.infer<typeof CreateCarrierShipmentSchema>;
