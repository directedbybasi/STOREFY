/**
 * STOREFY — Centralized Application Error Hierarchy & RFC 7807 Compliance
 */

export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: FieldError[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
    details?: FieldError[],
    isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input payload", details?: FieldError[]) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required to access this resource") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", identifier?: string) {
    const msg = identifier
      ? `${resource} '${identifier}' was not found`
      : `${resource} was not found`;
    super(msg, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "A resource conflict occurred") {
    super(message, 409, "CONFLICT");
  }
}

export class InsufficientStockError extends AppError {
  constructor(productTitle: string, available: number) {
    super(
      `Insufficient inventory for '${productTitle}'. Only ${available} available.`,
      422,
      "INSUFFICIENT_STOCK"
    );
  }
}

export class PlanEntitlementError extends AppError {
  constructor(featureName: string, message?: string) {
    super(
      message ||
        `Feature '${featureName}' is not included in your active subscription tier. Please upgrade.`,
      403,
      "PLAN_LIMIT_EXCEEDED"
    );
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super(
      `Too many requests. Please retry in ${retryAfterSeconds} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalMessage?: string) {
    super(
      `External provider '${service}' failed to respond: ${originalMessage || "Unknown provider error"}`,
      502,
      "EXTERNAL_SERVICE_ERROR"
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message = "A persistent database operation failed") {
    super(message, 500, "DATABASE_ERROR", undefined, false);
  }
}

/**
 * Serializes any caught error into a safe RFC 7807 / API-SPECIFICATION envelope
 */
export function formatApiError(error: unknown, traceId = "trace_" + Date.now().toString(36)) {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false as const,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp,
          traceId,
        },
      },
    };
  }

  // Unhandled internal errors (mask raw messages in production)
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd
    ? "An unexpected internal server error occurred"
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return {
    statusCode: 500,
    body: {
      success: false as const,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
        timestamp,
        traceId,
      },
    },
  };
}
