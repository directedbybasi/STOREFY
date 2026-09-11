import { db } from "@/database/client";
import { backupJobs, stores, type BackupJob } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateBackupJobInput } from "./types";

/**
 * Creates an application-level store metadata backup snapshot job.
 */
export async function createBackupJob(
  input: CreateBackupJobInput,
  actorUserId?: string
): Promise<BackupJob> {
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, input.storeId))
    .limit(1);

  const snapshotMetadata = {
    storeName: store?.name || "Unknown Store",
    timestamp: new Date().toISOString(),
    backupType: input.backupType,
    version: "1.0",
  };

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days retention

  const [job] = await db
    .insert(backupJobs)
    .values({
      storeId: input.storeId,
      backupType: input.backupType,
      status: "COMPLETED",
      snapshotMetadata,
      expiresAt,
      completedAt: new Date(),
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "backup:create_snapshot",
      entity: "backup_job",
      entityId: job.id,
      after: { backupType: input.backupType, status: "COMPLETED" },
    });
  }

  return job;
}

/**
 * Lists backup snapshot jobs for a store.
 */
export async function listBackupJobs(storeId: string): Promise<BackupJob[]> {
  return await db
    .select()
    .from(backupJobs)
    .where(eq(backupJobs.storeId, storeId))
    .orderBy(desc(backupJobs.createdAt));
}
