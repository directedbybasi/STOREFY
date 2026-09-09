import { z } from "zod";

/**
 * STOREFY — Centralized Reusable Zod Validation Primitives
 */

// Universal Unique Identifier (UUID v4)
export const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });

// Normalized Email Address
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Invalid email address format" });

// Phone Number (Indian 10-digit mobile or international E.164)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+91|91)?[6-9]\d{9}$|^\+[1-9]\d{6,14}$/, {
    message: "Invalid phone number. Must be a valid 10-digit Indian mobile or E.164 format",
  });

// URL-Safe Handle / Slug
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, { message: "Slug must be at least 2 characters long" })
  .max(100, { message: "Slug cannot exceed 100 characters" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug can only contain lowercase alphanumeric characters and hyphens",
  });

// Web URL
export const urlSchema = z.string().trim().url({ message: "Invalid URL format" });

// Monetary Amount in Paise (Non-negative integer)
export const currencyAmountPaiseSchema = z
  .number()
  .int({ message: "Currency amount must be an integer (in Paise)" })
  .nonnegative({ message: "Currency amount cannot be negative" });

// Standard Pagination Query Parameters
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Common Sort Order
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");
