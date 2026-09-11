export interface MarketplaceOrderTaskDTO {
  id: string;
  orderId: string;
  orderNumber?: string;
  orderItemId: string;
  storeId: string;
  marketplace: string;
  sourceProductId: string;
  sourceVariantId: string | null;
  productTitle: string;
  quantity: number;
  status: string; // PENDING, ORDERED, SHIPPED, DELIVERED, CANCELLED, RTO
  sourceOrderId: string | null;
  sourceOrderReference: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  notes: string | null;
  sourceCostPaise: number;
  shippingAddress: Record<string, unknown>;
  orderedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}
