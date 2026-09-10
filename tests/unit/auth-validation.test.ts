import { describe, it, expect } from "vitest";
import {
  AccountSignUpSchema,
  CreateStoreSchema,
  SignUpSchema,
  SignInSchema,
  SubdomainSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RESERVED_SUBDOMAINS,
} from "@/modules/auth/validation";

describe("Authentication & Registration Validation", () => {
  describe("SubdomainSchema", () => {
    it("accepts valid lowercased subdomains", () => {
      expect(SubdomainSchema.safeParse("velvet-bloom").success).toBe(true);
      expect(SubdomainSchema.safeParse("store123").success).toBe(true);
      expect(SubdomainSchema.safeParse("abc").success).toBe(true);
    });

    it("rejects subdomains shorter than 3 chars or longer than 63", () => {
      expect(SubdomainSchema.safeParse("ab").success).toBe(false);
      expect(SubdomainSchema.safeParse("a".repeat(64)).success).toBe(false);
    });

    it("rejects uppercase and invalid special characters", () => {
      expect(SubdomainSchema.safeParse("MyStore").success).toBe(false);
      expect(SubdomainSchema.safeParse("my_store").success).toBe(false);
      expect(SubdomainSchema.safeParse("store!").success).toBe(false);
    });

    it("rejects reserved platform subdomains", () => {
      for (const reserved of Array.from(RESERVED_SUBDOMAINS)) {
        const res = SubdomainSchema.safeParse(reserved);
        expect(res.success).toBe(false);
      }
    });
  });

  describe("SignUpSchema", () => {
    it("accepts valid registration input", () => {
      const valid = {
        fullName: "Aarav Sharma",
        email: "aarav@velvetbloom.com",
        password: "SecurePassword123",
        storeName: "Velvet Bloom",
        subdomain: "velvet-bloom",
      };
      expect(SignUpSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects weak passwords (missing uppercase or number)", () => {
      const weakMissingUpper = {
        fullName: "Aarav Sharma",
        email: "aarav@velvetbloom.com",
        password: "password123",
        storeName: "Velvet Bloom",
        subdomain: "velvet-bloom",
      };
      expect(SignUpSchema.safeParse(weakMissingUpper).success).toBe(false);

      const weakMissingNumber = {
        fullName: "Aarav Sharma",
        email: "aarav@velvetbloom.com",
        password: "PasswordWithoutNumber",
        storeName: "Velvet Bloom",
        subdomain: "velvet-bloom",
      };
      expect(SignUpSchema.safeParse(weakMissingNumber).success).toBe(false);
    });
  });

  describe("SignInSchema", () => {
    it("validates valid login credentials", () => {
      expect(SignInSchema.safeParse({ email: "user@storefy.shop", password: "Password123" }).success).toBe(true);
    });

    it("rejects empty password", () => {
      expect(SignInSchema.safeParse({ email: "user@storefy.shop", password: "" }).success).toBe(false);
    });
  });

  describe("ForgotPasswordSchema", () => {
    it("validates recovery email", () => {
      expect(ForgotPasswordSchema.safeParse({ email: "user@storefy.shop" }).success).toBe(true);
      expect(ForgotPasswordSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });
  });

  describe("ResetPasswordSchema", () => {
    it("accepts matching complex passwords", () => {
      const valid = {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      };
      expect(ResetPasswordSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const mismatch = {
        password: "NewPassword123",
        confirmPassword: "DifferentPassword123",
      };
      const res = ResetPasswordSchema.safeParse(mismatch);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toBe("Passwords do not match");
      }
    });
  });

  describe("AccountSignUpSchema (Account-First)", () => {
    it("accepts valid account-first registration input without store details", () => {
      const valid = {
        fullName: "Priya Patel",
        email: "priya@example.com",
        password: "SecurePassword123",
        confirmPassword: "SecurePassword123",
      };
      expect(AccountSignUpSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects mismatched confirm password", () => {
      const mismatch = {
        fullName: "Priya Patel",
        email: "priya@example.com",
        password: "SecurePassword123",
        confirmPassword: "WrongPassword123",
      };
      const res = AccountSignUpSchema.safeParse(mismatch);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toBe("Passwords do not match");
      }
    });

    it("rejects passwords lacking uppercase or number", () => {
      const noUpper = {
        fullName: "Priya Patel",
        email: "priya@example.com",
        password: "alllowercase123",
        confirmPassword: "alllowercase123",
      };
      expect(AccountSignUpSchema.safeParse(noUpper).success).toBe(false);
    });
  });

  describe("CreateStoreSchema", () => {
    it("accepts valid store name and subdomain", () => {
      const valid = {
        name: "Aura Botanicals",
        subdomain: "aura-botanicals",
      };
      expect(CreateStoreSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects invalid or reserved subdomains", () => {
      expect(CreateStoreSchema.safeParse({ name: "Aura", subdomain: "admin" }).success).toBe(false);
      expect(CreateStoreSchema.safeParse({ name: "Aura", subdomain: "ab" }).success).toBe(false);
      expect(CreateStoreSchema.safeParse({ name: "Aura", subdomain: "invalid_sub!" }).success).toBe(false);
    });
  });
});
