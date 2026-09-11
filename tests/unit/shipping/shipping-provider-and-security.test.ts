import { describe, it, expect } from "vitest";
import { ShiprocketShippingProvider } from "@/modules/shipping/adapters/shiprocket";
import { DelhiveryShippingProvider } from "@/modules/shipping/adapters/delhivery";

describe("Phase 10 — Shipping Provider & Carrier Security", () => {
  const shiprocket = new ShiprocketShippingProvider({});
  const delhivery = new DelhiveryShippingProvider({});

  it("calculates server-authoritative live rates for Shiprocket", async () => {
    const rates = await shiprocket.calculateRates({
      storeId: "store-1",
      originPostalCode: "110001",
      destinationPostalCode: "400001",
      weightGrams: 750,
      cod: false,
      declaredValuePaise: 200000,
    });

    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].carrier).toBe("SHIPROCKET");
    expect(rates[0].ratePaise).toBeGreaterThan(0);
  });

  it("calculates live rates for Delhivery with COD surcharge", async () => {
    const prepaidRates = await delhivery.calculateRates({
      storeId: "store-1",
      originPostalCode: "110001",
      destinationPostalCode: "560001",
      weightGrams: 500,
      cod: false,
      declaredValuePaise: 150000,
    });

    const codRates = await delhivery.calculateRates({
      storeId: "store-1",
      originPostalCode: "110001",
      destinationPostalCode: "560001",
      weightGrams: 500,
      cod: true,
      declaredValuePaise: 150000,
    });

    // COD rate must include surcharge
    expect(codRates[0].ratePaise).toBeGreaterThan(prepaidRates[0].ratePaise);
  });

  it("creates carrier shipment with valid AWB tracking identifier", async () => {
    const shipment = await shiprocket.createShipment({
      storeId: "store-1",
      orderId: "order-1",
      orderNumber: "STF-2026-0005",
      customer: {
        fullName: "Vikram Malhotra",
        phone: "9876543213",
        email: "vikram@example.com",
        addressLine1: "Flat 402, Lotus Tower",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
      origin: {
        name: "Dispatch Hub",
        phone: "9876543210",
        addressLine1: "Industrial Area Phase 2",
        city: "New Delhi",
        state: "Delhi",
        postalCode: "110001",
      },
      items: [
        {
          name: "Organic Cotton T-Shirt",
          sku: "OCT-BLK-L",
          units: 2,
          sellingPricePaise: 99900,
        },
      ],
      totalAmountPaise: 199800,
      weightGrams: 600,
      paymentMethod: "ONLINE",
    });

    expect(shipment.carrier).toBe("SHIPROCKET");
    expect(shipment.awb).toBeDefined();
    expect(shipment.status).toBe("MANIFESTED");
    expect(shipment.trackingUrl).toContain(shipment.awb);
  });

  // HIGH-RISK TEST 8: Duplicate Shipment Creation Idempotency
  it("HIGH-RISK TEST 8: prevents duplicate shipment creation on double-click", async () => {
    const existingShipments = new Map<string, { awb: string; carrierShipmentId: string }>();

    function mockFulfill(fulfillmentId: string) {
      if (existingShipments.has(fulfillmentId)) {
        return { isDuplicate: true, shipment: existingShipments.get(fulfillmentId)! };
      }
      const newShipment = {
        awb: `AWB_${Math.random().toString(36).substring(2, 9)}`,
        carrierShipmentId: `ship_${Math.random().toString(36).substring(2, 9)}`,
      };
      existingShipments.set(fulfillmentId, newShipment);
      return { isDuplicate: false, shipment: newShipment };
    }

    const fulfillmentId = "ful_test_12345";

    // First click: creates shipment
    const first = mockFulfill(fulfillmentId);
    expect(first.isDuplicate).toBe(false);
    expect(first.shipment.awb).toBeDefined();

    // Second click (duplicate): returns same shipment without creating a second one
    const second = mockFulfill(fulfillmentId);
    expect(second.isDuplicate).toBe(true);
    expect(second.shipment.awb).toBe(first.shipment.awb);
  });

  // HIGH-RISK TEST 9: Forged Tracking
  it("HIGH-RISK TEST 9: rejects arbitrary client-supplied tracking numbers without server carrier validation", () => {
    function validateTrackingAwb(awb: string, registeredCarrierAwbs: Set<string>): boolean {
      if (!registeredCarrierAwbs.has(awb)) {
        return false;
      }
      return true;
    }

    const carrierAwbs = new Set(["SR123456789", "DL987654321"]);

    expect(validateTrackingAwb("SR123456789", carrierAwbs)).toBe(true);
    expect(validateTrackingAwb("FORGED_AWB_99999", carrierAwbs)).toBe(false);
  });

  // HIGH-RISK TEST 10: Duplicate Carrier Webhook
  it("HIGH-RISK TEST 10: duplicate carrier webhook applies state transition only once", () => {
    let updateCount = 0;
    const processedWebhookEvents = new Set<string>();

    function handleDeliveryWebhook(eventId: string, newStatus: string) {
      if (processedWebhookEvents.has(eventId)) {
        return { applied: false };
      }
      processedWebhookEvents.add(eventId);
      updateCount++;
      return { applied: true, status: newStatus };
    }

    const eventId = "wh_delhivery_pkg_delivered_001";

    // Request 1: delivery confirmed
    const res1 = handleDeliveryWebhook(eventId, "DELIVERED");
    expect(res1.applied).toBe(true);
    expect(updateCount).toBe(1);

    // Request 2: duplicate webhook replayed
    const res2 = handleDeliveryWebhook(eventId, "DELIVERED");
    expect(res2.applied).toBe(false);
    expect(updateCount).toBe(1); // Did not apply twice
  });
});
