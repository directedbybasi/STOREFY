import { db } from "@/database/client";
import {
  shippingAccounts,
  shipments,
  shipmentTrackingEvents,
  fulfillments,
  orders,
  orderItems,
  webhookEvents,
  inventoryMovements,
  inventory,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";
import { decryptCredentials } from "../payments/vault";
import { ShiprocketShippingProvider } from "./adapters/shiprocket";
import { DelhiveryShippingProvider } from "./adapters/delhivery";
import type {
  ShippingProvider,
  ShippingCarrierType,
  ShippingRateResult,
  ShipmentResult,
  TrackingResult,
  CarrierShipmentStatus,
} from "./types";

// Short-lived rate cache (5 minutes)
const rateCache = new Map<string, { timestamp: number; rates: ShippingRateResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveShippingProvider(
  storeId: string,
  carrier: ShippingCarrierType
): Promise<ShippingProvider> {
  const [account] = await db
    .select()
    .from(shippingAccounts)
    .where(and(eq(shippingAccounts.storeId, storeId), eq(shippingAccounts.carrier, carrier)))
    .limit(1);

  if (carrier === "SHIPROCKET") {
    let creds: Record<string, string | undefined> = {};
    if (account?.encryptedCredentials) {
      try {
        creds = decryptCredentials(account.encryptedCredentials);
      } catch {
        creds = {};
      }
    }
    return new ShiprocketShippingProvider({
      apiToken: creds.apiToken || process.env.SHIPROCKET_API_TOKEN,
      webhookToken: creds.webhookToken,
      isTestMode: account?.isTestMode ?? true,
    });
  }

  if (carrier === "DELHIVERY") {
    let creds: Record<string, string | undefined> = {};
    if (account?.encryptedCredentials) {
      try {
        creds = decryptCredentials(account.encryptedCredentials);
      } catch {
        creds = {};
      }
    }
    return new DelhiveryShippingProvider({
      apiToken: creds.apiToken || process.env.DELHIVERY_API_TOKEN,
      isTestMode: account?.isTestMode ?? true,
    });
  }

  throw new ValidationError(`Unsupported carrier '${carrier}'.`);
}

/**
 * Calculates live shipping rates with short-lived cache.
 */
export async function fetchLiveShippingRates(
  storeId: string,
  destinationPostalCode: string,
  weightGrams = 500,
  cod = false,
  declaredValuePaise = 0
): Promise<ShippingRateResult[]> {
  const cacheKey = `${storeId}_${destinationPostalCode}_${weightGrams}_${cod}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  // Retrieve origin address from store's configured carrier account or fallback
  const [account] = await db
    .select()
    .from(shippingAccounts)
    .where(and(eq(shippingAccounts.storeId, storeId), eq(shippingAccounts.isActive, true)))
    .limit(1);

  const originPostalCode = account?.originAddress?.postalCode || "110001";

  try {
    const carrier = (account?.carrier as ShippingCarrierType) || "SHIPROCKET";
    const provider = await resolveShippingProvider(storeId, carrier);
    const rates = await provider.calculateRates({
      storeId,
      originPostalCode,
      destinationPostalCode,
      weightGrams,
      cod,
      declaredValuePaise,
    });

    rateCache.set(cacheKey, { timestamp: Date.now(), rates });
    return rates;
  } catch {
    // Fallback store rates
    const fallbackRates: ShippingRateResult[] = [
      {
        carrier: "MANUAL",
        courierName: "Standard Surface Delivery",
        ratePaise: 5000, // ₹50.00
        estimatedDeliveryDays: 4,
        serviceType: "STANDARD",
      },
      {
        carrier: "MANUAL",
        courierName: "Express Air Delivery",
        ratePaise: 10000, // ₹100.00
        estimatedDeliveryDays: 2,
        serviceType: "EXPRESS",
      },
    ];
    rateCache.set(cacheKey, { timestamp: Date.now(), rates: fallbackRates });
    return fallbackRates;
  }
}

/**
 * Generates an external carrier shipment for an order/fulfillment.
 * Enforces duplicate click idempotency.
 */
export async function createOrderShipment(
  storeId: string,
  orderId: string,
  carrier: ShippingCarrierType,
  fulfillmentId?: string,
  weightGrams = 500
): Promise<ShipmentResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found or unauthorized cross-store access.");
  }

  // Duplicate shipment guard
  if (fulfillmentId) {
    const [existing] = await db
      .select()
      .from(shipments)
      .where(and(eq(shipments.storeId, storeId), eq(shipments.fulfillmentId, fulfillmentId)))
      .limit(1);

    if (existing && existing.awb) {
      return {
        carrier: existing.carrier as ShippingCarrierType,
        carrierShipmentId: existing.carrierShipmentId || existing.id,
        carrierOrderId: existing.carrierOrderId || undefined,
        awb: existing.awb,
        labelUrl: existing.labelUrl || undefined,
        trackingUrl: existing.trackingUrl || undefined,
        shippingCostPaise: existing.shippingCostPaise,
        status: existing.carrierStatus as CarrierShipmentStatus,
      };
    }
  }

  // Retrieve origin details
  const [account] = await db
    .select()
    .from(shippingAccounts)
    .where(and(eq(shippingAccounts.storeId, storeId), eq(shippingAccounts.carrier, carrier)))
    .limit(1);

  const origin = account?.originAddress || {
    name: "Warehouse Dispatch",
    phone: "9876543210",
    addressLine1: "Central Logistics Hub",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110001",
  };

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  const provider = await resolveShippingProvider(storeId, carrier);
  const result = await provider.createShipment({
    storeId,
    orderId,
    orderNumber: order.orderNumber,
    customer: {
      fullName: order.customerSnapshot.fullName,
      phone: order.customerSnapshot.phone,
      email: order.customerSnapshot.email,
      addressLine1: order.shippingAddress.addressLine1,
      addressLine2: order.shippingAddress.addressLine2,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
    origin,
    items: items.map((i) => ({
      name: i.title,
      sku: i.sku,
      units: i.quantity,
      sellingPricePaise: i.unitPrice,
    })),
    totalAmountPaise: order.totalAmount,
    weightGrams,
    paymentMethod: order.paymentMethod === "COD" ? "COD" : "ONLINE",
  });

  // Persist shipment record and initial event
  await db.transaction(async (tx) => {
    const [shipmentRow] = await tx
      .insert(shipments)
      .values({
        storeId,
        orderId,
        fulfillmentId: fulfillmentId || null,
        carrier,
        carrierShipmentId: result.carrierShipmentId,
        carrierOrderId: result.carrierOrderId || null,
        awb: result.awb,
        carrierStatus: result.status,
        shippingCostPaise: result.shippingCostPaise,
        labelUrl: result.labelUrl || null,
        trackingUrl: result.trackingUrl || null,
        metadata: result.rawResponse || {},
      })
      .returning();

    await tx.insert(shipmentTrackingEvents).values({
      shipmentId: shipmentRow.id,
      statusCode: result.status,
      location: origin.city,
      message: `Shipment manifested with ${carrier}. AWB: ${result.awb}`,
      timestamp: new Date(),
    });

    if (fulfillmentId) {
      await tx
        .update(fulfillments)
        .set({
          carrier: carrier,
          trackingNumber: result.awb,
          trackingUrl: result.trackingUrl,
          status: "IN_TRANSIT",
          updatedAt: new Date(),
        })
        .where(eq(fulfillments.id, fulfillmentId));
    }
  });

  return result;
}

/**
 * Carrier Webhook Processor: durable and idempotent tracking updates.
 */
export async function handleCarrierWebhook(
  carrier: ShippingCarrierType,
  rawBody: string | Buffer,
  headers: Record<string, string>
): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  const provider = await resolveShippingProvider("00000000-0000-0000-0000-000000000000", carrier);

  if (!provider.verifyWebhookSignature(rawBody, headers)) {
    return { success: false, error: "Invalid carrier webhook signature/token." };
  }

  const event = provider.parseWebhookEvent(rawBody, headers);

  // Check duplicate event
  const [existingEvent] = await db
    .select()
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, carrier), eq(webhookEvents.eventId, event.eventId)))
    .limit(1);

  if (existingEvent && existingEvent.status === "PROCESSED") {
    return { success: true, duplicate: true };
  }

  await db
    .insert(webhookEvents)
    .values({
      provider: carrier,
      eventId: event.eventId,
      eventType: `CARRIER_${event.status}`,
      signatureVerified: true,
      status: "PROCESSING",
      payload: event.rawPayload,
    })
    .onConflictDoUpdate({
      target: [webhookEvents.provider, webhookEvents.eventId],
      set: { status: "PROCESSING" },
    });

  try {
    if (event.awb) {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.awb, event.awb))
        .limit(1);

      if (shipment) {
        await db.transaction(async (tx) => {
          // 1. Insert tracking event
          await tx.insert(shipmentTrackingEvents).values({
            shipmentId: shipment.id,
            statusCode: event.status,
            location: event.location || null,
            message: event.message || `Carrier update: ${event.status}`,
            timestamp: event.timestamp,
            rawPayload: event.rawPayload,
          });

          // 2. Update shipment carrier status
          const isRto = event.status.includes("RTO");
          await tx
            .update(shipments)
            .set({
              carrierStatus: event.status,
              rtoState: isRto ? event.status : shipment.rtoState,
              updatedAt: new Date(),
            })
            .where(eq(shipments.id, shipment.id));

          // 3. Update associated fulfillment if mapped
          if (shipment.fulfillmentId) {
            let mappedFulfillmentStatus: string = "IN_TRANSIT";
            if (event.status === "DELIVERED") mappedFulfillmentStatus = "DELIVERED";
            else if (event.status === "OUT_FOR_DELIVERY") mappedFulfillmentStatus = "OUT_FOR_DELIVERY";
            else if (event.status === "RTO_DELIVERED") mappedFulfillmentStatus = "RTO_DELIVERED";
            else if (event.status === "RTO_INITIATED") mappedFulfillmentStatus = "RTO_INITIATED";

            await tx
              .update(fulfillments)
              .set({
                status: mappedFulfillmentStatus,
                deliveredAt: event.status === "DELIVERED" ? new Date() : null,
                updatedAt: new Date(),
              })
              .where(eq(fulfillments.id, shipment.fulfillmentId));
          }

          // 4. Handle Order RTO & Inventory Restock if RTO_DELIVERED
          if (event.status === "RTO_DELIVERED") {
            await tx
              .update(orders)
              .set({
                status: "RTO",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, shipment.orderId));

            // Restock items back to inventory ledger per Phase 9 canonical rules
            const items = await tx
              .select()
              .from(orderItems)
              .where(eq(orderItems.orderId, shipment.orderId));

            for (const item of items) {
              const [inv] = await tx
                .select()
                .from(inventory)
                .where(and(eq(inventory.storeId, shipment.storeId), eq(inventory.variantId, item.variantId)))
                .limit(1);

              if (inv) {
                const newOnHand = inv.onHand + item.quantity;
                const newAvailable = newOnHand - inv.reserved;

                await tx
                  .update(inventory)
                  .set({
                    onHand: newOnHand,
                    available: newAvailable,
                    updatedAt: new Date(),
                  })
                  .where(eq(inventory.id, inv.id));

                await tx.insert(inventoryMovements).values({
                  storeId: shipment.storeId,
                  productId: item.productId,
                  variantId: item.variantId,
                  quantityDelta: item.quantity,
                  quantityBefore: inv.onHand,
                  quantityAfter: newOnHand,
                  reason: "RETURN_RESTOCK",
                  referenceId: `RTO_${shipment.awb}`,
                  referenceType: "RTO",
                });
              }
            }
          }
        });
      }
    }

    await db
      .update(webhookEvents)
      .set({ status: "PROCESSED", processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, carrier), eq(webhookEvents.eventId, event.eventId)));

    return { success: true };
  } catch (err) {
    await db
      .update(webhookEvents)
      .set({
        status: "FAILED",
        processingError: err instanceof Error ? err.message : "Carrier webhook failed",
        processedAt: new Date(),
      })
      .where(and(eq(webhookEvents.provider, carrier), eq(webhookEvents.eventId, event.eventId)));

    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
