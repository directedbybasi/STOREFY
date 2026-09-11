import { db } from "@/database/client";
import { auditLogs, type AuditActorType } from "@/database/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface RecordAuditInput {
  storeId: string;
  actorId?: string;
  actorType?: AuditActorType;
  event: string;
  entityType: string;
  entityId?: string;
  beforeSummary?: Record<string, unknown>;
  afterSummary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface QueryAuditInput {
  storeId: string;
  entityType?: string;
  event?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Appends an immutable audit entry to the audit_logs table.
 */
export async function recordAuditEvent(input: RecordAuditInput) {
  const {
    storeId,
    actorId,
    actorType = "USER",
    event,
    entityType,
    entityId,
    beforeSummary,
    afterSummary,
    metadata,
    ipAddress,
    userAgent,
  } = input;

  const [log] = await db
    .insert(auditLogs)
    .values({
      storeId,
      actorId: actorId || null,
      actorType,
      event,
      entityType,
      entityId: entityId || null,
      beforeSummary: beforeSummary || null,
      afterSummary: afterSummary || null,
      metadata: metadata || {},
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })
    .returning();

  return log;
}

/**
 * Queries store-scoped audit history.
 */
export async function queryAuditLogs(input: QueryAuditInput) {
  const { storeId, entityType, event, fromDate, toDate, limit = 50, offset = 0 } = input;

  const conditions = [eq(auditLogs.storeId, storeId)];

  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (event) conditions.push(eq(auditLogs.event, event));
  if (fromDate) conditions.push(gte(auditLogs.createdAt, fromDate));
  if (toDate) conditions.push(lte(auditLogs.createdAt, toDate));

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}
