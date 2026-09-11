import type { AutomationCondition, AutomationActionStep } from "@/database/schema";

export interface TriggerEventInput {
  storeId: string;
  eventName: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  depth?: number;
}

export interface AutomationExecutionResult {
  automationId: string;
  automationName: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  actionsExecuted: number;
  error?: string;
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  triggerEvent: string;
  conditions: AutomationCondition[];
  actions: AutomationActionStep[];
}
