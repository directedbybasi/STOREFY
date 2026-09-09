import { z } from "zod";

/**
 * Server and Client Environment Variable Validation Schema
 */
const envSchema = z.object({
  // Runtime environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),

  // Public application routing
  NEXT_PUBLIC_APP_URL: z.string().url().default("https://dev.storefy.shop"),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default("storefy.shop"),

  // Public Supabase credentials
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(10, { message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" }),

  // Server-only credentials (omitted on client)
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(10, { message: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .optional(),
  DATABASE_URL: z.string().min(10, { message: "DATABASE_URL is required" }).optional(),
  DIRECT_URL: z.string().min(10, { message: "DIRECT_URL is required" }).optional(),
  ENCRYPTION_MASTER_KEY: z
    .string()
    .length(64, { message: "ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)" })
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and caches environment variables.
 */
function validateEnv(): Env {
  // If running in browser, only public variables are accessible
  const isServer = typeof window === "undefined";

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ...(isServer && {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY,
    }),
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // In test or build without keys, warn or throw cleanly
    if (process.env.NODE_ENV === "test") {
      return rawEnv as Env;
    }

    throw new Error(
      `[STOREFY CONFIG ERROR] Invalid environment variables:\n${errorDetails}\nCheck your .env.development or platform environment variables.`
    );
  }

  return parsed.data;
}

export const env = validateEnv();
