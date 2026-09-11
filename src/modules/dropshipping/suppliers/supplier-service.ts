import { db } from "@/database/client";
import {
  suppliers,
  supplierVerificationAudit,
  supplierPolicies,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/core/errors";
import type { RegisterSupplierInput, UpdateSupplierProfileInput } from "./validation";
import type { SupplierProfileDTO, SupplierPublicDTO, VerificationAuditDTO } from "./types";

/**
 * Registers a new supplier application. Status starts as PENDING.
 * One supplier per organization — duplicate applications are rejected.
 */
export async function registerSupplier(
  userId: string,
  organizationId: string,
  input: RegisterSupplierInput
): Promise<SupplierProfileDTO> {
  // Check for duplicate application
  const [existing] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.organizationId, organizationId))
    .limit(1);

  if (existing) {
    throw new ConflictError(
      "A supplier application already exists for this organization."
    );
  }

  const [supplier] = await db
    .insert(suppliers)
    .values({
      organizationId,
      userId,
      businessName: input.businessName,
      displayName: input.displayName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      businessAddress: input.businessAddress,
      pickupAddress: input.pickupAddress,
      gstin: input.gstin || null,
      panNumber: input.panNumber || null,
      bankDetails: input.bankDetails || null,
      description: input.description || null,
      status: "PENDING",
    })
    .returning();

  // Create default policies
  await db.insert(supplierPolicies).values({
    supplierId: supplier.id,
  });

  // Create audit entry
  await db.insert(supplierVerificationAudit).values({
    supplierId: supplier.id,
    reviewerUserId: userId,
    action: "SUBMIT",
    fromStatus: "PENDING",
    toStatus: "PENDING",
    reason: "Supplier application submitted",
  });

  return mapSupplierToProfileDTO(supplier);
}

/**
 * Updates supplier profile. Suspended suppliers cannot modify restricted fields.
 */
export async function updateSupplierProfile(
  supplierId: string,
  userId: string,
  input: UpdateSupplierProfileInput
): Promise<SupplierProfileDTO> {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)))
    .limit(1);

  if (!supplier) {
    throw new NotFoundError("Supplier");
  }

  if (supplier.status === "SUSPENDED") {
    throw new ForbiddenError(
      "Suspended suppliers cannot modify profile information."
    );
  }

  const [updated] = await db
    .update(suppliers)
    .set({
      ...(input.displayName && { displayName: input.displayName }),
      ...(input.contactName && { contactName: input.contactName }),
      ...(input.phone && { phone: input.phone }),
      ...(input.businessAddress && { businessAddress: input.businessAddress }),
      ...(input.pickupAddress && { pickupAddress: input.pickupAddress }),
      ...(input.gstin !== undefined && { gstin: input.gstin || null }),
      ...(input.panNumber !== undefined && { panNumber: input.panNumber || null }),
      ...(input.bankDetails && { bankDetails: input.bankDetails }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.logoUrl && { logoUrl: input.logoUrl }),
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId))
    .returning();

  return mapSupplierToProfileDTO(updated);
}

/**
 * Retrieves the full profile for the supplier themselves.
 */
export async function getSupplierProfile(
  supplierId: string
): Promise<SupplierProfileDTO> {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new NotFoundError("Supplier");
  }

  return mapSupplierToProfileDTO(supplier);
}

/**
 * Retrieves supplier profile by organization ID (used during auth context resolution).
 */
export async function getSupplierByOrganization(
  organizationId: string
): Promise<SupplierProfileDTO | null> {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.organizationId, organizationId))
    .limit(1);

  return supplier ? mapSupplierToProfileDTO(supplier) : null;
}

/**
 * Retrieves a public supplier DTO — safe for marketplace display.
 * Never includes bank details, PAN, or internal identifiers.
 */
export async function getPublicSupplierProfile(
  supplierId: string
): Promise<SupplierPublicDTO> {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.status, "APPROVED")))
    .limit(1);

  if (!supplier) {
    throw new NotFoundError("Supplier");
  }

  const [policies] = await db
    .select()
    .from(supplierPolicies)
    .where(eq(supplierPolicies.supplierId, supplierId))
    .limit(1);

  return {
    id: supplier.id,
    displayName: supplier.displayName,
    description: supplier.description,
    logoUrl: supplier.logoUrl,
    status: supplier.status,
    processingTimeDays: policies?.processingTimeDays ?? 3,
    returnable: policies?.returnable ?? true,
    returnWindowDays: policies?.returnWindowDays ?? 7,
  };
}

/**
 * Platform admin: verify (approve/reject/suspend/reactivate) a supplier.
 * Creates an immutable audit record. Only platform admins or users with
 * supplier:verify permission may invoke this.
 */
export async function verifySupplier(
  supplierId: string,
  reviewerUserId: string,
  action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE",
  reason?: string
): Promise<SupplierProfileDTO> {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new NotFoundError("Supplier");
  }

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    PENDING: ["APPROVE", "REJECT"],
    UNDER_REVIEW: ["APPROVE", "REJECT"],
    APPROVED: ["SUSPEND"],
    REJECTED: ["REACTIVATE"],
    SUSPENDED: ["REACTIVATE"],
  };

  const allowed = validTransitions[supplier.status] || [];
  if (!allowed.includes(action)) {
    throw new ValidationError(
      `Cannot perform '${action}' on a supplier with status '${supplier.status}'.`
    );
  }

  const statusMap: Record<string, string> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    SUSPEND: "SUSPENDED",
    REACTIVATE: "APPROVED",
  };

  const newStatus = statusMap[action] as typeof supplier.status;

  await db.transaction(async (tx) => {
    await tx
      .update(suppliers)
      .set({
        status: newStatus,
        ...(action === "APPROVE" && {
          verifiedAt: new Date(),
          verifiedBy: reviewerUserId,
          rejectionReason: null,
          suspensionReason: null,
        }),
        ...(action === "REJECT" && {
          rejectionReason: reason || "Application rejected",
        }),
        ...(action === "SUSPEND" && {
          suspensionReason: reason || "Account suspended",
        }),
        ...(action === "REACTIVATE" && {
          suspensionReason: null,
          rejectionReason: null,
          verifiedAt: new Date(),
          verifiedBy: reviewerUserId,
        }),
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId));

    // Immutable audit record
    await tx.insert(supplierVerificationAudit).values({
      supplierId,
      reviewerUserId,
      action: action as "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE",
      fromStatus: supplier.status,
      toStatus: newStatus,
      reason: reason || null,
    });
  });

  return getSupplierProfile(supplierId);
}

/**
 * Gets verification audit history for a supplier.
 */
export async function getVerificationAudit(
  supplierId: string
): Promise<VerificationAuditDTO[]> {
  const records = await db
    .select()
    .from(supplierVerificationAudit)
    .where(eq(supplierVerificationAudit.supplierId, supplierId))
    .orderBy(desc(supplierVerificationAudit.createdAt));

  return records.map((r) => ({
    id: r.id,
    action: r.action,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    reason: r.reason,
    reviewerName: null, // Populated by join at action layer
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Lists all suppliers with optional status filter. Admin-only.
 */
export async function listSuppliers(
  status?: string
): Promise<SupplierPublicDTO[]> {
  const conditions = status
    ? [eq(suppliers.status, status as unknown as (typeof suppliers.status._.data))]
    : [];

  const results = await db
    .select()
    .from(suppliers)
    .where(and(...conditions))
    .orderBy(desc(suppliers.createdAt));

  return results.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    description: s.description,
    logoUrl: s.logoUrl,
    status: s.status,
  }));
}

// ─── Internal Mapper ───────────────────────────────────

function mapSupplierToProfileDTO(
  s: typeof suppliers.$inferSelect
): SupplierProfileDTO {
  return {
    id: s.id,
    organizationId: s.organizationId,
    userId: s.userId,
    businessName: s.businessName,
    displayName: s.displayName,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    businessAddress: s.businessAddress,
    pickupAddress: s.pickupAddress,
    gstin: s.gstin,
    panNumber: s.panNumber,
    bankDetails: s.bankDetails,
    status: s.status,
    verifiedAt: s.verifiedAt?.toISOString() ?? null,
    rejectionReason: s.rejectionReason,
    suspensionReason: s.suspensionReason,
    logoUrl: s.logoUrl,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
  };
}
