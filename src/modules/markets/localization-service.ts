import { db } from "@/database/client";
import { localizedContent, type LocalizedContent } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import type { SetLocalizedContentInput } from "./types";

/**
 * Sets or updates translated field content for a catalog or CMS entity.
 */
export async function setLocalizedContent(
  input: SetLocalizedContentInput
): Promise<LocalizedContent> {
  const [existing] = await db
    .select()
    .from(localizedContent)
    .where(
      and(
        eq(localizedContent.storeId, input.storeId),
        eq(localizedContent.entityType, input.entityType),
        eq(localizedContent.entityId, input.entityId),
        eq(localizedContent.locale, input.locale.toLowerCase()),
        eq(localizedContent.fieldName, input.fieldName)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(localizedContent)
      .set({
        translatedValue: input.translatedValue,
        updatedAt: new Date(),
      })
      .where(eq(localizedContent.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(localizedContent)
    .values({
      storeId: input.storeId,
      entityType: input.entityType,
      entityId: input.entityId,
      locale: input.locale.toLowerCase(),
      fieldName: input.fieldName,
      translatedValue: input.translatedValue,
    })
    .returning();

  return created;
}

/**
 * Retrieves a dictionary of localized translations for a specific entity and locale.
 */
export async function getLocalizedTranslations(
  storeId: string,
  entityType: string,
  entityId: string,
  locale: string
): Promise<Record<string, string>> {
  const records = await db
    .select({
      fieldName: localizedContent.fieldName,
      translatedValue: localizedContent.translatedValue,
    })
    .from(localizedContent)
    .where(
      and(
        eq(localizedContent.storeId, storeId),
        eq(localizedContent.entityType, entityType),
        eq(localizedContent.entityId, entityId),
        eq(localizedContent.locale, locale.toLowerCase())
      )
    );

  const dict: Record<string, string> = {};
  for (const r of records) {
    dict[r.fieldName] = r.translatedValue;
  }
  return dict;
}
