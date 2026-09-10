/**
 * Environment configuration facade for @/lib/env.
 * Re-exports runtime environment validator, safe boolean diagnostics, and configuration helpers.
 */
export {
  env,
  envSchema,
  isConfigured,
  getEnvDiagnostics,
  type Env,
  type EnvDiagnostics,
} from "@/core/config/env";
