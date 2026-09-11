import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { customers } from "./customers";

export type RiskScoreLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
export type RiskAction = "ALLOW" | "REVIEW" | "HOLD" | "BLOCK";

export interface RiskSignalItem {
  rule: string;
  points: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  description: string;
}

/**
 * Domain 15: Fraud & Risk Assessments
 * Deterministic, explainable risk scoring on completed/attempted orders.
 */
export const riskAssessments = pgTable(
  "risk_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    scoreLevel: varchar("score_level", { length: 50 })
      .$type<RiskScoreLevel>()
      .notNull()
      .default("LOW"),
    numericalScore: integer("numerical_score").notNull().default(0), // 0 to 100
    actionTaken: varchar("action_taken", { length: 50 })
      .$type<RiskAction>()
      .notNull()
      .default("ALLOW"),
    signals: jsonb("signals").$type<RiskSignalItem[]>().notNull().default([]),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_risk_assessments_order").on(table.storeId, table.orderId),
    index("idx_risk_assessments_store_level").on(table.storeId, table.scoreLevel),
    index("idx_risk_assessments_created").on(table.storeId, table.createdAt),
  ]
);

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type NewRiskAssessment = typeof riskAssessments.$inferInsert;
