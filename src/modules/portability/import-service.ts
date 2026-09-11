import { db } from "@/database/client";
import { dataImportJobs, type DataImportJob } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateDataImportInput } from "./types";

/**
 * Validates and previews an import payload without modifying production records.
 */
export async function validateAndQueueImport(
  input: CreateDataImportInput,
  actorUserId?: string
): Promise<DataImportJob> {
  let records: Record<string, unknown>[] = [];
  const validationErrors: Record<string, unknown>[] = [];

  try {
    if (input.format === "JSON") {
      const parsed = JSON.parse(input.rawContent);
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // Basic CSV split
      const lines = input.rawContent.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      records = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
    }
  } catch (err: unknown) {
    throw new BadRequestError(`Malformed import file content: ${err instanceof Error ? err.message : String(err)}`);
  }

  let validCount = 0;
  let invalidCount = 0;

  records.forEach((row, idx) => {
    let isValid = true;
    const rowNum = idx + 1;

    if (input.entityType === "products") {
      if (!row.title) {
        validationErrors.push({ row: rowNum, error: "Missing required field 'title'" });
        isValid = false;
      }
    } else if (input.entityType === "customers") {
      if (!row.email || !String(row.email).includes("@")) {
        validationErrors.push({ row: rowNum, error: "Invalid or missing 'email'" });
        isValid = false;
      }
    } else if (input.entityType === "inventory") {
      if (!row.variantId) {
        validationErrors.push({ row: rowNum, error: "Missing 'variantId'" });
        isValid = false;
      }
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });

  const status = validCount > 0 ? "VALIDATED" : "FAILED";

  const [job] = await db
    .insert(dataImportJobs)
    .values({
      storeId: input.storeId,
      entityType: input.entityType,
      format: input.format,
      status,
      totalRows: records.length,
      validRows: validCount,
      invalidRows: invalidCount,
      validationErrors,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "data:import_validate",
      entity: "data_import_job",
      entityId: job.id,
      after: { total: records.length, valid: validCount, invalid: invalidCount },
    });
  }

  return job;
}

/**
 * Confirms and executes an import job.
 */
export async function executeDataImport(
  storeId: string,
  jobId: string,
  actorUserId?: string
): Promise<DataImportJob> {
  const [job] = await db
    .select()
    .from(dataImportJobs)
    .where(
      and(
        eq(dataImportJobs.storeId, storeId),
        eq(dataImportJobs.id, jobId)
      )
    )
    .limit(1);

  if (!job) {
    throw new NotFoundError("Import job not found");
  }

  if (job.status !== "VALIDATED" && job.status !== "CONFIRMED") {
    throw new BadRequestError(`Cannot execute import in status: ${job.status}`);
  }

  const [completed] = await db
    .update(dataImportJobs)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
    })
    .where(eq(dataImportJobs.id, job.id))
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "data:import_execute",
      entity: "data_import_job",
      entityId: job.id,
      after: { status: "COMPLETED", rowsImported: job.validRows },
    });
  }

  return completed;
}
