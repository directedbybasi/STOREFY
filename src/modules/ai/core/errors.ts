/**
 * Error hierarchy for Phase 14 AI Intelligence Tools.
 */
export class AIError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = "AI_ERROR", statusCode = 500) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AIProviderUnavailableError extends AIError {
  constructor(message = "AI service provider is currently unavailable. Please try again.") {
    super(message, "AI_PROVIDER_UNAVAILABLE", 503);
    this.name = "AIProviderUnavailableError";
  }
}

export class AIRateLimitError extends AIError {
  constructor(message = "Too many AI generation requests. Please slow down and try again later.") {
    super(message, "AI_RATE_LIMIT_EXCEEDED", 429);
    this.name = "AIRateLimitError";
  }
}

export class AIQuotaExceededError extends AIError {
  constructor(message = "Store daily AI intelligence quota has been reached.") {
    super(message, "AI_QUOTA_EXCEEDED", 403);
    this.name = "AIQuotaExceededError";
  }
}

export class AIPromptInjectionError extends AIError {
  constructor(message = "Input content contains disallowed control patterns or instruction overrides.") {
    super(message, "AI_PROMPT_INJECTION_DETECTED", 400);
    this.name = "AIPromptInjectionError";
  }
}

export class AIValidationError extends AIError {
  constructor(message: string) {
    super(message, "AI_VALIDATION_ERROR", 422);
    this.name = "AIValidationError";
  }
}

export class AIStaleConflictError extends AIError {
  constructor(message = "The product has been updated since this suggestion was generated. Please refresh.") {
    super(message, "AI_STALE_CONFLICT", 409);
    this.name = "AIStaleConflictError";
  }
}

export class AIUnauthorizedToolError extends AIError {
  constructor(toolName: string) {
    super(
      `Unauthorized tool '${toolName}'. Only the 7 approved product intelligence tools are allowed.`,
      "AI_UNAUTHORIZED_TOOL",
      400
    );
    this.name = "AIUnauthorizedToolError";
  }
}
