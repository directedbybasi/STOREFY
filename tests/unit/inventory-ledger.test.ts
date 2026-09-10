import { describe, it, expect, beforeEach } from "vitest";
import {
  StockAdjustmentSchema,
  BulkInventoryAdjustmentSchema,
  ReservationSchema,
  InventoryThresholdSchema,
} from "@/modules/inventory/validation";
import { ValidationError, ConflictError } from "@/core/errors";

interface MockInventoryRecord {
  id: string;
  storeId: string;
  productId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

interface MockMovementRecord {
  id: string;
  storeId: string;
  productId: string;
  variantId: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
  createdAt: Date;
}

class MockInventoryEngine {
  private inventoryMap = new Map<string, MockInventoryRecord>();
  private movements: MockMovementRecord[] = [];

  initVariant(
    storeId: string,
    productId: string,
    variantId: string,
    onHand = 0,
    threshold = 5
  ) {
    const record: MockInventoryRecord = {
      id: `inv-${variantId}`,
      storeId,
      productId,
      variantId,
      onHand,
      reserved: 0,
      available: onHand,
      incoming: 0,
      lowStockThreshold: threshold,
      updatedAt: new Date(),
    };
    this.inventoryMap.set(`${storeId}:${variantId}`, record);
    return record;
  }

  getRecord(storeId: string, variantId: string): MockInventoryRecord | undefined {
    return this.inventoryMap.get(`${storeId}:${variantId}`);
  }

  getMovements(storeId: string, variantId: string): MockMovementRecord[] {
    return this.movements.filter(
      (m) => m.storeId === storeId && m.variantId === variantId
    );
  }

  adjustStock(
    storeId: string,
    variantId: string,
    quantityDelta: number,
    reason: string,
    userId: string
  ) {
    const key = `${storeId}:${variantId}`;
    const current = this.inventoryMap.get(key);
    if (!current) throw new Error("Variant inventory not found");

    const newOnHand = current.onHand + quantityDelta;
    if (newOnHand < 0) {
      throw new ValidationError(`Insufficient on-hand stock.`);
    }
    if (newOnHand < current.reserved) {
      throw new ValidationError(`Cannot reduce stock below active reservations.`);
    }

    const newAvailable = newOnHand - current.reserved;
    const movement: MockMovementRecord = {
      id: `mov-${Date.now()}-${Math.random()}`,
      storeId,
      productId: current.productId,
      variantId,
      quantityDelta,
      quantityBefore: current.onHand,
      quantityAfter: newOnHand,
      reason,
      createdBy: userId,
      createdAt: new Date(),
    };

    current.onHand = newOnHand;
    current.available = newAvailable;
    current.updatedAt = new Date();
    this.movements.push(movement);

    return { record: current, movement };
  }

  reserveStock(
    storeId: string,
    variantId: string,
    quantity: number,
    referenceId: string,
    userId: string
  ) {
    const key = `${storeId}:${variantId}`;
    const current = this.inventoryMap.get(key);
    if (!current) throw new Error("Variant inventory not found");

    if (current.available < quantity) {
      throw new ConflictError(
        `Insufficient available stock. Available: ${current.available}, Requested: ${quantity}`
      );
    }

    const newReserved = current.reserved + quantity;
    const newAvailable = current.onHand - newReserved;

    const movement: MockMovementRecord = {
      id: `mov-${Date.now()}-${Math.random()}`,
      storeId,
      productId: current.productId,
      variantId,
      quantityDelta: -quantity,
      quantityBefore: current.available,
      quantityAfter: newAvailable,
      reason: "RESERVATION",
      referenceType: "CHECKOUT",
      referenceId,
      createdBy: userId,
      createdAt: new Date(),
    };

    current.reserved = newReserved;
    current.available = newAvailable;
    current.updatedAt = new Date();
    this.movements.push(movement);

    return { record: current, movement };
  }

  releaseReservation(
    storeId: string,
    variantId: string,
    quantity: number,
    referenceId: string,
    userId: string
  ) {
    const key = `${storeId}:${variantId}`;
    const current = this.inventoryMap.get(key);
    if (!current) throw new Error("Variant inventory not found");

    const releaseAmount = Math.min(current.reserved, quantity);
    const newReserved = current.reserved - releaseAmount;
    const newAvailable = current.onHand - newReserved;

    const movement: MockMovementRecord = {
      id: `mov-${Date.now()}-${Math.random()}`,
      storeId,
      productId: current.productId,
      variantId,
      quantityDelta: releaseAmount,
      quantityBefore: current.available,
      quantityAfter: newAvailable,
      reason: "RELEASE",
      referenceType: "CHECKOUT",
      referenceId,
      createdBy: userId,
      createdAt: new Date(),
    };

    current.reserved = newReserved;
    current.available = newAvailable;
    current.updatedAt = new Date();
    this.movements.push(movement);

    return { record: current, movement };
  }

  consumeReservation(
    storeId: string,
    variantId: string,
    quantity: number,
    referenceId: string,
    userId: string
  ) {
    const key = `${storeId}:${variantId}`;
    const current = this.inventoryMap.get(key);
    if (!current) throw new Error("Variant inventory not found");

    const newReserved = Math.max(0, current.reserved - quantity);
    const newOnHand = Math.max(0, current.onHand - quantity);
    const newAvailable = newOnHand - newReserved;

    const movement: MockMovementRecord = {
      id: `mov-${Date.now()}-${Math.random()}`,
      storeId,
      productId: current.productId,
      variantId,
      quantityDelta: -quantity,
      quantityBefore: current.onHand,
      quantityAfter: newOnHand,
      reason: "SALE",
      referenceType: "ORDER_FULFILLMENT",
      referenceId,
      createdBy: userId,
      createdAt: new Date(),
    };

    current.onHand = newOnHand;
    current.reserved = newReserved;
    current.available = newAvailable;
    current.updatedAt = new Date();
    this.movements.push(movement);

    return { record: current, movement };
  }

  getStockStatus(record: MockInventoryRecord): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" {
    if (record.available <= 0) return "OUT_OF_STOCK";
    if (record.available <= record.lowStockThreshold) return "LOW_STOCK";
    return "IN_STOCK";
  }
}

describe("PHASE 7 — Inventory Ledger & Stock Calculations", () => {
  let engine: MockInventoryEngine;
  const STORE_ID = "store-alpha";
  const PRODUCT_ID = "prod-100";
  const VARIANT_ID = "variant-101";
  const USER_ID = "user-merchant-1";

  beforeEach(() => {
    engine = new MockInventoryEngine();
  });

  it("calculates canonical available stock: available = on_hand - reserved", () => {
    const inv = engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 100);
    expect(inv.onHand).toBe(100);
    expect(inv.reserved).toBe(0);
    expect(inv.available).toBe(100);

    // Reserve 20 units
    engine.reserveStock(STORE_ID, VARIANT_ID, 20, "ORDER-1", USER_ID);
    const updated = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(updated.onHand).toBe(100);
    expect(updated.reserved).toBe(20);
    expect(updated.available).toBe(80); // 100 - 20
  });

  it("handles stock increases (restock) and records immutable movement", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 50);
    const { record, movement } = engine.adjustStock(
      STORE_ID,
      VARIANT_ID,
      30,
      "RESTOCK",
      USER_ID
    );

    expect(record.onHand).toBe(80);
    expect(record.available).toBe(80);
    expect(movement.quantityDelta).toBe(30);
    expect(movement.quantityBefore).toBe(50);
    expect(movement.quantityAfter).toBe(80);
    expect(movement.reason).toBe("RESTOCK");

    const history = engine.getMovements(STORE_ID, VARIANT_ID);
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(movement.id);
  });

  it("rejects stock reduction that would make on-hand negative", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 20);
    expect(() => {
      engine.adjustStock(STORE_ID, VARIANT_ID, -25, "DAMAGE", USER_ID);
    }).toThrow(ValidationError);

    const record = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(record.onHand).toBe(20); // Unchanged
  });

  it("rejects stock reduction below currently active reservations", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 50);
    engine.reserveStock(STORE_ID, VARIANT_ID, 30, "CHECKOUT-1", USER_ID);

    // Current onHand=50, reserved=30. Attempting to reduce onHand by -25 would make onHand=25 < reserved(30)
    expect(() => {
      engine.adjustStock(STORE_ID, VARIANT_ID, -25, "DAMAGE", USER_ID);
    }).toThrow(ValidationError);

    const record = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(record.onHand).toBe(50);
    expect(record.reserved).toBe(30);
    expect(record.available).toBe(20);
  });

  it("handles checkout reservations and prevents overselling", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 10);
    // Available is 10. Attempting to reserve 15 must fail
    expect(() => {
      engine.reserveStock(STORE_ID, VARIANT_ID, 15, "CHECKOUT-99", USER_ID);
    }).toThrow(ConflictError);

    // Reserve 10 exactly
    engine.reserveStock(STORE_ID, VARIANT_ID, 10, "CHECKOUT-1", USER_ID);
    const record = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(record.available).toBe(0);
    expect(record.reserved).toBe(10);
    expect(engine.getStockStatus(record)).toBe("OUT_OF_STOCK");

    // Attempting to reserve 1 more must fail
    expect(() => {
      engine.reserveStock(STORE_ID, VARIANT_ID, 1, "CHECKOUT-2", USER_ID);
    }).toThrow(ConflictError);
  });

  it("handles reservation release on checkout abandonment", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 50);
    engine.reserveStock(STORE_ID, VARIANT_ID, 20, "CHECKOUT-1", USER_ID);

    let record = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(record.available).toBe(30);
    expect(record.reserved).toBe(20);

    // Release reservation
    engine.releaseReservation(STORE_ID, VARIANT_ID, 20, "CHECKOUT-1", USER_ID);
    record = engine.getRecord(STORE_ID, VARIANT_ID)!;
    expect(record.available).toBe(50);
    expect(record.reserved).toBe(0);

    const movements = engine.getMovements(STORE_ID, VARIANT_ID);
    expect(movements.length).toBe(2);
    expect(movements[1].reason).toBe("RELEASE");
    expect(movements[1].quantityDelta).toBe(20);
  });

  it("handles reservation consumption on order fulfillment", () => {
    engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 100);
    engine.reserveStock(STORE_ID, VARIANT_ID, 15, "CHECKOUT-1", USER_ID);

    // Payment succeeds & order confirmed -> consume reservation
    engine.consumeReservation(STORE_ID, VARIANT_ID, 15, "ORDER-101", USER_ID);
    const record = engine.getRecord(STORE_ID, VARIANT_ID)!;

    expect(record.onHand).toBe(85); // 100 - 15
    expect(record.reserved).toBe(0); // 15 - 15
    expect(record.available).toBe(85); // 85 - 0

    const movements = engine.getMovements(STORE_ID, VARIANT_ID);
    expect(movements.length).toBe(2);
    expect(movements[1].reason).toBe("SALE");
    expect(movements[1].quantityDelta).toBe(-15);
  });

  it("correctly evaluates low-stock and out-of-stock thresholds", () => {
    const inv = engine.initVariant(STORE_ID, PRODUCT_ID, VARIANT_ID, 10, 5);
    expect(engine.getStockStatus(inv)).toBe("IN_STOCK");

    // Reduce to 5 -> exactly at threshold -> LOW_STOCK
    engine.adjustStock(STORE_ID, VARIANT_ID, -5, "SALE", USER_ID);
    expect(engine.getStockStatus(inv)).toBe("LOW_STOCK");

    // Reduce to 0 -> OUT_OF_STOCK
    engine.adjustStock(STORE_ID, VARIANT_ID, -5, "SALE", USER_ID);
    expect(engine.getStockStatus(inv)).toBe("OUT_OF_STOCK");
  });

  it("validates Zod adjustment schemas strictly", () => {
    // Valid
    const valid = StockAdjustmentSchema.parse({
      variantId: "00000000-0000-0000-0000-000000000001",
      quantityDelta: 10,
      reason: "RESTOCK",
    });
    expect(valid.quantityDelta).toBe(10);

    // Delta cannot be zero
    expect(() => {
      StockAdjustmentSchema.parse({
        variantId: "00000000-0000-0000-0000-000000000001",
        quantityDelta: 0,
        reason: "ADJUSTMENT",
      });
    }).toThrow();

    // Invalid reason
    expect(() => {
      StockAdjustmentSchema.parse({
        variantId: "00000000-0000-0000-0000-000000000001",
        quantityDelta: 5,
        reason: "INVALID_REASON",
      });
    }).toThrow();
  });

  it("validates bulk adjustments, reservations, and threshold schemas", () => {
    const validBulk = BulkInventoryAdjustmentSchema.parse({
      adjustments: [
        { variantId: "00000000-0000-0000-0000-000000000001", quantityDelta: 5 },
        { variantId: "00000000-0000-0000-0000-000000000002", quantityDelta: -2 },
      ],
      reason: "ADJUSTMENT",
    });
    expect(validBulk.adjustments.length).toBe(2);

    const validReservation = ReservationSchema.parse({
      variantId: "00000000-0000-0000-0000-000000000001",
      quantity: 3,
      referenceType: "CHECKOUT",
      referenceId: "CHK-100",
    });
    expect(validReservation.quantity).toBe(3);

    const validThreshold = InventoryThresholdSchema.parse({
      variantId: "00000000-0000-0000-0000-000000000001",
      lowStockThreshold: 10,
    });
    expect(validThreshold.lowStockThreshold).toBe(10);
  });
});
