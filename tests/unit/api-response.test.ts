import { describe, it, expect } from "vitest";
import { formatApiError, AppError, ValidationError, NotFoundError } from "@/core/errors";

describe("API Error & RFC 7807 Serialization", () => {
  it("formats generic AppError with standard fields and traceId", () => {
    const error = new AppError("Something went wrong", 500, "SYSTEM_ERROR");
    const formatted = formatApiError(error, "trace_123");

    expect(formatted.statusCode).toBe(500);
    expect(formatted.body.success).toBe(false);
    expect(formatted.body.error.code).toBe("SYSTEM_ERROR");
    expect(formatted.body.error.message).toBe("Something went wrong");
    expect(formatted.body.error.traceId).toBe("trace_123");
    expect(formatted.body.error.timestamp).toBeDefined();
  });

  it("formats ValidationError with field-level details", () => {
    const details = [{ field: "email", message: "Invalid email" }];
    const error = new ValidationError("Validation failed", details);
    const formatted = formatApiError(error, "trace_val");

    expect(formatted.statusCode).toBe(400);
    expect(formatted.body.error.code).toBe("VALIDATION_ERROR");
    expect(formatted.body.error.details).toEqual(details);
  });

  it("formats NotFoundError with 404 code", () => {
    const error = new NotFoundError("Product", "prod_123");
    const formatted = formatApiError(error);

    expect(formatted.statusCode).toBe(404);
    expect(formatted.body.error.code).toBe("NOT_FOUND");
    expect(formatted.body.error.message).toContain("prod_123");
  });
});
