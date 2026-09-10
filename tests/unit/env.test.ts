import { describe, it, expect } from "vitest";
import { z } from "zod";
import { isConfigured, getEnvDiagnostics, envSchema } from "@/lib/env";

describe("Environment Validation Schema", () => {
  const testSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_ENV: z
      .enum(["development", "staging", "production", "preview", "test"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  });

  it("successfully parses valid hosted development environment variables", () => {
    const valid = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://dev.storefy.shop",
      NEXT_PUBLIC_SUPABASE_URL: "https://storefy-dev.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key-12345",
    };

    const result = testSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe("https://dev.storefy.shop");
    }
  });

  it("accepts preview environment in NEXT_PUBLIC_APP_ENV", () => {
    const previewEnv = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_ENV: "preview",
      NEXT_PUBLIC_APP_URL: "https://dev.storefy.shop",
      NEXT_PUBLIC_SUPABASE_URL: "https://storefy-dev.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key-12345",
    };

    const result = envSchema.safeParse(previewEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_APP_ENV).toBe("preview");
    }
  });

  it("gracefully falls back to defaults when APP_ENV or ROOT_DOMAIN are empty strings", () => {
    const emptyVars = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_ENV: "",
      NEXT_PUBLIC_ROOT_DOMAIN: "",
    };

    const result = envSchema.safeParse(emptyVars);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_ROOT_DOMAIN).toBe("storefy.shop");
    }
  });

  it("fails when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", () => {
    const invalid = {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://dev.storefy.shop",
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key-12345",
    };

    const result = testSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("fails when an invalid environment tier is specified", () => {
    const invalid = {
      NODE_ENV: "invalid-tier",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://dev.storefy.shop",
      NEXT_PUBLIC_SUPABASE_URL: "https://storefy-dev.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key-12345",
    };

    const result = testSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Safe Environment Diagnostics", () => {
  it("correctly identifies placeholder strings as unconfigured", () => {
    expect(isConfigured("placeholder-anon-key")).toBe(false);
    expect(isConfigured("postgres://postgres.[ref]:[pass]@[pooler-host]:6543/postgres")).toBe(
      false
    );
    expect(isConfigured("dev-placeholder-service-role-key")).toBe(false);
    expect(isConfigured("")).toBe(false);
    expect(isConfigured("   ")).toBe(false);
    expect(isConfigured(undefined)).toBe(false);
    expect(isConfigured(null)).toBe(false);
  });

  it("identifies real values as configured", () => {
    expect(isConfigured("https://zhnbddfxwqqtpkwuqlrp.supabase.co")).toBe(true);
    expect(isConfigured("sb_publishable_ZghtrfyRw_awNO_R17OczQ_Jz7NK2oh")).toBe(true);
    expect(isConfigured("postgresql://postgres.user:mypass@aws-0.supabase.com:6543/postgres")).toBe(
      true
    );
  });

  it("returns only boolean diagnostic fields without exposing values", () => {
    const diagnostics = getEnvDiagnostics();

    expect(typeof diagnostics.supabaseUrlConfigured).toBe("boolean");
    expect(typeof diagnostics.supabaseAnonKeyConfigured).toBe("boolean");
    expect(typeof diagnostics.serviceRoleConfigured).toBe("boolean");
    expect(typeof diagnostics.databaseConfigured).toBe("boolean");
    expect(typeof diagnostics.directUrlConfigured).toBe("boolean");
    expect(typeof diagnostics.encryptionKeyConfigured).toBe("boolean");

    // Ensure no raw secrets are in the object keys or values
    const values = Object.values(diagnostics);
    for (const val of values) {
      expect(typeof val).toBe("boolean");
    }
  });
});

