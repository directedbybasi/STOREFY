import type { SupplierAddress, SupplierBankDetails } from "@/database/schema/dropshipping";

/**
 * Public supplier DTO — never exposes bank details or sensitive PII.
 */
export interface SupplierPublicDTO {
  id: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  categoryCount?: number;
  productCount?: number;
  avgRating?: number;
  processingTimeDays?: number;
  returnable?: boolean;
  returnWindowDays?: number;
}

/**
 * Full supplier profile DTO — visible only to the supplier themselves or platform admin.
 */
export interface SupplierProfileDTO {
  id: string;
  organizationId: string;
  userId: string;
  businessName: string;
  displayName: string;
  contactName: string;
  email: string;
  phone: string;
  businessAddress: SupplierAddress;
  pickupAddress: SupplierAddress;
  gstin: string | null;
  panNumber: string | null;
  bankDetails: SupplierBankDetails | null;
  status: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  logoUrl: string | null;
  description: string | null;
  createdAt: string;
}

/**
 * Supplier verification audit entry.
 */
export interface VerificationAuditDTO {
  id: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  reviewerName: string | null;
  createdAt: string;
}
