import { z } from "zod";

export const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "cdn",
  "dashboard",
  "docs",
  "mail",
  "static",
  "storefy",
  "support",
  "system",
  "test",
  "www",
]);

export const SubdomainSchema = z
  .string()
  .min(3, "Subdomain must be at least 3 characters")
  .max(63, "Subdomain cannot exceed 63 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Subdomain must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)"
  )
  .refine((val) => !RESERVED_SUBDOMAINS.has(val.toLowerCase()), {
    message: "This subdomain is reserved by the platform. Please choose another name.",
  });

export const AccountSignUpSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
    email: z.string().email("Please enter a valid email address").max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const CreateStoreSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters").max(255),
  subdomain: SubdomainSchema,
});

export const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  email: z.string().email("Please enter a valid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  storeName: z.string().min(2, "Store name must be at least 2 characters").max(255).optional(),
  subdomain: SubdomainSchema.optional(),
});

export const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
