import { db } from "@/database/client";
import { riskAssessments, orders, type RiskSignalItem, type RiskScoreLevel, type RiskAction } from "@/database/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export interface AssessRiskInput {
  storeId: string;
  orderId: string;
  customerId?: string;
  orderTotalPaise: number;
  paymentMethod: string;
  ipAddress?: string;
}

export interface RiskEvaluationResult {
  scoreLevel: RiskScoreLevel;
  numericalScore: number;
  actionTaken: RiskAction;
  signals: RiskSignalItem[];
}

/**
 * Deterministic, explainable fraud & risk engine.
 * Computes scores purely from factual historical signals (orders velocity, high value, payment failures, etc.)
 */
export async function assessOrderRisk(input: AssessRiskInput): Promise<RiskEvaluationResult> {
  const { storeId, orderId, customerId, orderTotalPaise, paymentMethod } = input;

  const signals: RiskSignalItem[] = [];
  let score = 0;

  // 1. High Order Value Check (> ₹50,000 = 5,000,000 Paise)
  if (orderTotalPaise >= 5_000_000) {
    score += 25;
    signals.push({
      rule: "HIGH_ORDER_VALUE",
      points: 25,
      severity: "WARNING",
      description: `Order amount (₹${(orderTotalPaise / 100).toFixed(2)}) is unusually high.`,
    });
  }

  // 2. High Velocity Check (More than 3 orders from same customer in last 1 hour)
  if (customerId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.customerId, customerId),
          gte(orders.createdAt, oneHourAgo)
        )
      );

    const orderCount = Number(recentOrders?.count || 0);
    if (orderCount >= 3) {
      score += 35;
      signals.push({
        rule: "HIGH_VELOCITY",
        points: 35,
        severity: "CRITICAL",
        description: `Customer placed ${orderCount} orders within the last hour.`,
      });
    }
  }

  // 3. High-Value COD Risk Check (> ₹15,000 on COD)
  if (paymentMethod === "COD" && orderTotalPaise >= 1_500_000) {
    score += 20;
    signals.push({
      rule: "HIGH_VALUE_COD",
      points: 20,
      severity: "WARNING",
      description: "Cash-on-Delivery selected for an order exceeding ₹15,000.",
    });
  }

  // Determine Level & Action
  let scoreLevel: RiskScoreLevel = "LOW";
  let actionTaken: RiskAction = "ALLOW";

  if (score >= 80) {
    scoreLevel = "BLOCKED";
    actionTaken = "BLOCK";
  } else if (score >= 50) {
    scoreLevel = "HIGH";
    actionTaken = "HOLD";
  } else if (score >= 25) {
    scoreLevel = "MEDIUM";
    actionTaken = "REVIEW";
  }

  // Persist assessment
  await db
    .insert(riskAssessments)
    .values({
      storeId,
      orderId,
      customerId: customerId || null,
      scoreLevel,
      numericalScore: score,
      actionTaken,
      signals,
    })
    .onConflictDoUpdate({
      target: [riskAssessments.storeId, riskAssessments.orderId],
      set: {
        scoreLevel,
        numericalScore: score,
        actionTaken,
        signals,
        evaluatedAt: new Date(),
      },
    });

  return {
    scoreLevel,
    numericalScore: score,
    actionTaken,
    signals,
  };
}
