"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { categories, type Category } from "@/database/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { CategorySchema, slugify, type CategoryInput } from "./validation";
import { NotFoundError } from "@/core/errors";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

/**
 * Returns all categories for the active store in a flat list.
 */
export async function getCategoriesAction(): Promise<Category[]> {
  const ctx = await requirePermission("catalog:read");
  return db
    .select()
    .from(categories)
    .where(eq(categories.storeId, ctx.store.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/**
 * Returns categories structured as a recursive hierarchical tree.
 */
export async function getCategoriesTreeAction(): Promise<CategoryTreeNode[]> {
  const flatCategories = await getCategoriesAction();

  const map = new Map<string, CategoryTreeNode>();
  for (const cat of flatCategories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  const rootNodes: CategoryTreeNode[] = [];
  for (const cat of flatCategories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/**
 * Creates a category for the active store.
 */
export async function createCategoryAction(input: CategoryInput) {
  const parsed = CategorySchema.parse(input);
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  // Validate parent belongs to current store
  if (parsed.parentId) {
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, parsed.parentId), eq(categories.storeId, storeId)))
      .limit(1);

    if (!parent) {
      throw new Error("Specified parent category does not belong to your store.");
    }
  }

  // Safe unique slug
  let baseSlug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.name);
  if (!baseSlug) baseSlug = `category-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.storeId, storeId), eq(categories.slug, finalSlug)))
      .limit(1);
    if (!existing) break;
    counter++;
    finalSlug = `${baseSlug}-${counter}`;
  }

  const [newCat] = await db
    .insert(categories)
    .values({
      storeId,
      parentId: parsed.parentId || null,
      name: parsed.name,
      slug: finalSlug,
      description: parsed.description || null,
      imageUrl: parsed.imageUrl || null,
      sortOrder: parsed.sortOrder ?? 0,
      isFeatured: parsed.isFeatured ?? false,
      seoTitle: parsed.seoTitle || parsed.name,
      seoDescription: parsed.seoDescription || parsed.description || null,
    })
    .returning();

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/products/categories");
  revalidatePath("/products");

  return { success: true, category: newCat };
}

/**
 * Checks whether prospectiveParentId is a descendant of categoryId.
 * Prevents cyclic graphs (e.g. A -> B -> A).
 */
async function isDescendant(storeId: string, categoryId: string, prospectiveParentId: string): Promise<boolean> {
  let currentId: string | null = prospectiveParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) break; // guard against existing cycle
    visited.add(currentId);

    const [row] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, currentId), eq(categories.storeId, storeId)))
      .limit(1);

    if (!row || !row.parentId) break;
    currentId = row.parentId;
  }

  return false;
}

/**
 * Updates an existing category.
 */
export async function updateCategoryAction(id: string, input: Partial<CategoryInput>) {
  const parsed = CategorySchema.partial().parse(input);
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Category not found or unauthorized: ${id}`);
  }

  // Prevent circular parent dependency
  if (parsed.parentId !== undefined && parsed.parentId !== null) {
    if (parsed.parentId === id) {
      throw new Error("A category cannot be its own parent.");
    }

    const wouldCreateCycle = await isDescendant(storeId, id, parsed.parentId);
    if (wouldCreateCycle) {
      throw new Error("Cannot set parent: This would create a circular category relationship.");
    }

    // Verify prospective parent belongs to same store
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, parsed.parentId), eq(categories.storeId, storeId)))
      .limit(1);

    if (!parent) {
      throw new Error("Specified parent category does not belong to your store.");
    }
  }

  // Slug collision check if changed
  let updateSlug = existing.slug;
  if (parsed.slug && parsed.slug !== existing.slug) {
    const candidate = slugify(parsed.slug);
    const [collision] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.slug, candidate),
          sql`${categories.id} != ${id}`
        )
      )
      .limit(1);

    if (collision) {
      throw new Error(`A category with slug '${candidate}' already exists in your store.`);
    }
    updateSlug = candidate;
  }

  const [updated] = await db
    .update(categories)
    .set({
      parentId: parsed.parentId !== undefined ? parsed.parentId : existing.parentId,
      name: parsed.name ?? existing.name,
      slug: updateSlug,
      description: parsed.description !== undefined ? parsed.description : existing.description,
      imageUrl: parsed.imageUrl !== undefined ? parsed.imageUrl : existing.imageUrl,
      sortOrder: parsed.sortOrder ?? existing.sortOrder,
      isFeatured: parsed.isFeatured ?? existing.isFeatured,
      seoTitle: parsed.seoTitle !== undefined ? parsed.seoTitle : existing.seoTitle,
      seoDescription:
        parsed.seoDescription !== undefined ? parsed.seoDescription : existing.seoDescription,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
    .returning();

  revalidatePath("/dashboard/products/categories");
  revalidatePath("/products");

  return { success: true, category: updated };
}

/**
 * Deletes a category. Reassigns any direct children's parentId to null or current category's parent.
 */
export async function deleteCategoryAction(id: string) {
  const ctx = await requirePermission("catalog:delete");
  const storeId = ctx.store.id;

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Category not found or unauthorized: ${id}`);
  }

  // Reassign children to avoid orphaned nodes
  await db
    .update(categories)
    .set({ parentId: existing.parentId })
    .where(and(eq(categories.parentId, id), eq(categories.storeId, storeId)));

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.storeId, storeId)));

  revalidatePath("/dashboard/products/categories");
  revalidatePath("/products");

  return { success: true, id };
}
