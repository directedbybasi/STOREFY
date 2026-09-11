import type {
  PaymentProvider,
  CreatePaymentOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  ProcessRefundParams,
  RefundResult,
  WebhookEventPayload,
} from "../types";

export interface CODConfig {
  enabled: boolean;
  minAmountPaise?: number;
  maxAmountPaise?: number;
}

export class CODPaymentProvider implements PaymentProvider {
  readonly id = "COD" as const;

  constructor(private readonly config: CODConfig) {}

  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
    if (!this.config.enabled) {
      throw new Error("Cash on Delivery is not enabled for this store.");
    }

    if (this.config.minAmountPaise && params.amountPaise < this.config.minAmountPaise) {
      throw new Error(
        `Order amount ₹${(params.amountPaise / 100).toFixed(2)} is below minimum COD threshold ₹${(this.config.minAmountPaise / 100).toFixed(2)}.`
      );
    }

    if (this.config.maxAmountPaise && params.amountPaise > this.config.maxAmountPaise) {
      throw new Error(
        `Order amount ₹${(params.amountPaise / 100).toFixed(2)} exceeds maximum COD limit ₹${(this.config.maxAmountPaise / 100).toFixed(2)}.`
      );
    }

    const gatewayOrderId = `cod_${params.orderNumber}`;
    return {
      gateway: "COD",
      gatewayOrderId,
      amountPaise: params.amountPaise,
      currency: params.currency || "INR",
      clientPayload: {
        gateway: "COD",
        orderNumber: params.orderNumber,
        instructions: "Pay cash to delivery executive upon parcel arrival.",
      },
      status: "PENDING",
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    // For COD, payment is confirmed as PENDING collection at delivery
    return {
      verified: true,
      status: "PENDING",
      gatewayPaymentId: `cod_pending_${params.orderId}`,
      amountPaise: 0,
      currency: "INR",
      paymentMethod: "COD",
    };
  }

  async processRefund(params: ProcessRefundParams): Promise<RefundResult> {
    const gatewayRefundId = `cod_reversal_${Date.now()}`;
    return {
      success: true,
      gatewayRefundId,
      status: "COMPLETED",
      amountPaise: params.amountPaise,
      rawResponse: { note: "Manual cash/NEFT refund recorded for COD order" },
    };
  }

  verifyWebhookSignature(_rawBody: string | Buffer, _headers: Record<string, string>): boolean {
    return false; // COD does not have incoming webhook signatures
  }

  parseWebhookEvent(_rawBody: string | Buffer, _headers: Record<string, string>): WebhookEventPayload {
    throw new Error("COD does not support external webhook events.");
  }
}
