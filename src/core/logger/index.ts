/**
 * STOREFY — Structured Server Logger with Automatic Credential Redaction
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "access_token",
  "refresh_token",
  "service_role_key",
  "authorization",
  "cookie",
  "cvv",
  "cardnumber",
  "key_secret",
  "encryption_master_key",
  "salt",
]);

/**
 * Recursively deep-redacts sensitive keys from objects before logging
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const traceId = (meta?.traceId as string | undefined) || undefined;
    const sanitizedMeta = meta ? redactSensitiveData(meta) : undefined;

    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      traceId,
      ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
    });
  }

  public info(message: string, meta?: Record<string, unknown>) {
    console.log(this.formatLog("info", message, meta));
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", message, meta));
  }

  public error(message: string, meta?: Record<string, unknown>) {
    console.error(this.formatLog("error", message, meta));
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, meta));
    }
  }
}

export const logger = new Logger();
