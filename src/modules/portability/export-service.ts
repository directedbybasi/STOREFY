import { db } from "@/database/client";
import {
  dataExportJobs,
  products,
  customers,
  orders,
  inventory,
  cmsPages,
  type DataExportJob,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { NotFoundError, UnauthorizedError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateDataExportInput } from "./types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Executes a data export job and generates an expiring, non-forgeable download token.
 */
export async function createDataExport(
  input: CreateDataExportInput,
  actorUserId?: string
): Promise<{ job: DataExportJob; rawToken: string }> {
  let exportData: unknown[] = [];

  switch (input.entityType) {
    case "products":
      exportData = await db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          status: products.status,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(eq(products.storeId, input.storeId));
      break;

    case "customers":
      exportData = await db
        .select({
          id: customers.id,
          email: customers.email,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          ordersCount: customers.ordersCount,
          totalSpent: customers.totalSpent,
          createdAt: customers.createdAt,
        })
        .from(customers)
        .where(eq(customers.storeId, input.storeId));
      break;

    case "orders":
      exportData = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.storeId, input.storeId));
      break;

    case "inventory":
      exportData = await db
        .select({
          id: inventory.id,
          variantId: inventory.variantId,
          onHand: inventory.onHand,
          available: inventory.available,
          reserved: inventory.reserved,
        })
        .from(inventory)
        .where(eq(inventory.storeId, input.storeId));
      break;

    case "content":
      exportData = await db
        .select({
          id: cmsPages.id,
          title: cmsPages.title,
          slug: cmsPages.slug,
          status: cmsPages.status,
          publishedAt: cmsPages.publishedAt,
        })
        .from(cmsPages)
        .where(eq(cmsPages.storeId, input.storeId));
      break;

    case "all":
    default:
      const p = await db.select({ id: products.id, title: products.title }).from(products).where(eq(products.storeId, input.storeId));
      const c = await db.select({ id: customers.id, email: customers.email }).from(customers).where(eq(customers.storeId, input.storeId));
      const o = await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.storeId, input.storeId));
      exportData = [{ products: p, customers: c, orders: o }];
      break;
  }

  const rawPayload = JSON.stringify(exportData, null, 2);
  const rawToken = `exp_${randomBytes(24).toString("hex")}`;
  const downloadTokenHash = hashToken(rawToken);
  const downloadExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  const [job] = await db
    .insert(dataExportJobs)
    .values({
      storeId: input.storeId,
      entityType: input.entityType,
      format: input.format,
      status: "COMPLETED",
      downloadTokenHash,
      downloadExpiresAt,
      rowCount: exportData.length,
      fileSizeBytes: Buffer.byteLength(rawPayload, "utf8"),
      exportDataPayload: rawPayload,
      completedAt: new Date(),
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "data:export",
      entity: "data_export_job",
      entityId: job.id,
      after: { entityType: input.entityType, rowCount: job.rowCount },
    });
  }

  return { job, rawToken };
}

/**
 * Downloads exported payload using secure expiring token.
 */
export async function downloadExportPayload(
  storeId: string,
  jobId: string,
  rawToken: string
): Promise<string> {
  const tokenHash = hashToken(rawToken);

  const [job] = await db
    .select()
    .from(dataExportJobs)
    .where(
      and(
        eq(dataExportJobs.storeId, storeId),
        eq(dataExportJobs.id, jobId),
        eq(dataExportJobs.downloadTokenHash, tokenHash)
      )
    )
    .limit(1);

  if (!job) {
    throw new NotFoundError("Export job or download token invalid");
  }

  if (job.downloadExpiresAt && job.downloadExpiresAt < new Date()) {
    throw new UnauthorizedError("Export download token has expired");
  }

  return job.exportDataPayload || "[]";
}

/**
 * Lists data export jobs for a store.
 */
export async function listExportJobs(storeId: string) {
  return await db
    .select({
      id: dataExportJobs.id,
      entityType: dataExportJobs.entityType,
      format: dataExportJobs.format,
      status: dataExportJobs.status,
      rowCount: dataExportJobs.rowCount,
      fileSizeBytes: dataExportJobs.fileSizeBytes,
      downloadExpiresAt: dataExportJobs.downloadExpiresAt,
      createdAt: dataExportJobs.createdAt,
      completedAt: dataExportJobs.completedAt,
    })
    .from(dataExportJobs)
    .where(eq(dataExportJobs.storeId, storeId))
    .orderBy(desc(dataExportJobs.createdAt));
}
