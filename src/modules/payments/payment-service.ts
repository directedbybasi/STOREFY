import { db } from "@/database/client";
import {
  payments,
  paymentAttempts,
  paymentAccounts,
  orders,
  storeSettings,
  webhookEvents,
  refunds,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "@/core/errors";
import { decryptCredentials } from "./vault";
import { RazorpayPaymentProvider } from "./adapters/razorpay";
import { CashfreePaymentProvider } from "./adapters/cashfree";
import { CODPaymentProvider } from "./adapters/cod";
import type {
  PaymentProvider,
  PaymentGatewayType,
  PaymentOrderResult,
  PaymentVerificationResult,
  RefundResult,
  PaymentRecordStatus,
} from "./types";
import type { VerifyPaymentInput } from "./validation";

/**
 * Resolves the instantiated PaymentProvider adapter for a given store.
 */
export async function resolvePaymentProvider(
  storeId: string,
  provider: PaymentGatewayType
): Promise<PaymentProvider> {
  if (provider === "COD") {
    const [settings] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId))
      .limit(1);

    return new CODPaymentProvider({
      enabled: settings?.codEnabled ?? true,
      minAmountPaise: settings?.codMinAmount ?? 0,
      maxAmountPaise: settings?.codMaxAmount ?? 5000000,
    });
  }

  const [account] = await db
    .select()
    .from(paymentAccounts)
    .where(and(eq(paymentAccounts.storeId, storeId), eq(paymentAccounts.provider, provider)))
    .limit(1);

  if (!account || !account.isActive) {
    // If no explicit merchant credentials saved, check environment default test credentials
    if (provider === "RAZORPAY") {
      const defaultKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_storefy_default";
      const defaultKeySecret = process.env.RAZORPAY_KEY_SECRET || "default_test_secret_32bytes_len";
      const defaultWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";
      return new RazorpayPaymentProvider({
        keyId: defaultKeyId,
        keySecret: defaultKeySecret,
        webhookSecret: defaultWebhookSecret,
      });
    }

    if (provider === "CASHFREE") {
      const defaultAppId = process.env.CASHFREE_APP_ID || "cf_test_storefy_default";
      const defaultSecretKey = process.env.CASHFREE_SECRET_KEY || "default_cf_secret_key";
      return new CashfreePaymentProvider({
        appId: defaultAppId,
        secretKey: defaultSecretKey,
        isTestMode: true,
      });
    }

    throw new ValidationError(`Payment provider '${provider}' is not configured or active for this store.`);
  }

  const decrypted = decryptCredentials(account.encryptedCredentials);

  if (provider === "RAZORPAY") {
    return new RazorpayPaymentProvider({
      keyId: decrypted.keyId || "",
      keySecret: decrypted.keySecret || "",
      webhookSecret: decrypted.webhookSecret,
    });
  }

  if (provider === "CASHFREE") {
    return new CashfreePaymentProvider({
      appId: decrypted.appId || "",
      secretKey: decrypted.secretKey || "",
      webhookSecret: decrypted.webhookSecret,
      isTestMode: account.isTestMode,
    });
  }

  throw new ValidationError(`Unsupported payment provider '${provider}'.`);
}

/**
 * Initiates an authoritative payment order for a Storefy order.
 * Prevents duplicate charges via idempotency and validates order state.
 */
export async function initiateOrderPayment(
  storeId: string,
  orderId: string,
  providerType: PaymentGatewayType,
  idempotencyKey?: string
): Promise<PaymentOrderResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found or unauthorized.");
  }

  if (order.paymentStatus === "CAPTURED" || order.status === "DELIVERED") {
    throw new ConflictError("Order has already been paid and captured.");
  }

  if (order.status === "CANCELLED") {
    throw new ConflictError("Cannot initiate payment for a cancelled order.");
  }

  // Idempotency check: if payment already exists with this idempotency key, return existing
  if (idempotencyKey) {
    const [existing] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.idempotencyKey, idempotencyKey)))
      .limit(1);

    if (existing && existing.gatewayOrderId) {
      return {
        gateway: existing.gateway as PaymentGatewayType,
        gatewayOrderId: existing.gatewayOrderId,
        amountPaise: existing.amount,
        currency: existing.currency,
        clientPayload: (existing.metadata as Record<string, unknown>) || {},
        status: existing.status as PaymentRecordStatus,
      };
    }
  }

  const provider = await resolvePaymentProvider(storeId, providerType);

  const orderResult = await provider.createPaymentOrder({
    storeId,
    orderId,
    orderNumber: order.orderNumber,
    amountPaise: order.totalAmount,
    currency: order.currency,
    customer: {
      fullName: order.customerSnapshot.fullName,
      email: order.customerSnapshot.email,
      phone: order.customerSnapshot.phone,
    },
    notes: {
      storeId,
      orderNumber: order.orderNumber,
    },
  });

  // Record payment in payments table
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      storeId,
      orderId,
      gateway: providerType,
      gatewayOrderId: orderResult.gatewayOrderId,
      amount: order.totalAmount,
      currency: order.currency,
      status: orderResult.status,
      idempotencyKey: idempotencyKey || null,
      metadata: orderResult.clientPayload,
    })
    .returning();

  // Record initial payment attempt
  await db.insert(paymentAttempts).values({
    paymentId: paymentRecord.id,
    storeId,
    attemptNumber: 1,
    gateway: providerType,
    status: "INITIATED",
    gatewayOrderId: orderResult.gatewayOrderId,
    rawResponse: orderResult.clientPayload,
  });

  return orderResult;
}

/**
 * Validates payment signature from client callback against authoritative order record.
 * Rejects amount mismatches, forged signatures, and cross-store tampering.
 */
export async function verifyOrderPayment(
  storeId: string,
  input: VerifyPaymentInput
): Promise<PaymentVerificationResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found or unauthorized cross-store access.");
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, input.orderId), eq(payments.storeId, storeId)))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (!payment) {
    throw new NotFoundError("No payment record found for this order.");
  }

  // Authoritative Gateway Order ID Check:
  // Must match STOREFY's recorded gateway order ID, not blind client data
  if (payment.gatewayOrderId && payment.gatewayOrderId !== input.gatewayOrderId) {
    throw new ForbiddenError("Gateway order ID does not match server authoritative record.");
  }

  // Amount check: verify client did not tamper with amount
  const clientReportedAmount = input.rawPayload?.amount;
  if (typeof clientReportedAmount === "number" && clientReportedAmount > 0) {
    if (clientReportedAmount !== order.totalAmount) {
      // Amount mismatch detected!
      await db
        .update(payments)
        .set({
          status: "FAILED",
          failureReason: `Amount mismatch: expected ₹${(order.totalAmount / 100).toFixed(2)}, received ₹${(clientReportedAmount / 100).toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      throw new ValidationError(
        `Payment amount mismatch: order total is ₹${(order.totalAmount / 100).toFixed(2)} but payment reported was ₹${(clientReportedAmount / 100).toFixed(2)}.`
      );
    }
  }

  const provider = await resolvePaymentProvider(storeId, input.provider);

  const verificationResult = await provider.verifyPayment({
    storeId,
    orderId: input.orderId,
    gatewayOrderId: payment.gatewayOrderId || input.gatewayOrderId,
    gatewayPaymentId: input.gatewayPaymentId,
    signature: input.signature,
    rawPayload: input.rawPayload,
  });

  if (!verificationResult.verified || verificationResult.status === "FAILED") {
    await db
      .update(payments)
      .set({
        status: "FAILED",
        failureReason: verificationResult.failureReason || "Cryptographic signature verification failed.",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    return verificationResult;
  }

  // Payment successfully verified by server!
  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({
        status: "CAPTURED",
        gatewayPaymentId: input.gatewayPaymentId,
        capturedAt: new Date(),
        paymentMethod: verificationResult.paymentMethod || payment.paymentMethod || "ONLINE",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await tx
      .update(orders)
      .set({
        paymentStatus: "CAPTURED",
        paymentMethod: input.provider,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  });

  return {
    ...verificationResult,
    amountPaise: order.totalAmount,
    status: "CAPTURED",
  };
}

/**
 * Durable, idempotent webhook event handler.
 * Verifies HMAC signature on raw body, prevents duplicate events, and transitions state monotonically.
 */
export async function handlePaymentWebhook(
  providerType: PaymentGatewayType,
  rawBody: string | Buffer,
  headers: Record<string, string>,
  storeIdFallback?: string
): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  // 1. Resolve candidate provider config for signature checking
  const provider = await resolvePaymentProvider(storeIdFallback || "00000000-0000-0000-0000-000000000000", providerType);

  // 2. Cryptographic signature check
  const isSignatureValid = provider.verifyWebhookSignature(rawBody, headers);
  if (!isSignatureValid) {
    return { success: false, error: "Invalid webhook HMAC signature." };
  }

  // 3. Parse event
  const event = provider.parseWebhookEvent(rawBody, headers);

  // 4. Idempotency deduplication check in webhook_events
  const [existingEvent] = await db
    .select()
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, providerType), eq(webhookEvents.eventId, event.eventId)))
    .limit(1);

  if (existingEvent && (existingEvent.status === "PROCESSED" || existingEvent.status === "PROCESSING")) {
    return { success: true, duplicate: true };
  }

  // 5. Persist event as PROCESSING
  const [persistedEvent] = await db
    .insert(webhookEvents)
    .values({
      provider: providerType,
      eventId: event.eventId,
      eventType: event.eventType,
      signatureVerified: true,
      status: "PROCESSING",
      payload: event.rawPayload,
    })
    .onConflictDoUpdate({
      target: [webhookEvents.provider, webhookEvents.eventId],
      set: {
        attemptCount: (existingEvent?.attemptCount || 0) + 1,
        status: "PROCESSING",
      },
    })
    .returning();

  try {
    // 6. Locate matching payment record
    let matchingPayment: typeof payments.$inferSelect | undefined;

    if (event.gatewayOrderId) {
      const [p] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayOrderId, event.gatewayOrderId))
        .limit(1);
      matchingPayment = p;
    }

    if (!matchingPayment && event.gatewayPaymentId) {
      const [p] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayPaymentId, event.gatewayPaymentId))
        .limit(1);
      matchingPayment = p;
    }

    if (matchingPayment) {
      // Amount mismatch guard: if provider reported an amount, ensure it matches
      if (event.amountPaise && event.amountPaise !== matchingPayment.amount) {
        await db
          .update(payments)
          .set({
            status: "FAILED",
            failureReason: `Webhook reported amount mismatch: ₹${(event.amountPaise / 100).toFixed(2)} vs ₹${(matchingPayment.amount / 100).toFixed(2)}`,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, matchingPayment.id));

        await db
          .update(webhookEvents)
          .set({
            status: "FAILED",
            processingError: "Amount mismatch detected in webhook",
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, persistedEvent.id));

        return { success: false, error: "Amount mismatch in webhook event." };
      }

      // Monotonic State Progression:
      // If payment is already CAPTURED, do not regress to AUTHORIZED or PENDING
      if (matchingPayment.status !== "CAPTURED") {
        if (event.status === "CAPTURED") {
          await db.transaction(async (tx) => {
            await tx
              .update(payments)
              .set({
                status: "CAPTURED",
                gatewayPaymentId: event.gatewayPaymentId || matchingPayment!.gatewayPaymentId,
                capturedAt: new Date(),
                paymentMethod: event.paymentMethod || matchingPayment!.paymentMethod,
                updatedAt: new Date(),
              })
              .where(eq(payments.id, matchingPayment!.id));

            await tx
              .update(orders)
              .set({
                paymentStatus: "CAPTURED",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, matchingPayment!.orderId));
          });
        } else if (event.status === "FAILED") {
          await txUpdatePaymentFailed(matchingPayment.id, event.failureReason);
        }
      }
    }

    // 7. Mark event PROCESSED
    await db
      .update(webhookEvents)
      .set({
        status: "PROCESSED",
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, persistedEvent.id));

    return { success: true };
  } catch (err) {
    await db
      .update(webhookEvents)
      .set({
        status: "FAILED",
        processingError: err instanceof Error ? err.message : "Unknown error",
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, persistedEvent.id));

    return { success: false, error: err instanceof Error ? err.message : "Processing failed" };
  }
}

async function txUpdatePaymentFailed(paymentId: string, reason?: string) {
  await db
    .update(payments)
    .set({
      status: "FAILED",
      failureReason: reason || "Payment failed via gateway webhook.",
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));
}

/**
 * Initiates an external gateway refund for a payment record.
 */
export async function refundOrderPayment(
  storeId: string,
  paymentId: string,
  amountPaise: number,
  reason: string
): Promise<RefundResult> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.storeId, storeId)))
    .limit(1);

  if (!payment) {
    throw new NotFoundError("Payment record not found.");
  }

  if (payment.status !== "CAPTURED") {
    throw new ConflictError("Only captured payments can be refunded.");
  }

  if (amountPaise > payment.amount) {
    throw new ValidationError(
      `Refund amount ₹${(amountPaise / 100).toFixed(2)} cannot exceed captured amount ₹${(payment.amount / 100).toFixed(2)}.`
    );
  }

  const provider = await resolvePaymentProvider(storeId, payment.gateway as PaymentGatewayType);

  const refundResult = await provider.processRefund({
    storeId,
    orderId: payment.orderId,
    paymentId: payment.id,
    gatewayPaymentId: payment.gatewayPaymentId || undefined,
    amountPaise,
    currency: payment.currency,
    reason,
  });

  if (refundResult.success) {
    const isFullRefund = amountPaise >= payment.amount;
    const newStatus: PaymentRecordStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await tx
        .update(orders)
        .set({
          paymentStatus: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, payment.orderId));

      // Record in Phase 9 refunds table
      await tx.insert(refunds).values({
        orderId: payment.orderId,
        storeId,
        amount: amountPaise,
        currency: payment.currency,
        reason,
        status: "COMPLETED",
        gateway: payment.gateway,
        gatewayRefundId: refundResult.gatewayRefundId,
        processedAt: new Date(),
      });
    });
  }

  return refundResult;
}
