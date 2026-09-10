"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { collections, productCollections, products, type Collection } from "@/database/schema";
import { eq, and, sql, asc, count, inArray } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { CollectionSchema, slugify, type CollectionInput } from "./validation";
import { NotFoundError } from "@/core/errors";

export interface CollectionListItem extends Collection {
  productsCount: number;
}

/**
 * Returns all collections for the active store with product count.
 */
export async function getCollectionsAction(): Promise<CollectionListItem[]> {
  const ctx = await requirePermission("catalog:read");
  const storeId = ctx.store.id;

  const collectionRows = await db
    .select()
    .from(collections)
    .where(eq(collections.storeId, storeId))
    .orderBy(asc(collections.title));

  if (collectionRows.length === 0) return [];

  const collectionIds = collectionRows.map((c) => c.id);

  const productCounts = await db
    .select({
      collectionId: productCollections.collectionId,
      cnt: count(),
    })
    .from(productCollections)
    .where(inArray(productCollections.collectionId, collectionIds))
    .groupBy(productCollections.collectionId);

  const countMap = new Map<string, number>();
  for (const pc of productCounts) {
    countMap.set(pc.collectionId, Number(pc.cnt));
  }

  return collectionRows.map((c) => ({
    ...c,
    productsCount: countMap.get(c.id) || 0,
  }));
}

/**
 * Retrieves a single collection by ID along with its assigned product IDs.
 */
export async function getCollectionByIdAction(id: string) {
  const ctx = await requirePermission("catalog:read");
  const storeId = ctx.store.id;

  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.storeId, storeId)))
    .limit(1);

  if (!collection) {
    throw new NotFoundError(`Collection not found or unauthorized: ${id}`);
  }

  const assigned = await db
    .select({ productId: productCollections.productId })
    .from(productCollections)
    .where(eq(productCollections.collectionId, id));

  return {
    collection,
    productIds: assigned.map((a) => a.productId),
  };
}

/**
 * Creates a collection.
 */
export async function createCollectionAction(input: CollectionInput) {
  const parsed = CollectionSchema.parse(input);
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  let baseSlug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  if (!baseSlug) baseSlug = `collection-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.storeId, storeId), eq(collections.slug, finalSlug)))
      .limit(1);
    if (!existing) break;
    counter++;
    finalSlug = `${baseSlug}-${counter}`;
  }

  const [newCol] = await db
    .insert(collections)
    .values({
      storeId,
      title: parsed.title,
      slug: finalSlug,
      description: parsed.description || null,
      imageUrl: parsed.imageUrl || null,
      isActive: parsed.isActive ?? true,
      isAutomatic: parsed.isAutomatic ?? false,
      rules: parsed.rules || [],
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.description || null,
    })
    .returning();

  // If products are assigned, insert associations (verifying product ownership)
  if (parsed.productIds && parsed.productIds.length > 0) {
    // Only associate products belonging to ctx.store.id
    const validProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.storeId, storeId), inArray(products.id, parsed.productIds)));

    if (validProducts.length > 0) {
      const inserts = validProducts.map((p, idx) => ({
        collectionId: newCol.id,
        productId: p.id,
        sortOrder: idx,
      }));
      await db.insert(productCollections).values(inserts);
    }
  }

  revalidatePath("/dashboard/products/collections");
  revalidatePath("/collections");

  return { success: true, collection: newCol };
}

/**
 * Updates a collection and its product associations.
 */
export async function updateCollectionAction(id: string, input: Partial<CollectionInput>) {
  const parsed = CollectionSchema.partial().parse(input);
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Collection not found or unauthorized: ${id}`);
  }

  let updateSlug = existing.slug;
  if (parsed.slug && parsed.slug !== existing.slug) {
    const candidate = slugify(parsed.slug);
    const [collision] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.storeId, storeId),
          eq(collections.slug, candidate),
          sql`${collections.id} != ${id}`
        )
      )
      .limit(1);

    if (collision) {
      throw new Error(`A collection with slug '${candidate}' already exists in your store.`);
    }
    updateSlug = candidate;
  }

  const [updated] = await db
    .update(collections)
    .set({
      title: parsed.title ?? existing.title,
      slug: updateSlug,
      description: parsed.description !== undefined ? parsed.description : existing.description,
      imageUrl: parsed.imageUrl !== undefined ? parsed.imageUrl : existing.imageUrl,
      isActive: parsed.isActive ?? existing.isActive,
      isAutomatic: parsed.isAutomatic ?? existing.isAutomatic,
      rules: parsed.rules ?? existing.rules,
      seoTitle: parsed.seoTitle !== undefined ? parsed.seoTitle : existing.seoTitle,
      seoDescription:
        parsed.seoDescription !== undefined ? parsed.seoDescription : existing.seoDescription,
      updatedAt: new Date(),
    })
    .where(and(eq(collections.id, id), eq(collections.storeId, storeId)))
    .returning();

  if (parsed.productIds !== undefined) {
    // Delete existing associations
    await db
      .delete(productCollections)
      .where(eq(productCollections.collectionId, id));

    if (parsed.productIds.length > 0) {
      // Guard: only assign products belonging to the store
      const validProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), inArray(products.id, parsed.productIds)));

      if (validProducts.length > 0) {
        const inserts = validProducts.map((p, idx) => ({
          collectionId: id,
          productId: p.id,
          sortOrder: idx,
        }));
        await db.insert(productCollections).values(inserts);
      }
    }
  }

  revalidatePath("/dashboard/products/collections");
  revalidatePath("/collections");
  revalidatePath(`/collections/${updated.slug}`);

  return { success: true, collection: updated };
}

/**
 * Deletes a collection.
 */
export async function deleteCollectionAction(id: string) {
  const ctx = await requirePermission("catalog:delete");
  const storeId = ctx.store.id;

  const [deleted] = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.storeId, storeId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError(`Collection not found or unauthorized: ${id}`);
  }

  revalidatePath("/dashboard/products/collections");
  revalidatePath("/collections");

  return { success: true, id };
}
