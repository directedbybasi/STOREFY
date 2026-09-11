import { ValidationError } from "@/core/errors";
import type { OrderStatus, ReturnStatus, FulfillmentStatus } from "./types";

/**
 * Strict server-enforced state machine matrix for Order lifecycle.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RTO"],
  DELIVERED: [], // Terminal lifecycle. Returns are managed via the returns workflow.
  CANCELLED: [], // Terminal
  RTO: [], // Terminal
};

export const ORDER_STATUS_TRANSITIONS = ALLOWED_ORDER_TRANSITIONS;

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // Idempotent same-state
  const allowed = ALLOWED_ORDER_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export const canTransitionOrderStatus = canTransitionOrder;

export function assertValidOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new ValidationError(
      `Invalid order state transition from '${from}' to '${to}'. Allowed transitions: [${(
        ALLOWED_ORDER_TRANSITIONS[from] || []
      ).join(", ")}]`
    );
  }
}

export const validateOrderStatusTransition = assertValidOrderTransition;

/**
 * Strict state transitions for customer returns workflow.
 */
export const RETURN_STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["RECEIVED", "CANCELLED"],
  REJECTED: [],
  RECEIVED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: [],
};

export function canTransitionReturnStatus(from: ReturnStatus, to: ReturnStatus): boolean {
  if (from === to) return true;
  const allowed = RETURN_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Strict state transitions for fulfillment shipments.
 */
export const FULFILLMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  UNFULFILLED: ["PARTIALLY_FULFILLED", "FULFILLED", "SHIPPED", "CANCELLED"],
  PARTIALLY_FULFILLED: ["FULFILLED", "SHIPPED", "CANCELLED"],
  FULFILLED: ["SHIPPED", "DELIVERED", "RTO"],
  SHIPPED: ["DELIVERED", "RTO"],
  DELIVERED: [],
  RTO: [],
  CANCELLED: [],
};

export function canTransitionFulfillmentStatus(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = FULFILLMENT_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * An order can only be cancelled before it has shipped.
 */
export function isOrderCancellable(status: OrderStatus): boolean {
  return ["PENDING", "CONFIRMED", "PROCESSING", "PACKED"].includes(status);
}

/**
 * Customer return requests can only be initiated for delivered orders.
 */
export function isOrderReturnable(status: OrderStatus): boolean {
  return status === "DELIVERED";
}
