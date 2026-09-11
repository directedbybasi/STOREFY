import { RateLimitError } from "@/core/errors";

interface RateLimitBucket {
  tokens: number[];
}

class InMemoryRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  /**
   * Checks whether the given key is within the rate limit.
   * Uses a sliding window log algorithm.
   */
  public check(
    key: string,
    limit: number,
    windowSeconds: number
  ): { allowed: boolean; remaining: number; retryAfter: number } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    const bucket = this.buckets.get(key) || { tokens: [] };

    // Evict timestamps older than the sliding window
    const validTokens = bucket.tokens.filter((timestamp) => timestamp > windowStart);

    if (validTokens.length >= limit) {
      const oldestToken = validTokens[0] || now;
      const retryAfter = Math.max(1, Math.ceil((oldestToken + windowMs - now) / 1000));
      this.buckets.set(key, { tokens: validTokens });

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    validTokens.push(now);
    this.buckets.set(key, { tokens: validTokens });

    return {
      allowed: true,
      remaining: limit - validTokens.length,
      retryAfter: 0,
    };
  }

  /**
   * Asserts rate limit, throwing RateLimitError if exceeded.
   */
  public require(key: string, limit: number, windowSeconds: number): void {
    const result = this.check(key, limit, windowSeconds);
    if (!result.allowed) {
      throw new RateLimitError(result.retryAfter);
    }
  }

  /**
   * Resets rate limits (useful for testing and tenant quota replenishment).
   */
  public reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();
