import { z } from "zod";

export const CreateDataExportSchema = z.object({
  storeId: z.string().uuid(),
  entityType: z.enum(["products", "customers", "orders", "inventory", "content", "all"]),
  format: z.enum(["JSON", "CSV"]).default("JSON"),
});

export type CreateDataExportInput = z.infer<typeof CreateDataExportSchema>;

export const CreateDataImportSchema = z.object({
  storeId: z.string().uuid(),
  entityType: z.enum(["products", "customers", "inventory"]),
  format: z.enum(["JSON", "CSV"]).default("JSON"),
  rawContent: z.string().min(1),
});

export type CreateDataImportInput = z.infer<typeof CreateDataImportSchema>;

export const CreateMigrationJobSchema = z.object({
  storeId: z.string().uuid(),
  sourcePlatform: z.enum(["SHOPIFY", "WOOCOMMERCE", "CUSTOM_JSON"]).default("SHOPIFY"),
  mappingConfig: z.record(z.unknown()).default({}),
});

export type CreateMigrationJobInput = z.infer<typeof CreateMigrationJobSchema>;

export const CreateBackupJobSchema = z.object({
  storeId: z.string().uuid(),
  backupType: z.enum(["METADATA_SNAPSHOT", "STORE_EXPORT"]).default("METADATA_SNAPSHOT"),
});

export type CreateBackupJobInput = z.infer<typeof CreateBackupJobSchema>;
