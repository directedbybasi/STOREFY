import { db } from "@/database/client";
import {
  merchantWebhookEndpoints,
  merchantWebhookDeliveries,
  type MerchantWebhookEndpoint,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHmac, createHash, randomBytes } from "node:crypto";
import { recordAuditLog } from "../audit/audit-service";
import type { RegisterWebhookEndpointInput } from "./types";

/**
 * Computes SHA-256 hash of webhook secret.
 */
function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Generates an HMAC-SHA256 signature for outbound webhook delivery.
 */
export function signWebhookPayload(
  payloadString: string,
  rawSecret: string,
  timestamp: number
): string {
  const data = `${timestamp}.${payloadString}`;
  return createHmac("sha256", rawSecret).update(data).digest("hex");
}

/**
 * Registers an outbound webhook endpoint for merchant events.
 * Displays raw secret strictly once.
 */
export async function registerWebhookEndpoint(
  input: RegisterWebhookEndpointInput,
  actorUserId?: string
): Promise<{ endpoint: MerchantWebhookEndpoint; rawSecret: string }> {
  const secretPart = randomBytes(24).toString("hex");
  const rawSecret = `whsec_${secretPart}`;
  const secretKeyHash = hashSecret(rawSecret);
  const secretPreview = `whsec_••••${rawSecret.slice(-4)}`;

  const [endpoint] = await db
    .insert(merchantWebhookEndpoints)
    .values({
      storeId: input.storeId,
      url: input.url,
      description: input.description,
      eventTypes: input.eventTypes,
      secretKeyHash,
      secretPreview,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "webhook:register_endpoint",
      entity: "merchant_webhook_endpoint",
      entityId: endpoint.id,
      after: { url: endpoint.url, eventTypes: input.eventTypes },
    });
  }

  return { endpoint, rawSecret };
}

/**
 * Dispatches an event to all subscribed merchant webhook endpoints.
 */
export async function dispatchWebhookEvent(
  storeId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<number> {
  const endpoints = await db
    .select()
    .from(merchantWebhookEndpoints)
    .where(
      and(
        eq(merchantWebhookEndpoints.storeId, storeId),
        eq(merchantWebhookEndpoints.status, "ACTIVE")
      )
    );

  const matched = endpoints.filter((ep) =>
    ep.eventTypes.includes(eventType) || ep.eventTypes.includes("*")
  );

  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  for (const ep of matched) {
    // Standard signature header calculation
    const signature = signWebhookPayload(payloadString, ep.secretKeyHash, timestamp);

    await db.insert(merchantWebhookDeliveries).values({
      storeId,
      endpointId: ep.id,
      eventType,
      payload,
      signature: `t=${timestamp},v1=${signature}`,
      status: "PENDING",
    });
  }

  return matched.length;
}

/**
 * Lists registered webhook endpoints for a store.
 */
export async function listWebhookEndpoints(storeId: string) {
  return await db
    .select()
    .from(merchantWebhookEndpoints)
    .where(eq(merchantWebhookEndpoints.storeId, storeId));
}

/**
 * Lists webhook deliveries for monitoring.
 */
export async function listWebhookDeliveries(storeId: string, endpointId?: string) {
  const conditions = [eq(merchantWebhookDeliveries.storeId, storeId)];
  if (endpointId) {
    conditions.push(eq(merchantWebhookDeliveries.endpointId, endpointId));
  }

  return await db
    .select()
    .from(merchantWebhookDeliveries)
    .where(and(...conditions))
    .orderBy(desc(merchantWebhookDeliveries.createdAt))
    .limit(50);
}
