"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { customers, customerAddresses } from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import {
  CustomerCreateSchema,
  CustomerUpdateSchema,
  CustomerAddressSchema,
  CustomerFilterSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
  type CustomerAddressInput,
  type CustomerFilterInput,
  type CustomerSegment,
} from "./validation";
import {
  determineCustomerSegment,
  calculateCustomerMetrics,
  formatPaiseToRupees,
} from "./segmentation";
import { NotFoundError, ConflictError } from "@/core/errors";

export interface CustomerListItemDTO {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  segment: CustomerSegment;
  totalSpentPaise: bigint;
  totalSpentFormatted: string;
  ordersCount: number;
  lastOrderAt: Date | null;
  createdAt: Date;
}

export interface CustomerListResult {
  items: CustomerListItemDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalCustomers: number;
    activeCount: number;
    newCount: number;
    returningCount: number;
    highValueCount: number;
    inactiveCount: number;
  };
}

/**
 * Server-side paginated customer query with canonical segmentation,
 * metrics calculation, and strict store tenant isolation.
 */
export async function getCustomersListAction(
  params: Partial<CustomerFilterInput> = {}
): Promise<CustomerListResult> {
  const ctx = await requirePermission("customers:read");
  const storeId = ctx.store.id;
  const parsed = CustomerFilterSchema.parse(params);

  // 1. Fetch all store customers (lightweight projection for in-memory segment filtering and stats)
  const allRecords = await db
    .select()
    .from(customers)
    .where(eq(customers.storeId, storeId));

  // 2. Transform with derived segmentation and metrics
  let transformed: CustomerListItemDTO[] = allRecords.map((c) => {
    const segment = determineCustomerSegment({
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      createdAt: c.createdAt,
      lastOrderAt: c.lastOrderAt,
    });

    const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Guest Customer";
    const totalSpentBigInt = BigInt(c.totalSpent ?? 0);

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName,
      email: c.email,
      phone: c.phone,
      status: c.status,
      segment,
      totalSpentPaise: totalSpentBigInt,
      totalSpentFormatted: formatPaiseToRupees(totalSpentBigInt),
      ordersCount: c.ordersCount,
      lastOrderAt: c.lastOrderAt,
      createdAt: c.createdAt,
    };
  });

  // Calculate summary stats across all store customers
  const summary = {
    totalCustomers: transformed.length,
    activeCount: transformed.filter((c) => c.status === "ACTIVE").length,
    newCount: transformed.filter((c) => c.segment === "NEW").length,
    returningCount: transformed.filter((c) => c.segment === "RETURNING").length,
    highValueCount: transformed.filter((c) => c.segment === "HIGH_VALUE").length,
    inactiveCount: transformed.filter((c) => c.segment === "INACTIVE").length,
  };

  // 3. Filter by search query (name, email, phone)
  if (parsed.search && parsed.search.trim().length > 0) {
    const q = parsed.search.trim().toLowerCase();
    transformed = transformed.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }

  // 4. Filter by status
  if (parsed.status && parsed.status !== "ALL") {
    transformed = transformed.filter((c) => c.status === parsed.status);
  }

  // 5. Filter by segment
  if (parsed.segment && parsed.segment !== "ALL") {
    transformed = transformed.filter((c) => c.segment === parsed.segment);
  }

  // 6. Sort
  transformed.sort((a, b) => {
    let valA: string | number | bigint | Date = 0;
    let valB: string | number | bigint | Date = 0;

    switch (parsed.sortBy) {
      case "name":
        valA = a.fullName.toLowerCase();
        valB = b.fullName.toLowerCase();
        break;
      case "email":
        valA = (a.email || "").toLowerCase();
        valB = (b.email || "").toLowerCase();
        break;
      case "total_spent":
        valA = a.totalSpentPaise;
        valB = b.totalSpentPaise;
        break;
      case "orders_count":
        valA = a.ordersCount;
        valB = b.ordersCount;
        break;
      case "last_order_at":
        valA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        valB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        break;
      case "created_at":
      default:
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
    }

    if (valA < valB) return parsed.sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return parsed.sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalCount = transformed.length;
  const totalPages = Math.ceil(totalCount / parsed.pageSize) || 1;
  const offset = (parsed.page - 1) * parsed.pageSize;
  const pagedItems = transformed.slice(offset, offset + parsed.pageSize);

  return {
    items: pagedItems,
    totalCount,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages,
    summary,
  };
}

/**
 * Retrieves full 360-degree Customer details including profile,
 * address book, canonical metrics, and truthful order placeholder.
 */
export async function getCustomerByIdAction(customerId: string) {
  const ctx = await requirePermission("customers:read");
  const storeId = ctx.store.id;

  // 1. Fetch customer profile strictly verifying tenant store isolation
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
    .limit(1);

  if (!customer) {
    throw new NotFoundError(`Customer ${customerId} not found or unauthorized`);
  }

  // 2. Fetch address book
  const addresses = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId)
      )
    )
    .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));

  // 3. Compute canonical segment and metrics
  const segment = determineCustomerSegment({
    ordersCount: customer.ordersCount,
    totalSpent: customer.totalSpent,
    createdAt: customer.createdAt,
    lastOrderAt: customer.lastOrderAt,
  });

  const metrics = calculateCustomerMetrics({
    ordersCount: customer.ordersCount,
    totalSpent: customer.totalSpent,
    lastOrderAt: customer.lastOrderAt,
  });

  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Guest Customer";

  return {
    customer: {
      ...customer,
      fullName,
      segment,
    },
    metrics,
    addresses,
    orders: [], // Clean architectural boundary: ready for Phase 9 Orders integration
  };
}

/**
 * Creates a new store-scoped customer.
 * Enforces email uniqueness within the store.
 */
export async function createCustomerAction(input: CustomerCreateInput) {
  const parsed = CustomerCreateSchema.parse(input);
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  const normalizedEmail = parsed.email ? parsed.email.trim().toLowerCase() : null;
  const normalizedPhone = parsed.phone ? parsed.phone.trim() : null;

  // Check duplicate email in this store
  if (normalizedEmail) {
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(eq(customers.storeId, storeId), eq(customers.email, normalizedEmail))
      )
      .limit(1);

    if (existing) {
      throw new ConflictError(
        `A customer with email ${normalizedEmail} already exists in this store.`
      );
    }
  }

  const [created] = await db
    .insert(customers)
    .values({
      storeId,
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName ? parsed.lastName.trim() : null,
      email: normalizedEmail,
      phone: normalizedPhone,
      status: parsed.status,
      notes: parsed.notes ? parsed.notes.trim() : null,
      totalSpent: 0,
      ordersCount: 0,
    })
    .returning();

  revalidatePath("/dashboard/customers");

  return {
    success: true,
    customer: created,
  };
}

/**
 * Updates customer profile details.
 */
export async function updateCustomerAction(input: CustomerUpdateInput) {
  const parsed = CustomerUpdateSchema.parse(input);
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, parsed.id), eq(customers.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Customer ${parsed.id} not found or unauthorized`);
  }

  const normalizedEmail =
    parsed.email !== undefined
      ? parsed.email
        ? parsed.email.trim().toLowerCase()
        : null
      : existing.email;

  // Check collision if email changed
  if (normalizedEmail && normalizedEmail !== existing.email) {
    const [collision] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.storeId, storeId),
          eq(customers.email, normalizedEmail),
          sql`${customers.id} != ${parsed.id}`
        )
      )
      .limit(1);

    if (collision) {
      throw new ConflictError(`Another customer already has email ${normalizedEmail}.`);
    }
  }

  const [updated] = await db
    .update(customers)
    .set({
      firstName: parsed.firstName !== undefined ? parsed.firstName.trim() : existing.firstName,
      lastName:
        parsed.lastName !== undefined
          ? parsed.lastName
            ? parsed.lastName.trim()
            : null
          : existing.lastName,
      email: normalizedEmail,
      phone:
        parsed.phone !== undefined
          ? parsed.phone
            ? parsed.phone.trim()
            : null
          : existing.phone,
      status: parsed.status !== undefined ? parsed.status : existing.status,
      notes:
        parsed.notes !== undefined
          ? parsed.notes
            ? parsed.notes.trim()
            : null
          : existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, parsed.id))
    .returning();

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${parsed.id}`);

  return {
    success: true,
    customer: updated,
  };
}

/**
 * Soft archives a customer (status = ARCHIVED).
 * Requires customers:delete permission.
 */
export async function archiveCustomerAction(customerId: string) {
  const ctx = await requirePermission("customers:delete");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Customer ${customerId} not found`);
  }

  const [updated] = await db
    .update(customers)
    .set({
      status: "ARCHIVED",
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId))
    .returning();

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);

  return {
    success: true,
    customer: updated,
  };
}

/**
 * Creates a customer address in the store-scoped address book.
 */
export async function createCustomerAddressAction(input: CustomerAddressInput) {
  const parsed = CustomerAddressSchema.parse(input);
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  // Verify customer belongs to store
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(eq(customers.id, parsed.customerId), eq(customers.storeId, storeId))
    )
    .limit(1);

  if (!customer) {
    throw new NotFoundError(`Customer ${parsed.customerId} not found`);
  }

  const result = await db.transaction(async (tx) => {
    // Check if customer already has any address
    const existingAddresses = await tx
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.customerId, parsed.customerId),
          eq(customerAddresses.storeId, storeId)
        )
      );

    // If first address or isDefault requested, set others to false
    const shouldBeDefault = parsed.isDefault || existingAddresses.length === 0;

    if (shouldBeDefault && existingAddresses.length > 0) {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.customerId, parsed.customerId),
            eq(customerAddresses.storeId, storeId)
          )
        );
    }

    const [newAddress] = await tx
      .insert(customerAddresses)
      .values({
        storeId,
        customerId: parsed.customerId,
        name: parsed.name.trim(),
        phone: parsed.phone.trim(),
        addressLine1: parsed.addressLine1.trim(),
        addressLine2: parsed.addressLine2 ? parsed.addressLine2.trim() : null,
        city: parsed.city.trim(),
        state: parsed.state.trim(),
        postalCode: parsed.postalCode.trim(),
        country: parsed.country.trim(),
        isDefault: shouldBeDefault,
        type: parsed.type,
      })
      .returning();

    return newAddress;
  });

  revalidatePath(`/dashboard/customers/${parsed.customerId}`);

  return {
    success: true,
    address: result,
  };
}

/**
 * Updates an existing customer address.
 */
export async function updateCustomerAddressAction(
  addressId: string,
  input: Partial<CustomerAddressInput>
) {
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.storeId, storeId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Address ${addressId} not found`);
  }

  const result = await db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.customerId, existing.customerId),
            eq(customerAddresses.storeId, storeId)
          )
        );
    }

    const [updated] = await tx
      .update(customerAddresses)
      .set({
        name: input.name ? input.name.trim() : existing.name,
        phone: input.phone ? input.phone.trim() : existing.phone,
        addressLine1: input.addressLine1 ? input.addressLine1.trim() : existing.addressLine1,
        addressLine2:
          input.addressLine2 !== undefined
            ? input.addressLine2
              ? input.addressLine2.trim()
              : null
            : existing.addressLine2,
        city: input.city ? input.city.trim() : existing.city,
        state: input.state ? input.state.trim() : existing.state,
        postalCode: input.postalCode ? input.postalCode.trim() : existing.postalCode,
        country: input.country ? input.country.trim() : existing.country,
        isDefault: input.isDefault !== undefined ? input.isDefault : existing.isDefault,
        type: input.type !== undefined ? input.type : existing.type,
        updatedAt: new Date(),
      })
      .where(eq(customerAddresses.id, addressId))
      .returning();

    return updated;
  });

  revalidatePath(`/dashboard/customers/${existing.customerId}`);

  return {
    success: true,
    address: result,
  };
}

/**
 * Sets an address as default for a customer.
 */
export async function setDefaultAddressAction(addressId: string, customerId: string) {
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  const [targetAddress] = await db
    .select({ id: customerAddresses.id })
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId)
      )
    )
    .limit(1);

  if (!targetAddress) {
    throw new NotFoundError(`Address ${addressId} not found for customer ${customerId}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(customerAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.storeId, storeId)
        )
      );

    await tx
      .update(customerAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(customerAddresses.id, addressId));
  });

  revalidatePath(`/dashboard/customers/${customerId}`);

  return {
    success: true,
  };
}

/**
 * Deletes a customer address.
 */
export async function deleteCustomerAddressAction(addressId: string, customerId: string) {
  const ctx = await requirePermission("customers:write");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Address ${addressId} not found`);
  }

  await db
    .delete(customerAddresses)
    .where(eq(customerAddresses.id, addressId));

  // If deleted address was default, set another address as default if one exists
  if (existing.isDefault) {
    const [next] = await db
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.storeId, storeId)
        )
      )
      .limit(1);

    if (next) {
      await db
        .update(customerAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(customerAddresses.id, next.id));
    }
  }

  revalidatePath(`/dashboard/customers/${customerId}`);

  return {
    success: true,
  };
}
