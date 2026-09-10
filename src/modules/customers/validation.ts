import { z } from "zod";

export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_SEGMENTS = ["NEW", "RETURNING", "HIGH_VALUE", "INACTIVE"] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const CustomerCreateSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().max(100).optional().nullable(),
    email: z
      .string()
      .email("Invalid email address")
      .max(255)
      .optional()
      .nullable()
      .or(z.literal("")),
    phone: z
      .string()
      .max(32)
      .optional()
      .nullable()
      .or(z.literal("")),
    status: z.enum(CUSTOMER_STATUSES).default("ACTIVE"),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (data) => (data.email && data.email.trim().length > 0) || (data.phone && data.phone.trim().length > 0),
    {
      message: "At least one contact method (email or phone) is required",
      path: ["email"],
    }
  );

export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>;

export const CustomerUpdateSchema = z.object({
  id: z.string().uuid("Invalid customer ID"),
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().max(100).optional().nullable(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .max(32)
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>;

export const CustomerAddressSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid("Invalid customer ID"),
  name: z.string().min(1, "Recipient name is required").max(255),
  phone: z.string().min(7, "Phone number is too short").max(32),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postalCode: z.string().min(3, "Postal code is required").max(20),
  country: z.string().min(1, "Country is required").max(100).default("India"),
  isDefault: z.boolean().default(false),
  type: z.enum(ADDRESS_TYPES).default("SHIPPING"),
});

export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;

export const CustomerFilterSchema = z.object({
  search: z.string().optional(),
  segment: z.enum(["ALL", "NEW", "RETURNING", "HIGH_VALUE", "INACTIVE"]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["name", "email", "total_spent", "orders_count", "created_at", "last_order_at"])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CustomerFilterInput = z.infer<typeof CustomerFilterSchema>;
