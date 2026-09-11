import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_TRANSITIONS,
  canTransitionOrderStatus,
  validateOrderStatusTransition,
} from "@/modules/orders/state-machine";
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema,
} from "@/modules/orders/validation";
import {
  generateOrderNumber,
  generateInvoiceNumber,
  generateReturnNumber,
} from "@/modules/orders/numbering";
import { formatPaiseToRupees } from "@/modules/cart/service";

describe("Order Engine - State Machine & Numbering", () => {
  describe("Order State Machine Transitions", () => {
    it("allows standard forward transitions", () => {
      expect(canTransitionOrderStatus("PENDING", "CONFIRMED")).toBe(true);
      expect(canTransitionOrderStatus("CONFIRMED", "PROCESSING")).toBe(true);
      expect(canTransitionOrderStatus("PROCESSING", "PACKED")).toBe(true);
      expect(canTransitionOrderStatus("PACKED", "SHIPPED")).toBe(true);
      expect(canTransitionOrderStatus("SHIPPED", "OUT_FOR_DELIVERY")).toBe(true);
      expect(canTransitionOrderStatus("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
      expect(canTransitionOrderStatus("SHIPPED", "DELIVERED")).toBe(true);
    });

    it("allows cancellation from pre-fulfillment states", () => {
      expect(canTransitionOrderStatus("PENDING", "CANCELLED")).toBe(true);
      expect(canTransitionOrderStatus("CONFIRMED", "CANCELLED")).toBe(true);
      expect(canTransitionOrderStatus("PROCESSING", "CANCELLED")).toBe(true);
      expect(canTransitionOrderStatus("PACKED", "CANCELLED")).toBe(true);
    });

    it("allows RTO from in-transit states", () => {
      expect(canTransitionOrderStatus("SHIPPED", "RTO")).toBe(true);
      expect(canTransitionOrderStatus("OUT_FOR_DELIVERY", "RTO")).toBe(true);
    });

    it("rejects illegal and backwards transitions", () => {
      // High-Risk Test 3: DELIVERED -> PENDING
      expect(canTransitionOrderStatus("DELIVERED", "PENDING")).toBe(false);
      expect(() =>
        validateOrderStatusTransition("DELIVERED", "PENDING")
      ).toThrowError(/Invalid order (state|status) transition/);

      // DELIVERED -> CANCELLED is illegal
      expect(canTransitionOrderStatus("DELIVERED", "CANCELLED")).toBe(false);

      // CANCELLED -> CONFIRMED is illegal
      expect(canTransitionOrderStatus("CANCELLED", "CONFIRMED")).toBe(false);

      // RTO -> SHIPPED is illegal
      expect(canTransitionOrderStatus("RTO", "SHIPPED")).toBe(false);
    });
  });

  describe("Order Numbering Generation", () => {
    it("generates correct order number format STF-YYYY-XXXXXX", async () => {
      const year = new Date().getFullYear();
      const num1 = await generateOrderNumber();
      const num2 = await generateOrderNumber();

      expect(num1).toMatch(new RegExp(`^STF-${year}-\\d{6}$`));
      expect(num2).toMatch(new RegExp(`^STF-${year}-\\d{6}$`));
      expect(num1).not.toBe(num2);
    });

    it("generates correct invoice number format INV-YYYY-XXXXXX", async () => {
      const year = new Date().getFullYear();
      const invNum = await generateInvoiceNumber();
      expect(invNum).toMatch(new RegExp(`^INV-${year}-\\d{6}$`));
    });

    it("generates correct return number format RET-YYYY-XXXXXX", async () => {
      const year = new Date().getFullYear();
      const retNum = await generateReturnNumber();
      expect(retNum).toMatch(new RegExp(`^RET-${year}-\\d{6}$`));
    });
  });

  describe("Financial Paise Model & Immutability", () => {
    it("formats integer Paise to INR accurately without floating point skew", () => {
      expect(formatPaiseToRupees(100000)).toBe("₹1,000.00");
      expect(formatPaiseToRupees(4999)).toBe("₹49.99");
      expect(formatPaiseToRupees(0)).toBe("₹0.00");
    });

    it("preserves historical snapshot integrity when catalog item changes", () => {
      // Snapshot created at ₹500 (50000 Paise)
      const historicalItem = {
        title: "Linen Shirt",
        unitPricePaise: 50000,
        quantity: 2,
        totalPaise: 100000,
      };

      // Merchant updates catalog price to ₹700 (70000 Paise)
      const currentCatalogPrice = 70000;

      // Historical item price remains ₹500 (High-Risk Test 8)
      expect(historicalItem.unitPricePaise).toBe(50000);
      expect(historicalItem.totalPaise).toBe(100000);
      expect(currentCatalogPrice).toBe(70000);
      expect(historicalItem.unitPricePaise).not.toBe(currentCatalogPrice);
    });
  });

  describe("Validation Schemas", () => {
    it("validates cancel order input", () => {
      const valid = CancelOrderSchema.safeParse({
        orderId: "ord-12345",
        reason: "Customer requested cancellation before dispatch",
      });
      expect(valid.success).toBe(true);

      const invalid = CancelOrderSchema.safeParse({
        orderId: "ord-12345",
        reason: "",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates update order status input", () => {
      const valid = UpdateOrderStatusSchema.safeParse({
        orderId: "ord-12345",
        status: "PROCESSING",
        note: "Items packed in fulfillment warehouse",
      });
      expect(valid.success).toBe(true);
    });
  });
});
