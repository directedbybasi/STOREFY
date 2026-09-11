import { z } from "zod";

export const PaymentProviderEnum = z.enum(["RAZORPAY", "CASHFREE", "COD"]);

export const RazorpayCredentialsSchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  keySecret: z.string().min(1, "Key Secret is required"),
  webhookSecret: z.string().optional(),
});

export const CashfreeCredentialsSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  secretKey: z.string().min(1, "Secret Key is required"),
  webhookSecret: z.string().optional(),
});

export const SavePaymentAccountSchema = z.object({
  provider: PaymentProviderEnum,
  isTestMode: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  // Either updated credentials object or existing masked placeholders
  credentials: z.record(z.string()).optional(),
});

export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  provider: PaymentProviderEnum,
  idempotencyKey: z.string().optional(),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  provider: PaymentProviderEnum,
  gatewayOrderId: z.string().min(1, "Gateway order ID is required"),
  gatewayPaymentId: z.string().min(1, "Gateway payment ID is required"),
  signature: z.string().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export const ProcessPaymentRefundSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  amountPaise: z.number().int().positive("Refund amount must be greater than 0"),
  reason: z.string().min(1, "Refund reason is required"),
});

export type SavePaymentAccountInput = z.infer<typeof SavePaymentAccountSchema>;
export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type ProcessPaymentRefundInput = z.infer<typeof ProcessPaymentRefundSchema>;
