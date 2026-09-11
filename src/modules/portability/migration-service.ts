import { db } from "@/database/client";
import { migrationJobs, type MigrationJob } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateMigrationJobInput } from "./types";

/**
 * Initiates a platform migration job (e.g. from Shopify or WooCommerce).
 */
export async function createMigrationJob(
  input: CreateMigrationJobInput,
  actorUserId?: string
): Promise<MigrationJob> {
  const [job] = await db
    .insert(migrationJobs)
    .values({
      storeId: input.storeId,
      sourcePlatform: input.sourcePlatform,
      status: "DRAFT",
      mappingConfig: input.mappingConfig,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "migration:create",
      entity: "migration_job",
      entityId: job.id,
      after: { sourcePlatform: input.sourcePlatform },
    });
  }

  return job;
}

/**
 * Executes or simulates execution of a migration job.
 */
export async function executeMigrationJob(
  storeId: string,
  jobId: string,
  actorUserId?: string
): Promise<MigrationJob | null> {
  const [updated] = await db
    .update(migrationJobs)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(migrationJobs.storeId, storeId),
        eq(migrationJobs.id, jobId)
      )
    )
    .returning();

  if (actorUserId && updated) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "migration:execute",
      entity: "migration_job",
      entityId: updated.id,
      after: { status: "COMPLETED" },
    });
  }

  return updated || null;
}

/**
 * Lists migration jobs for a store.
 */
export async function listMigrationJobs(storeId: string): Promise<MigrationJob[]> {
  return await db
    .select()
    .from(migrationJobs)
    .where(eq(migrationJobs.storeId, storeId))
    .orderBy(desc(migrationJobs.createdAt));
}
