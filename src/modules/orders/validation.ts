import { z } from "zod";

export const CreateOrderSchema = z.object({
  checkoutSessionId: z.string().uuid("Invalid checkout session ID"),
});

export const OrderStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RTO",
]);

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusEnum,
  note: z.string().max(500).optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters").max(500),
});

export const CreateFulfillmentSchema = z.object({
  carrier: z.string().min(2, "Carrier name is required").max(100),
  trackingNumber: z.string().max(255).optional(),
  trackingUrl: z.string().url("Invalid tracking URL format").max(1000).optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid("Invalid order item ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one item must be fulfilled"),
});

export const UpdateFulfillmentStatusSchema = z.object({
  status: z.enum([
    "MANIFESTED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "RTO_INITIATED",
    "RTO_DELIVERED",
  ]),
  rtoReason: z.string().max(500).optional(),
});

export const RequestReturnSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid("Invalid order item ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        reason: z.string().max(255).optional(),
      })
    )
    .min(1, "Select at least one item to return"),
});

export const ReviewReturnSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  merchantNotes: z.string().max(1000).optional(),
});

export const ReceiveReturnSchema = z.object({
  restockAction: z.enum(["RESTOCK", "NO_RESTOCK"]),
  merchantNotes: z.string().max(1000).optional(),
});

export const ProcessRefundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
  gatewayRefundId: z.string().max(255).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type CreateFulfillmentInput = z.infer<typeof CreateFulfillmentSchema>;
export type UpdateFulfillmentStatusInput = z.infer<typeof UpdateFulfillmentStatusSchema>;
export type RequestReturnInput = z.infer<typeof RequestReturnSchema>;
export type ReviewReturnInput = z.infer<typeof ReviewReturnSchema>;
export type ReceiveReturnInput = z.infer<typeof ReceiveReturnSchema>;
export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;
