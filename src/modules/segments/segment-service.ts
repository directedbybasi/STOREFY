import { db } from "@/database/client";
import { customerSegments, customers } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import type { SegmentCondition } from "@/database/schema";
import { NotFoundError } from "@/core/errors";

/**
 * Pure helper to evaluate whether a customer matches a list of segment conditions.
 */
export function isCustomerMatchingConditions(
  customer: {
    totalSpent: number;
    ordersCount: number;
    lastOrderAt: Date | null;
    createdAt: Date;
  },
  conditions: SegmentCondition[]
): boolean {
  if (!conditions || conditions.length === 0) return true;

  const now = Date.now();

  for (const cond of conditions) {
    let customerVal: unknown;

    if (cond.field === "totalSpent") customerVal = customer.totalSpent;
    else if (cond.field === "ordersCount") customerVal = customer.ordersCount;
    else if (cond.field === "aov") {
      customerVal = customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount) : 0;
    } else if (cond.field === "lastOrderDaysAgo") {
      customerVal = customer.lastOrderAt
        ? Math.floor((now - customer.lastOrderAt.getTime()) / (24 * 60 * 60 * 1000))
        : 99999;
    } else if (cond.field === "firstOrderDaysAgo") {
      customerVal = Math.floor((now - customer.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    }

    switch (cond.operator) {
      case "equals":
        if (customerVal !== cond.value) return false;
        break;
      case "not_equals":
        if (customerVal === cond.value) return false;
        break;
      case "greater_than":
        if (typeof customerVal !== "number" || typeof cond.value !== "number" || customerVal <= cond.value) {
          return false;
        }
        break;
      case "less_than":
        if (typeof customerVal !== "number" || typeof cond.value !== "number" || customerVal >= cond.value) {
          return false;
        }
        break;
      case "in":
        if (!Array.isArray(cond.value) || !cond.value.includes(customerVal)) {
          return false;
        }
        break;
      default:
        return false;
    }
  }

  return true;
}

/**
 * Dynamically evaluates customer membership for a segment and refreshes the member count.
 */
export async function evaluateSegmentMembers(storeId: string, segmentId: string) {
  const [segment] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.storeId, storeId), eq(customerSegments.id, segmentId)))
    .limit(1);

  if (!segment) {
    throw new NotFoundError("Customer segment not found.");
  }

  const allCustomers = await db
    .select({
      id: customers.id,
      totalSpent: customers.totalSpent,
      ordersCount: customers.ordersCount,
      lastOrderAt: customers.lastOrderAt,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(eq(customers.storeId, storeId));

  const matchingCustomers = allCustomers.filter((c) =>
    isCustomerMatchingConditions(
      {
        totalSpent: Number(c.totalSpent || 0),
        ordersCount: Number(c.ordersCount || 0),
        lastOrderAt: c.lastOrderAt,
        createdAt: c.createdAt,
      },
      segment.conditions
    )
  );

  const memberCount = matchingCustomers.length;

  await db
    .update(customerSegments)
    .set({ memberCount, updatedAt: new Date() })
    .where(eq(customerSegments.id, segmentId));

  return { segmentId, memberCount, customerIds: matchingCustomers.map((c) => c.id) };
}
