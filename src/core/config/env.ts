import { z } from "zod";

/**
 * Known placeholder fragments that should not be considered valid configured values.
 */
export const PLACEHOLDER_PATTERNS = [
  "placeholder",
  "[ref]",
  "[pass]",
  "[pooler-host]",
  "dev-placeholder",
  "your-password",
  "your-project-id",
];

/**
 * Sanitizes raw env input: trims whitespace, converts empty strings and placeholders to undefined.
 */
export const sanitizeEnvValue = (val: unknown): string | undefined => {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (trimmed.length === 0) return undefined;
  if (PLACEHOLDER_PATTERNS.some((pattern) => trimmed.toLowerCase().includes(pattern))) {
    return undefined;
  }
  return trimmed;
};

/**
 * Checks if an environment variable is present, non-empty, and not a placeholder.
 */
export function isConfigured(value: string | undefined | null): boolean {
  return sanitizeEnvValue(value) !== undefined;
}

/**
 * Server and Client Environment Variable Validation Schema
 */
export const envSchema = z.object({
  // Runtime environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_ENV: z.preprocess(
    (val) => {
      if (typeof val !== "string" || !val.trim()) {
        return process.env.VERCEL_ENV || "development";
      }
      return val.trim();
    },
    z.enum(["development", "staging", "production", "preview", "test"]).default("development")
  ),

  // Public application routing
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (val) => {
      if (typeof val !== "string" || !val.trim()) return "https://dev.storefy.shop";
      const trimmed = val.trim();
      return trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    },
    z.string().url().default("https://dev.storefy.shop")
  ),
  NEXT_PUBLIC_ROOT_DOMAIN: z.preprocess(
    (val) => (typeof val === "string" && val.trim() ? val.trim() : "storefy.shop"),
    z.string().min(1).default("storefy.shop")
  ),

  // Public Supabase credentials
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    sanitizeEnvValue,
    z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }).optional()
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    sanitizeEnvValue,
    z.string().min(10, { message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" }).optional()
  ),

  // Server-only credentials (omitted on client)
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    sanitizeEnvValue,
    z.string().min(10, { message: "SUPABASE_SERVICE_ROLE_KEY is required" }).optional()
  ),
  DATABASE_URL: z.preprocess(
    sanitizeEnvValue,
    z.string().min(10, { message: "DATABASE_URL is required" }).optional()
  ),
  DIRECT_URL: z.preprocess(
    sanitizeEnvValue,
    z.string().min(10, { message: "DIRECT_URL is required" }).optional()
  ),
  ENCRYPTION_MASTER_KEY: z.preprocess(
    sanitizeEnvValue,
    z
      .string()
      .length(64, { message: "ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)" })
      .optional()
  ),
});

export type Env = z.infer<typeof envSchema>;

export interface EnvDiagnostics {
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  databaseConfigured: boolean;
  directUrlConfigured: boolean;
  encryptionKeyConfigured: boolean;
}

/**
 * Safe runtime diagnostic reporting ONLY boolean presence of the 6 core variables.
 * NEVER exposes or returns actual secrets.
 */
export function getEnvDiagnostics(): EnvDiagnostics {
  return {
    supabaseUrlConfigured: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyConfigured: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleConfigured: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    databaseConfigured: isConfigured(process.env.DATABASE_URL),
    directUrlConfigured: isConfigured(process.env.DIRECT_URL),
    encryptionKeyConfigured: isConfigured(process.env.ENCRYPTION_MASTER_KEY),
  };
}

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

    // In test, build phase, CI, or Vercel: log warning and do not crash the build
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.VERCEL ||
      process.env.CI
    ) {
      console.warn(
        `[STOREFY CONFIG WARNING] Environment validation issues during build/deployment:\n${errorDetails}`
      );
      return rawEnv as unknown as Env;
    }

    throw new Error(
      `[STOREFY CONFIG ERROR] Invalid environment variables:\n${errorDetails}\nCheck your environment configuration.`
    );
  }

  return parsed.data;
}

export const env = validateEnv();
