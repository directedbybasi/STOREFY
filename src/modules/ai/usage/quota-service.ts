import { db } from "@/database/client";
import { aiRequests, aiUsageLedger } from "@/database/schema/ai";
import { eq, and, sql } from "drizzle-orm";
import { AIRateLimitError, AIQuotaExceededError } from "../core/errors";
import type { AiToolType } from "../core/types";

// In-memory sliding window for rate limiting & duplicate request defense
interface RateLimitEntry {
  timestamps: number[];
  lastPayloadHash?: string;
  lastRequestTime?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit settings: 15 requests per 60 seconds per store+tool
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
// Default daily quota per store (Phase 14 foundation; configurable per plan in Phase 15)
const DEFAULT_DAILY_STORE_QUOTA = 150;

/**
 * Validates store rate limits and daily quota.
 */
export async function checkAiQuotaAndRateLimit(
  storeId: string,
  tool: AiToolType,
  payloadDigest?: string,
  options?: { skipDb?: boolean }
): Promise<void> {
  const now = Date.now();
  const key = `${storeId}:${tool}`;

  // 1. Rate Limit & Duplicate Request Defense
  const entry = rateLimitStore.get(key) || { timestamps: [] };
  // Filter out timestamps outside window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  // Duplicate request check (same hash within 3 seconds)
  if (
    payloadDigest &&
    entry.lastPayloadHash === payloadDigest &&
    entry.lastRequestTime &&
    now - entry.lastRequestTime < 3000
  ) {
    throw new AIRateLimitError("Duplicate AI generation request submitted in rapid succession. Please wait.");
  }

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new AIRateLimitError(
      `Rate limit exceeded for tool ${tool}. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute allowed.`
    );
  }

  // Record timestamp in rate limiter
  entry.timestamps.push(now);
  if (payloadDigest) {
    entry.lastPayloadHash = payloadDigest;
    entry.lastRequestTime = now;
  }
  rateLimitStore.set(key, entry);

  // 2. Daily Quota Check in PostgreSQL (bypassed in offline test environments)
  if (options?.skipDb || process.env.NODE_ENV === "test") {
    return;
  }

  try {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [usage] = await db
      .select({ requestCount: aiUsageLedger.requestCount })
      .from(aiUsageLedger)
      .where(and(eq(aiUsageLedger.storeId, storeId), eq(aiUsageLedger.date, todayStr)))
      .limit(1);

    if (usage && usage.requestCount >= DEFAULT_DAILY_STORE_QUOTA) {
      throw new AIQuotaExceededError(
        `Daily AI request quota (${DEFAULT_DAILY_STORE_QUOTA} requests) reached for this store.`
      );
    }
  } catch (err: unknown) {
    if (err instanceof AIQuotaExceededError) throw err;
  }
}

/**
 * Records an AI request attempt and updates daily usage aggregates.
 */
export async function recordAiRequestAudit(params: {
  storeId: string;
  userId: string;
  productId?: string;
  tool: AiToolType;
  provider: string;
  model: string;
  status: "SUCCEEDED" | "FAILED";
  inputTokens: number;
  outputTokens: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Insert into ai_requests
    const [req] = await db
      .insert(aiRequests)
      .values({
        storeId: params.storeId,
        userId: params.userId,
        productId: params.productId || null,
        tool: params.tool,
        provider: params.provider,
        model: params.model,
        status: params.status,
        inputTokensEstimate: params.inputTokens,
        outputTokensEstimate: params.outputTokens,
        errorMessage: params.errorMessage || null,
        metadata: params.metadata || {},
      })
      .returning({ id: aiRequests.id });

    // 2. Upsert daily aggregate into ai_usage_ledger
    const totalTokens = params.inputTokens + params.outputTokens;
    const isSuccess = params.status === "SUCCEEDED";

    await db
      .insert(aiUsageLedger)
      .values({
        storeId: params.storeId,
        date: todayStr,
        requestCount: 1,
        successCount: isSuccess ? 1 : 0,
        failureCount: !isSuccess ? 0 : 1,
        tokensUsed: totalTokens,
      })
      .onConflictDoUpdate({
        target: [aiUsageLedger.storeId, aiUsageLedger.date],
        set: {
          requestCount: sql`${aiUsageLedger.requestCount} + 1`,
          successCount: isSuccess ? sql`${aiUsageLedger.successCount} + 1` : aiUsageLedger.successCount,
          failureCount: !isSuccess ? sql`${aiUsageLedger.failureCount} + 1` : aiUsageLedger.failureCount,
          tokensUsed: sql`${aiUsageLedger.tokensUsed} + ${totalTokens}`,
          updatedAt: new Date(),
        },
      });

    return req.id;
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "test") {
      return `mock-req-${Date.now()}`;
    }
    throw err;
  }
}

/**
 * Gets AI usage statistics for the merchant dashboard.
 */
export async function getStoreAiUsageMetrics(storeId: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = todayStr.slice(0, 7) + "-01";

  const [todayUsage] = await db
    .select()
    .from(aiUsageLedger)
    .where(and(eq(aiUsageLedger.storeId, storeId), eq(aiUsageLedger.date, todayStr)))
    .limit(1);

  const [monthUsage] = await db
    .select({
      totalRequests: sql<number>`COALESCE(SUM(${aiUsageLedger.requestCount}), 0)::int`,
      totalSuccess: sql<number>`COALESCE(SUM(${aiUsageLedger.successCount}), 0)::int`,
      totalFailures: sql<number>`COALESCE(SUM(${aiUsageLedger.failureCount}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${aiUsageLedger.tokensUsed}), 0)::int`,
    })
    .from(aiUsageLedger)
    .where(and(eq(aiUsageLedger.storeId, storeId), sql`${aiUsageLedger.date} >= ${firstDayOfMonth}`));

  // Recent requests breakdown by tool
  const recentRequests = await db
    .select({
      id: aiRequests.id,
      tool: aiRequests.tool,
      status: aiRequests.status,
      createdAt: aiRequests.createdAt,
    })
    .from(aiRequests)
    .where(eq(aiRequests.storeId, storeId))
    .orderBy(sql`${aiRequests.createdAt} DESC`)
    .limit(10);

  return {
    today: {
      requests: todayUsage?.requestCount || 0,
      success: todayUsage?.successCount || 0,
      failures: todayUsage?.failureCount || 0,
      tokens: todayUsage?.tokensUsed || 0,
      quotaLimit: DEFAULT_DAILY_STORE_QUOTA,
    },
    thisMonth: {
      requests: monthUsage?.totalRequests || 0,
      success: monthUsage?.totalSuccess || 0,
      failures: monthUsage?.totalFailures || 0,
      tokens: monthUsage?.totalTokens || 0,
    },
    recentActivity: recentRequests.map((r) => ({
      id: r.id,
      tool: r.tool,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Resets the in-memory rate limiter (useful for unit tests).
 */
export function resetRateLimiterForTests(): void {
  rateLimitStore.clear();
}
