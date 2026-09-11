import type {
  Order,
  OrderItem,
  OrderStatusHistory,
  Fulfillment,
  Return,
  Refund,
  Invoice,
  OrderAddressSnapshot,
  OrderCustomerSnapshot,
  InvoiceTaxBreakdown,
} from "@/database/schema/orders";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RTO";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type FulfillmentStatus =
  | "UNFULFILLED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "RETURNED";

export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "RECEIVED"
  | "REFUNDED"
  | "CANCELLED";

export type RefundStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  fulfilledQuantity: number;
  returnedQuantity: number;
  remainingEligibleReturnQuantity: number;
  unitPricePaise: number;
  unitPriceFormatted: string;
  subtotalPaise: number;
  subtotalFormatted: string;
  taxPaise: number;
  taxFormatted: string;
  totalPaise: number;
  totalFormatted: string;
}

export interface OrderStatusHistoryDTO {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM";
  createdAt: Date;
}

export interface FulfillmentDTO {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  rtoReason: string | null;
  notes: string | null;
  items: Array<{
    orderItemId: string;
    quantity: number;
    title: string;
    variantTitle: string;
  }>;
  createdAt: Date;
}

export interface ReturnItemDTO {
  id: string;
  orderItemId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  reason: string | null;
}

export interface ReturnDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  returnNumber: string;
  customerId: string | null;
  status: ReturnStatus;
  reason: string;
  notes: string | null;
  merchantNotes: string | null;
  restockAction: "RESTOCK" | "NO_RESTOCK";
  items: ReturnItemDTO[];
  createdAt: Date;
}

export interface RefundDTO {
  id: string;
  orderId: string;
  returnId: string | null;
  amountPaise: number;
  amountFormatted: string;
  currency: string;
  reason: string;
  status: RefundStatus;
  gateway: string;
  gatewayRefundId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface InvoiceDTO {
  id: string;
  orderId: string;
  invoiceNumber: string;
  sellerDetails: {
    storeName: string;
    gstin?: string | null;
    address: string;
    email?: string | null;
    phone?: string | null;
  };
  buyerDetails: {
    name: string;
    billingAddress: OrderAddressSnapshot;
    email?: string | null;
    phone?: string | null;
  };
  taxBreakdown: InvoiceTaxBreakdown;
  subtotalPaise: number;
  subtotalFormatted: string;
  taxPaise: number;
  taxFormatted: string;
  shippingPaise: number;
  shippingFormatted: string;
  totalPaise: number;
  totalFormatted: string;
  createdAt: Date;
}

export interface OrderDetailDTO {
  id: string;
  storeId: string;
  orderNumber: string;
  customerId: string | null;
  checkoutSessionId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  subtotalPaise: number;
  subtotalFormatted: string;
  discountPaise: number;
  discountFormatted: string;
  taxPaise: number;
  taxFormatted: string;
  shippingPaise: number;
  shippingFormatted: string;
  totalPaise: number;
  totalFormatted: string;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot;
  customer: OrderCustomerSnapshot;
  notes: string | null;
  internalNotes: string | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  items: OrderItemDTO[];
  history: OrderStatusHistoryDTO[];
  fulfillments: FulfillmentDTO[];
  returns: ReturnDTO[];
  refunds: RefundDTO[];
  invoice: InvoiceDTO | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSummaryDTO {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  fulfillmentStatus: FulfillmentStatus;
  itemsCount: number;
  totalPaise: number;
  totalFormatted: string;
  createdAt: Date;
}

export interface OrderListQueryFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
