import { db } from "@/database/client";
import { appInstallations, type AppInstallation } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";

/**
 * Installs a third-party or internal application into a store.
 */
export async function installApp(
  storeId: string,
  appId: string,
  grantedScopes: string[],
  config: Record<string, unknown> = {},
  actorUserId?: string
): Promise<AppInstallation> {
  const [existing] = await db
    .select()
    .from(appInstallations)
    .where(
      and(
        eq(appInstallations.storeId, storeId),
        eq(appInstallations.appId, appId)
      )
    )
    .limit(1);

  let result: AppInstallation;
  if (existing) {
    const [updated] = await db
      .update(appInstallations)
      .set({
        grantedScopes,
        config,
        status: "ACTIVE",
        uninstalledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(appInstallations.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [created] = await db
      .insert(appInstallations)
      .values({
        storeId,
        appId,
        grantedScopes,
        config,
        status: "ACTIVE",
      })
      .returning();
    result = created;
  }

  if (actorUserId) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "app:install",
      entity: "app_installation",
      entityId: result.id,
      after: { appId, grantedScopes },
    });
  }

  return result;
}

/**
 * Uninstalls an application from a store.
 */
export async function uninstallApp(
  storeId: string,
  appId: string,
  actorUserId?: string
): Promise<AppInstallation | null> {
  const [uninstalled] = await db
    .update(appInstallations)
    .set({
      status: "UNINSTALLED",
      uninstalledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appInstallations.storeId, storeId),
        eq(appInstallations.appId, appId)
      )
    )
    .returning();

  if (actorUserId && uninstalled) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "app:uninstall",
      entity: "app_installation",
      entityId: uninstalled.id,
      after: { status: "UNINSTALLED" },
    });
  }

  return uninstalled || null;
}

/**
 * Lists installed applications for a store.
 */
export async function listInstalledApps(storeId: string): Promise<AppInstallation[]> {
  return await db
    .select()
    .from(appInstallations)
    .where(
      and(
        eq(appInstallations.storeId, storeId),
        eq(appInstallations.status, "ACTIVE")
      )
    );
}
