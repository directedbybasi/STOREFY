import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Environment Validation Schema", () => {
  const testSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
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
