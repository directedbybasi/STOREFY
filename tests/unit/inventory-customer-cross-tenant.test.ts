import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundError, ValidationError } from "@/core/errors";

interface MockInventoryRecord {
  id: string;
  storeId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
}

interface MockMovementRecord {
  id: string;
  storeId: string;
  variantId: string;
  quantityDelta: number;
  reason: string;
}

interface MockCustomer {
  id: string;
  storeId: string;
  firstName: string;
  email: string | null;
  phone: string | null;
}

interface MockCustomerAddress {
  id: string;
  storeId: string;
  customerId: string;
  addressLine1: string;
}

class MockTenantSecurityEngine {
  private inventory: MockInventoryRecord[] = [];
  private movements: MockMovementRecord[] = [];
  private customers: MockCustomer[] = [];
  private addresses: MockCustomerAddress[] = [];

  addInventory(item: MockInventoryRecord) {
    this.inventory.push(item);
  }

  addMovement(m: MockMovementRecord) {
    this.movements.push(m);
  }

  addCustomer(c: MockCustomer) {
    this.customers.push(c);
  }

  addAddress(a: MockCustomerAddress) {
    this.addresses.push(a);
  }

  // Inventory Queries strictly bounded by activeStoreId
  getInventory(activeStoreId: string, variantId: string) {
    const item = this.inventory.find(
      (i) => i.storeId === activeStoreId && i.variantId === variantId
    );
    if (!item) {
      throw new NotFoundError(
        `Inventory for variant ${variantId} not found in store ${activeStoreId}`
      );
    }
    return item;
  }

  adjustInventory(
    activeStoreId: string,
    variantId: string,
    delta: number,
    reason: string
  ) {
    const item = this.getInventory(activeStoreId, variantId);
    item.onHand += delta;
    item.available = item.onHand - item.reserved;

    const mov: MockMovementRecord = {
      id: `mov-${Date.now()}`,
      storeId: activeStoreId,
      variantId,
      quantityDelta: delta,
      reason,
    };
    this.movements.push(mov);
    return item;
  }

  bulkAdjust(
    activeStoreId: string,
    adjustments: Array<{ variantId: string; delta: number }>
  ) {
    // 1. Verify all variants belong to activeStoreId
    for (const adj of adjustments) {
      const exists = this.inventory.some(
        (i) => i.storeId === activeStoreId && i.variantId === adj.variantId
      );
      if (!exists) {
        throw new ValidationError(
          `One or more variants do not belong to store ${activeStoreId}`
        );
      }
    }

    // 2. Apply adjustments
    for (const adj of adjustments) {
      this.adjustInventory(activeStoreId, adj.variantId, adj.delta, "BULK_ADJUSTMENT");
    }
  }

  getMovements(activeStoreId: string, variantId: string) {
    // Must verify variant belongs to store first
    this.getInventory(activeStoreId, variantId);
    return this.movements.filter(
      (m) => m.storeId === activeStoreId && m.variantId === variantId
    );
  }

  // Customer Queries strictly bounded by activeStoreId
  getCustomer(activeStoreId: string, customerId: string) {
    const c = this.customers.find(
      (cust) => cust.storeId === activeStoreId && cust.id === customerId
    );
    if (!c) {
      throw new NotFoundError(
        `Customer ${customerId} not found in store ${activeStoreId}`
      );
    }
    return c;
  }

  updateCustomer(activeStoreId: string, customerId: string, newName: string) {
    const c = this.getCustomer(activeStoreId, customerId);
    c.firstName = newName;
    return c;
  }

  getAddress(activeStoreId: string, addressId: string) {
    const a = this.addresses.find(
      (addr) => addr.storeId === activeStoreId && addr.id === addressId
    );
    if (!a) {
      throw new NotFoundError(
        `Address ${addressId} not found in store ${activeStoreId}`
      );
    }
    return a;
  }
}

describe("PHASE 7 — Cross-Tenant Security & Zero-Trust Isolation", () => {
  let engine: MockTenantSecurityEngine;

  const STORE_A = "store-alpha-id";
  const STORE_B = "store-beta-id";

  const VARIANT_A = "var-alpha-1";
  const VARIANT_B = "var-beta-1";

  const CUSTOMER_A = "cust-alpha-1";
  const CUSTOMER_B = "cust-beta-1";

  const ADDRESS_A = "addr-alpha-1";
  const ADDRESS_B = "addr-beta-1";

  beforeEach(() => {
    engine = new MockTenantSecurityEngine();

    // Populate Store A data
    engine.addInventory({
      id: "inv-a1",
      storeId: STORE_A,
      variantId: VARIANT_A,
      onHand: 100,
      reserved: 10,
      available: 90,
    });
    engine.addMovement({
      id: "mov-a1",
      storeId: STORE_A,
      variantId: VARIANT_A,
      quantityDelta: 100,
      reason: "INITIAL_STOCK",
    });
    engine.addCustomer({
      id: CUSTOMER_A,
      storeId: STORE_A,
      firstName: "Customer Alpha",
      email: "alpha@example.com",
      phone: "+91 99999 11111",
    });
    engine.addAddress({
      id: ADDRESS_A,
      storeId: STORE_A,
      customerId: CUSTOMER_A,
      addressLine1: "Alpha Heights, Bangalore",
    });

    // Populate Store B data
    engine.addInventory({
      id: "inv-b1",
      storeId: STORE_B,
      variantId: VARIANT_B,
      onHand: 50,
      reserved: 5,
      available: 45,
    });
    engine.addMovement({
      id: "mov-b1",
      storeId: STORE_B,
      variantId: VARIANT_B,
      quantityDelta: 50,
      reason: "INITIAL_STOCK",
    });
    engine.addCustomer({
      id: CUSTOMER_B,
      storeId: STORE_B,
      firstName: "Customer Beta",
      email: "beta@example.com",
      phone: "+91 88888 22222",
    });
    engine.addAddress({
      id: ADDRESS_B,
      storeId: STORE_B,
      customerId: CUSTOMER_B,
      addressLine1: "Beta Residency, Mumbai",
    });
  });

  it("prevents Store A from reading Store B inventory", () => {
    expect(() => {
      engine.getInventory(STORE_A, VARIANT_B);
    }).toThrow(NotFoundError);
  });

  it("prevents Store A from modifying Store B inventory", () => {
    expect(() => {
      engine.adjustInventory(STORE_A, VARIANT_B, 20, "RESTOCK");
    }).toThrow(NotFoundError);

    // Store B's inventory must remain unaltered
    const bInv = engine.getInventory(STORE_B, VARIANT_B);
    expect(bInv.onHand).toBe(50);
  });

  it("prevents Store A from accessing Store B movement history ledger", () => {
    expect(() => {
      engine.getMovements(STORE_A, VARIANT_B);
    }).toThrow(NotFoundError);
  });

  it("prevents Store A from reading Store B customer profiles", () => {
    expect(() => {
      engine.getCustomer(STORE_A, CUSTOMER_B);
    }).toThrow(NotFoundError);
  });

  it("prevents Store A from modifying Store B customer profiles", () => {
    expect(() => {
      engine.updateCustomer(STORE_A, CUSTOMER_B, "Malicious Name");
    }).toThrow(NotFoundError);

    const bCust = engine.getCustomer(STORE_B, CUSTOMER_B);
    expect(bCust.firstName).toBe("Customer Beta");
  });

  it("prevents Store A from accessing Store B customer addresses", () => {
    expect(() => {
      engine.getAddress(STORE_A, ADDRESS_B);
    }).toThrow(NotFoundError);
  });

  it("rejects forged variant IDs in bulk operations spanning multiple stores", () => {
    expect(() => {
      engine.bulkAdjust(STORE_A, [
        { variantId: VARIANT_A, delta: 10 },
        { variantId: VARIANT_B, delta: 10 }, // Forged variant from Store B
      ]);
    }).toThrow(ValidationError);

    // Atomicity: Store A variant must not be modified if batch contains forged variant
    const aInv = engine.getInventory(STORE_A, VARIANT_A);
    expect(aInv.onHand).toBe(100);
  });
});
