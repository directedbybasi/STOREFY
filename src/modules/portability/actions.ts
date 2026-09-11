"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as exportService from "./export-service";
import * as importService from "./import-service";
import * as migrationService from "./migration-service";
import * as backupService from "./backup-service";
import {
  CreateDataExportSchema,
  CreateDataImportSchema,
  CreateMigrationJobSchema,
  CreateBackupJobSchema,
} from "./types";

export async function createDataExportAction(formData: unknown) {
  const parsed = CreateDataExportSchema.parse(formData);
  const ctx = await requirePermission("exports:write", parsed.storeId);
  return await exportService.createDataExport(parsed, ctx.user.id);
}

export async function validateDataImportAction(formData: unknown) {
  const parsed = CreateDataImportSchema.parse(formData);
  const ctx = await requirePermission("imports:write", parsed.storeId);
  return await importService.validateAndQueueImport(parsed, ctx.user.id);
}

export async function executeDataImportAction(storeId: string, jobId: string) {
  const ctx = await requirePermission("imports:write", storeId);
  return await importService.executeDataImport(storeId, jobId, ctx.user.id);
}

export async function createMigrationJobAction(formData: unknown) {
  const parsed = CreateMigrationJobSchema.parse(formData);
  const ctx = await requirePermission("settings:manage", parsed.storeId);
  return await migrationService.createMigrationJob(parsed, ctx.user.id);
}

export async function createBackupJobAction(formData: unknown) {
  const parsed = CreateBackupJobSchema.parse(formData);
  const ctx = await requirePermission("settings:manage", parsed.storeId);
  return await backupService.createBackupJob(parsed, ctx.user.id);
}

export async function listExportJobsAction(storeId: string) {
  await requirePermission("exports:read", storeId);
  return await exportService.listExportJobs(storeId);
}
