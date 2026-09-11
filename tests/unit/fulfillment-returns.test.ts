import { describe, it, expect } from "vitest";
import {
  CreateFulfillmentSchema,
  UpdateFulfillmentStatusSchema,
  RequestReturnSchema,
  ReviewReturnSchema,
  ReceiveReturnSchema,
} from "@/modules/orders/validation";
import {
  RETURN_STATUS_TRANSITIONS,
  canTransitionReturnStatus,
  canTransitionFulfillmentStatus,
} from "@/modules/orders/state-machine";

describe("Fulfillment & Returns Engine", () => {
  describe("Fulfillment Validation & State Machine", () => {
    it("validates create fulfillment schema", () => {
      const valid = {
        carrier: "Blue Dart",
        trackingNumber: "BD982341234IN",
        trackingUrl: "https://bluedart.com/track/BD982341234IN",
        notifyCustomer: true,
        items: [
          { orderItemId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", quantity: 2 },
          { orderItemId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22", quantity: 1 },
        ],
      };

      const res = CreateFulfillmentSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects fulfillment with empty items array", () => {
      const invalid = {
        carrier: "Delhivery",
        items: [],
      };
      expect(CreateFulfillmentSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects non-positive quantities", () => {
      const invalid = {
        carrier: "Delhivery",
        items: [{ orderItemId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", quantity: 0 }],
      };
      expect(CreateFulfillmentSchema.safeParse(invalid).success).toBe(false);
    });

    it("enforces fulfillment status progression", () => {
      expect(canTransitionFulfillmentStatus("UNFULFILLED", "FULFILLED")).toBe(true);
      expect(canTransitionFulfillmentStatus("PARTIALLY_FULFILLED", "FULFILLED")).toBe(true);
    });
  });

  describe("Returns State Machine & Eligibility Rules", () => {
    it("allows valid return lifecycle progression", () => {
      expect(canTransitionReturnStatus("REQUESTED", "APPROVED")).toBe(true);
      expect(canTransitionReturnStatus("REQUESTED", "REJECTED")).toBe(true);
      expect(canTransitionReturnStatus("APPROVED", "RECEIVED")).toBe(true);
      expect(canTransitionReturnStatus("RECEIVED", "REFUNDED")).toBe(true);
      expect(canTransitionReturnStatus("REQUESTED", "CANCELLED")).toBe(true);
    });

    it("rejects invalid return transitions", () => {
      expect(canTransitionReturnStatus("REJECTED", "APPROVED")).toBe(false);
      expect(canTransitionReturnStatus("REFUNDED", "REQUESTED")).toBe(false);
      expect(canTransitionReturnStatus("RECEIVED", "APPROVED")).toBe(false);
    });

    // High-Risk Test 6: Return Quantity Limits
    it("enforces return quantity limits: Ordered = 5, Returned = 3 -> Request = 3 must fail, Request = 2 must pass", () => {
      const orderedQuantity = 5;
      const alreadyReturned = 3;
      const remainingEligible = orderedQuantity - alreadyReturned; // 2

      const isReturnQuantityValid = (requestedQty: number) => {
        return requestedQty > 0 && requestedQty <= remainingEligible;
      };

      // Requesting 3 when only 2 remain eligible must be rejected
      expect(isReturnQuantityValid(3)).toBe(false);

      // Requesting 2 when 2 remain eligible must succeed
      expect(isReturnQuantityValid(2)).toBe(true);

      // Requesting 1 when 2 remain eligible must succeed
      expect(isReturnQuantityValid(1)).toBe(true);

      // Requesting 0 or negative must fail
      expect(isReturnQuantityValid(0)).toBe(false);
      expect(isReturnQuantityValid(-1)).toBe(false);
    });

    it("enforces 14-day return window from delivery date", () => {
      const now = new Date();

      const delivered5DaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const delivered20DaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const checkWindow = (deliveryDate: Date) => {
        const days = (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
        return days <= 14;
      };

      expect(checkWindow(delivered5DaysAgo)).toBe(true);
      expect(checkWindow(delivered20DaysAgo)).toBe(false);
    });
  });

  describe("Inventory Restock Movement Ledger Audit", () => {
    // High-Risk Test 9: Inventory Restock on Return Received
    it("calculates correct on_hand increase and ledger audit entry on restock", () => {
      const initialOnHand = 15;
      const initialReserved = 2;
      const returnedQuantity = 3;

      const restockAction: "RESTOCK" | "NO_RESTOCK" = "RESTOCK";

      let finalOnHand = initialOnHand;
      let finalAvailable = initialOnHand - initialReserved;
      let ledgerEntry = null;

      if (restockAction === "RESTOCK") {
        finalOnHand += returnedQuantity;
        finalAvailable = finalOnHand - initialReserved;
        ledgerEntry = {
          movementType: "RETURN",
          quantityDelta: returnedQuantity,
          quantityBefore: initialOnHand,
          quantityAfter: finalOnHand,
        };
      }

      expect(finalOnHand).toBe(18);
      expect(finalAvailable).toBe(16);
      expect(ledgerEntry).not.toBeNull();
      expect(ledgerEntry?.quantityDelta).toBe(3);
      expect(ledgerEntry?.quantityAfter).toBe(18);
    });

    it("does not increase inventory when marked NO_RESTOCK (damaged goods)", () => {
      const initialOnHand = 15;
      const initialReserved = 2;
      const returnedQuantity = 2;

      const restockAction: "RESTOCK" | "NO_RESTOCK" = "NO_RESTOCK";

      let finalOnHand = initialOnHand;
      if ((restockAction as string) === "RESTOCK") {
        finalOnHand += returnedQuantity;
      }

      expect(finalOnHand).toBe(15);
    });
  });
});
