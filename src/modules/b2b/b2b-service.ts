import { db } from "@/database/client";
import {
  b2bCompanies,
  b2bCompanyUsers,
  b2bPriceLists,
  b2bPriceListItems,
  b2bOrders,
  orders,
  type B2bCompany,
  type B2bOrder,
} from "@/database/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type {
  CreateB2bCompanyInput,
  AddB2bUserInput,
  CreateB2bPriceListInput,
  SubmitB2bOrderInput,
} from "./types";

/**
 * Creates a wholesale B2B company record.
 */
export async function createCompany(
  input: CreateB2bCompanyInput,
  actorUserId: string
): Promise<B2bCompany> {
  const [company] = await db
    .insert(b2bCompanies)
    .values({
      storeId: input.storeId,
      name: input.name,
      code: input.code.toUpperCase(),
      taxId: input.taxId,
      email: input.email,
      phone: input.phone,
      creditLimitPaise: input.creditLimitPaise,
      paymentTerms: input.paymentTerms,
      billingAddress: input.billingAddress,
      shippingAddresses: input.shippingAddresses,
      notes: input.notes,
    })
    .returning();

  await recordAuditLog({
    storeId: input.storeId,
    actorType: "STAFF",
    actorId: actorUserId,
    action: "b2b:create_company",
    entity: "b2b_company",
    entityId: company.id,
    after: { name: company.name, code: company.code, paymentTerms: company.paymentTerms },
  });

  return company;
}

/**
 * Associates a user/buyer to a B2B company.
 */
export async function addCompanyUser(
  input: AddB2bUserInput,
  actorUserId: string
) {
  const [user] = await db
    .insert(b2bCompanyUsers)
    .values({
      storeId: input.storeId,
      companyId: input.companyId,
      customerId: input.customerId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    })
    .returning();

  await recordAuditLog({
    storeId: input.storeId,
    actorType: "STAFF",
    actorId: actorUserId,
    action: "b2b:add_user",
    entity: "b2b_company_user",
    entityId: user.id,
    after: { email: user.email, role: user.role, companyId: user.companyId },
  });

  return user;
}

/**
 * Creates a B2B custom or tier price list.
 */
export async function createPriceList(
  input: CreateB2bPriceListInput,
  actorUserId: string
) {
  return await db.transaction(async (tx) => {
    const [priceList] = await tx
      .insert(b2bPriceLists)
      .values({
        storeId: input.storeId,
        companyId: input.companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        currency: input.currency,
      })
      .returning();

    if (input.items.length > 0) {
      for (const item of input.items) {
        await tx.insert(b2bPriceListItems).values({
          storeId: input.storeId,
          priceListId: priceList.id,
          productId: item.productId,
          variantId: item.variantId,
          minQuantity: item.minQuantity,
          pricePaise: item.pricePaise,
        });
      }
    }

    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "b2b:create_price_list",
      entity: "b2b_price_list",
      entityId: priceList.id,
      after: { name: priceList.name, code: priceList.code, itemCount: input.items.length },
    });

    return priceList;
  });
}

/**
 * Resolves authoritative B2B price for a company, factoring in volume tier rules.
 */
export async function resolveB2bPrice(
  storeId: string,
  companyId: string,
  productId: string,
  variantId: string,
  quantity: number,
  fallbackPricePaise: number
): Promise<number> {
  // Check company-assigned price list
  const companyLists = await db
    .select({ id: b2bPriceLists.id })
    .from(b2bPriceLists)
    .where(
      and(
        eq(b2bPriceLists.storeId, storeId),
        eq(b2bPriceLists.companyId, companyId),
        eq(b2bPriceLists.status, "ACTIVE")
      )
    );

  if (companyLists.length === 0) {
    return fallbackPricePaise;
  }

  const listIds = companyLists.map((l) => l.id);

  // Find best volume pricing match where minQuantity <= quantity
  const matchedItems = await db
    .select({
      pricePaise: b2bPriceListItems.pricePaise,
      minQuantity: b2bPriceListItems.minQuantity,
    })
    .from(b2bPriceListItems)
    .where(
      and(
        eq(b2bPriceListItems.storeId, storeId),
        eq(b2bPriceListItems.productId, productId),
        lte(b2bPriceListItems.minQuantity, quantity)
      )
    )
    .orderBy(desc(b2bPriceListItems.minQuantity));

  const validMatch = matchedItems.find((item) => item.minQuantity <= quantity);
  return validMatch ? validMatch.pricePaise : fallbackPricePaise;
}

/**
 * Submits an order under B2B terms and optional approval workflow.
 */
export async function submitB2bOrder(
  input: SubmitB2bOrderInput,
  actorUserId: string
): Promise<B2bOrder> {
  const [company] = await db
    .select()
    .from(b2bCompanies)
    .where(
      and(
        eq(b2bCompanies.storeId, input.storeId),
        eq(b2bCompanies.id, input.companyId)
      )
    )
    .limit(1);

  if (!company) {
    throw new NotFoundError("B2B Company not found");
  }

  // Calculate Net terms due date
  let netTermsDueDate: Date | null = null;
  if (company.paymentTerms.startsWith("NET_")) {
    const days = parseInt(company.paymentTerms.replace("NET_", ""), 10);
    if (!isNaN(days)) {
      netTermsDueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }

  // Tag underlying order with B2B channel
  await db
    .update(orders)
    .set({
      salesChannel: "B2B",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  const approvalStatus = input.requiresApproval ? "SUBMITTED" : "APPROVED";

  const [b2bOrder] = await db
    .insert(b2bOrders)
    .values({
      storeId: input.storeId,
      companyId: input.companyId,
      orderId: input.orderId,
      poNumber: input.poNumber,
      paymentTerms: company.paymentTerms,
      approvalStatus,
      approvedByUserId: input.requiresApproval ? null : actorUserId,
      approvedAt: input.requiresApproval ? null : new Date(),
      netTermsDueDate,
    })
    .returning();

  await recordAuditLog({
    storeId: input.storeId,
    actorType: "STAFF",
    actorId: actorUserId,
    action: "b2b:submit_order",
    entity: "b2b_order",
    entityId: b2bOrder.id,
    after: { companyId: company.id, approvalStatus, terms: company.paymentTerms },
  });

  return b2bOrder;
}

/**
 * Approves a pending B2B order.
 */
export async function approveB2bOrder(
  storeId: string,
  b2bOrderId: string,
  approverUserId: string
): Promise<B2bOrder> {
  const [b2bOrder] = await db
    .select()
    .from(b2bOrders)
    .where(
      and(
        eq(b2bOrders.storeId, storeId),
        eq(b2bOrders.id, b2bOrderId)
      )
    )
    .limit(1);

  if (!b2bOrder) {
    throw new NotFoundError("B2B Order not found");
  }

  if (b2bOrder.approvalStatus === "APPROVED") {
    throw new BadRequestError("B2B Order is already approved");
  }

  const [updated] = await db
    .update(b2bOrders)
    .set({
      approvalStatus: "APPROVED",
      approvedByUserId: approverUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(b2bOrders.id, b2bOrder.id))
    .returning();

  await recordAuditLog({
    storeId,
    actorType: "STAFF",
    actorId: approverUserId,
    action: "b2b:approve_order",
    entity: "b2b_order",
    entityId: b2bOrder.id,
    before: { status: b2bOrder.approvalStatus },
    after: { status: "APPROVED" },
  });

  return updated;
}

/**
 * Lists B2B companies for a store.
 */
export async function listCompanies(storeId: string) {
  return await db
    .select()
    .from(b2bCompanies)
    .where(eq(b2bCompanies.storeId, storeId))
    .orderBy(desc(b2bCompanies.createdAt));
}

/**
 * Lists B2B orders for a store.
 */
export async function listB2bOrders(storeId: string) {
  return await db
    .select()
    .from(b2bOrders)
    .where(eq(b2bOrders.storeId, storeId))
    .orderBy(desc(b2bOrders.createdAt));
}
