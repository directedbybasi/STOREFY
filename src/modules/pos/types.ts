import { z } from "zod";

export const OpenPosSessionSchema = z.object({
  storeId: z.string().uuid(),
  locationId: z.string().uuid(),
  openingCashPaise: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export type OpenPosSessionInput = z.infer<typeof OpenPosSessionSchema>;

export const ClosePosSessionSchema = z.object({
  storeId: z.string().uuid(),
  sessionId: z.string().uuid(),
  countedCashPaise: z.number().int().min(0),
  notes: z.string().optional(),
});

export type ClosePosSessionInput = z.infer<typeof ClosePosSessionSchema>;

export const PosCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  customDiscountPaise: z.number().int().min(0).default(0),
});

export const CreatePosSaleSchema = z.object({
  storeId: z.string().uuid(),
  posSessionId: z.string().uuid(),
  locationId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  items: z.array(PosCartItemSchema).min(1),
  paymentMethod: z.enum(["CASH", "CARD", "GIFT_CARD", "STORE_CREDIT", "LOYALTY"]),
  tenderAmountPaise: z.number().int().min(0),
  notes: z.string().optional(),
});

export type CreatePosSaleInput = z.infer<typeof CreatePosSaleSchema>;

export interface PosReceiptSnapshot {
  orderId: string;
  orderNumber: string;
  storeId: string;
  locationId: string;
  cashierUserId: string;
  paymentMethod: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  tenderAmountPaise: number;
  changePaise: number;
  items: {
    title: string;
    variantTitle: string;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  customerName?: string;
  timestamp: string;
}
