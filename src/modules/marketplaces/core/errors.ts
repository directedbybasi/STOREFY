/**
 * Marketplace Connector Error Classes
 * Provides clean, descriptive domain errors for marketplace operations.
 */

export class MarketplaceError extends Error {
  public readonly code: string;
  public readonly marketplace?: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code = "MARKETPLACE_ERROR",
    marketplace?: string,
    statusCode = 400
  ) {
    super(message);
    this.name = "MarketplaceError";
    this.code = code;
    this.marketplace = marketplace;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProductNotFoundError extends MarketplaceError {
  constructor(reference: string, marketplace = "MEESHO") {
    super(
      `Product reference '${reference}' was not found on ${marketplace}.`,
      "MARKETPLACE_PRODUCT_NOT_FOUND",
      marketplace,
      404
    );
    this.name = "ProductNotFoundError";
  }
}

export class RateLimitError extends MarketplaceError {
  public readonly retryAfterSeconds?: number;

  constructor(marketplace = "MEESHO", retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded for ${marketplace} connector. Please wait before retrying.`,
      "MARKETPLACE_RATE_LIMIT",
      marketplace,
      429
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class UnsupportedOperationError extends MarketplaceError {
  constructor(operation: string, marketplace = "MEESHO") {
    super(
      `Operation '${operation}' is not supported by the ${marketplace} connector.`,
      "MARKETPLACE_UNSUPPORTED_OPERATION",
      marketplace,
      501
    );
    this.name = "UnsupportedOperationError";
  }
}

export class MalformedDataError extends MarketplaceError {
  constructor(details: string, marketplace = "MEESHO") {
    super(
      `Malformed or unparseable product data received from ${marketplace}: ${details}`,
      "MARKETPLACE_MALFORMED_DATA",
      marketplace,
      422
    );
    this.name = "MalformedDataError";
  }
}

export class ComplianceRestrictionError extends MarketplaceError {
  constructor(reason: string, marketplace = "MEESHO") {
    super(
      `Compliance boundary notice: ${reason}`,
      "MARKETPLACE_COMPLIANCE_RESTRICTION",
      marketplace,
      403
    );
    this.name = "ComplianceRestrictionError";
  }
}
