/**
 * STOREFY — Payment Provider Engine Types
 */

export type PaymentGatewayType = "RAZORPAY" | "CASHFREE" | "COD";

export type PaymentRecordStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface CreatePaymentOrderParams {
  storeId: string;
  orderId: string;
  orderNumber: string;
  amountPaise: number;
  currency: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  notes?: Record<string, string>;
  isTestMode?: boolean;
}

export interface PaymentOrderResult {
  gateway: PaymentGatewayType;
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  clientPayload: Record<string, unknown>; // Safe metadata to send to the storefront browser (e.g. razorpayOrderId, keyId)
  status: PaymentRecordStatus;
}

export interface VerifyPaymentParams {
  storeId: string;
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentRecordStatus;
  gatewayPaymentId: string;
  amountPaise: number;
  currency: string;
  paymentMethod?: string;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ProcessRefundParams {
  storeId: string;
  orderId: string;
  paymentId: string;
  gatewayPaymentId?: string;
  amountPaise: number;
  currency: string;
  reason: string;
  idempotencyKey?: string;
}

export interface RefundResult {
  success: boolean;
  gatewayRefundId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  amountPaise: number;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  provider: PaymentGatewayType;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amountPaise?: number;
  currency?: string;
  status?: PaymentRecordStatus;
  paymentMethod?: string;
  failureReason?: string;
  rawPayload: Record<string, unknown>;
}

/**
 * Universal Provider-Agnostic Payment Interface
 */
export interface PaymentProvider {
  readonly id: PaymentGatewayType;

  /**
   * Initializes a payment order with the external gateway
   */
  createPaymentOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult>;

  /**
   * Cryptographically verifies the customer payment return callback
   */
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;

  /**
   * Processes a refund via the provider API
   */
  processRefund(params: ProcessRefundParams): Promise<RefundResult>;

  /**
   * Validates raw webhook body signature with timing-safe comparison
   */
  verifyWebhookSignature(rawBody: string | Buffer, headers: Record<string, string>): boolean;

  /**
   * Normalizes raw webhook event into canonical event model
   */
  parseWebhookEvent(rawBody: string | Buffer, headers: Record<string, string>): WebhookEventPayload;
}
