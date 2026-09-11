"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { requirePermission } from "@/core/tenant/rbac";
import {
  createOrderFromCheckoutSession,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  listStoreOrders,
  listCustomerOrders,
} from "./order-service";
import { createFulfillment, updateFulfillmentStatus } from "./fulfillment-service";
import {
  requestReturn,
  reviewReturn,
  receiveReturn,
  checkReturnEligibility,
  listStoreReturns,
} from "./returns-service";
import { processRefund } from "./refund-service";
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema,
  CreateFulfillmentSchema,
  UpdateFulfillmentStatusSchema,
  RequestReturnSchema,
  ReviewReturnSchema,
  ReceiveReturnSchema,
  ProcessRefundSchema,
  type OrderStatusEnum,
} from "./validation";
import type { OrderStatus } from "./types";
import { ValidationError } from "@/core/errors";

/**
 * Storefront Action: Place order from confirmed checkout session.
 */
export async function createStorefrontOrderAction(
  checkoutSessionId: string,
  domain: string
) {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Active store not found for this domain.");
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("storefy_cart_token")?.value;
    if (!sessionToken) {
      throw new ValidationError("Missing active cart session token.");
    }

    const order = await createOrderFromCheckoutSession(
      resolution.store.id,
      checkoutSessionId,
      sessionToken
    );

    revalidatePath(`/${domain}/checkout`);
    revalidatePath(`/${domain}/account/orders`);

    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create order.",
    };
  }
}

/**
 * Storefront Action: Get order details.
 */
export async function getStorefrontOrderAction(orderId: string, domain: string) {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Active store not found.");
    }

    const order = await getOrderById(resolution.store.id, orderId);
    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load order.",
    };
  }
}

/**
 * Storefront Action: Check return eligibility.
 */
export async function checkStorefrontReturnEligibilityAction(
  orderId: string,
  domain: string,
  customerId?: string | null
) {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Active store not found.");
    }

    const eligibility = await checkReturnEligibility(
      resolution.store.id,
      orderId,
      customerId
    );

    return { success: true as const, eligibility };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to check eligibility.",
    };
  }
}

/**
 * Storefront Action: Request return.
 */
export async function requestStorefrontReturnAction(
  rawInput: unknown,
  domain: string,
  customerId?: string | null
) {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      throw new ValidationError("Active store not found.");
    }

    const parsed = RequestReturnSchema.parse(rawInput);
    const returnReq = await requestReturn(resolution.store.id, parsed, customerId);

    revalidatePath(`/${domain}/account/orders/${parsed.orderId}`);

    return { success: true as const, returnReq };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to submit return request.",
    };
  }
}

/**
 * Merchant Dashboard Action: Update Order Status.
 */
export async function updateDashboardOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  note?: string
) {
  try {
    const ctx = await requirePermission("orders:write");
    const order = await updateOrderStatus(ctx.store.id, orderId, status, note, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/orders`);
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}

/**
 * Merchant Dashboard Action: Create Fulfillment.
 */
export async function createDashboardFulfillmentAction(
  orderId: string,
  rawInput: unknown
) {
  try {
    const ctx = await requirePermission("orders:write");
    const parsed = CreateFulfillmentSchema.parse(rawInput);

    const order = await createFulfillment(ctx.store.id, orderId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/orders`);
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create shipment.",
    };
  }
}

/**
 * Merchant Dashboard Action: Update Fulfillment Status.
 */
export async function updateDashboardFulfillmentStatusAction(
  fulfillmentId: string,
  rawInput: unknown
) {
  try {
    const ctx = await requirePermission("orders:write");
    const parsed = UpdateFulfillmentStatusSchema.parse(rawInput);

    const order = await updateFulfillmentStatus(ctx.store.id, fulfillmentId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/orders`);
    revalidatePath(`/dashboard/orders/${order.id}`);

    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update fulfillment status.",
    };
  }
}

/**
 * Merchant Dashboard Action: Cancel Order.
 */
export async function cancelDashboardOrderAction(orderId: string, reason: string) {
  try {
    const ctx = await requirePermission("orders:write");
    const order = await cancelOrder(ctx.store.id, orderId, reason, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/orders`);
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true as const, order };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to cancel order.",
    };
  }
}

/**
 * Merchant Dashboard Action: Review Return.
 */
export async function reviewDashboardReturnAction(returnId: string, rawInput: unknown) {
  try {
    const ctx = await requirePermission("orders:write");
    const parsed = ReviewReturnSchema.parse(rawInput);

    const ret = await reviewReturn(ctx.store.id, returnId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/returns`);
    revalidatePath(`/dashboard/orders/${ret.orderId}`);

    return { success: true as const, returnReq: ret };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to review return.",
    };
  }
}

/**
 * Merchant Dashboard Action: Receive Return with Restock option.
 */
export async function receiveDashboardReturnAction(returnId: string, rawInput: unknown) {
  try {
    const ctx = await requirePermission("orders:write");
    const parsed = ReceiveReturnSchema.parse(rawInput);

    const ret = await receiveReturn(ctx.store.id, returnId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/returns`);
    revalidatePath(`/dashboard/orders/${ret.orderId}`);
    revalidatePath(`/dashboard/inventory`);

    return { success: true as const, returnReq: ret };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to receive return.",
    };
  }
}

/**
 * Merchant Dashboard Action: Process Refund.
 */
export async function processDashboardRefundAction(refundId: string, rawInput: unknown) {
  try {
    const ctx = await requirePermission("orders:write");
    const parsed = ProcessRefundSchema.parse(rawInput || {});

    const refund = await processRefund(ctx.store.id, refundId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    revalidatePath(`/dashboard/returns`);
    revalidatePath(`/dashboard/orders/${refund.orderId}`);

    return { success: true as const, refund };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to process refund.",
    };
  }
}
