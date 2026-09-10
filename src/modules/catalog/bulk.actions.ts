"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { products, productCollections, categories } from "@/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { BulkActionSchema, type BulkActionInput } from "./validation";

/**
 * Executes a bulk operation on products.
 * STRICT MULTI-TENANT GUARANTEE:
 * Even if foreign IDs are passed, only records where storeId == ctx.store.id are affected.
 */
export async function bulkProductAction(input: BulkActionInput) {
  const parsed = BulkActionSchema.parse(input);

  // RBAC permission routing
  if (parsed.action === "PUBLISH") {
    await requirePermission("catalog:publish");
  } else if (parsed.action === "DELETE") {
    await requirePermission("catalog:delete");
  } else {
    await requirePermission("catalog:write");
  }

  const ctx = await requirePermission("catalog:read"); // retrieve tenant context
  const storeId = ctx.store.id;

  // Retrieve valid target product IDs strictly belonging to this store
  const targetProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, parsed.productIds)));

  const validIds = targetProducts.map((p) => p.id);
  if (validIds.length === 0) {
    return { success: true, count: 0, message: "No matching products found in your store." };
  }

  let modifiedCount = 0;

  switch (parsed.action) {
    case "PUBLISH": {
      const res = await db
        .update(products)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(and(eq(products.storeId, storeId), inArray(products.id, validIds)))
        .returning();
      modifiedCount = res.length;
      break;
    }

    case "UNPUBLISH": {
      const res = await db
        .update(products)
        .set({ status: "DRAFT", updatedAt: new Date() })
        .where(and(eq(products.storeId, storeId), inArray(products.id, validIds)))
        .returning();
      modifiedCount = res.length;
      break;
    }

    case "ARCHIVE": {
      const res = await db
        .update(products)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(and(eq(products.storeId, storeId), inArray(products.id, validIds)))
        .returning();
      modifiedCount = res.length;
      break;
    }

    case "DELETE": {
      const res = await db
        .delete(products)
        .where(and(eq(products.storeId, storeId), inArray(products.id, validIds)))
        .returning();
      modifiedCount = res.length;
      break;
    }

    case "SET_CATEGORY": {
      if (parsed.categoryId) {
        // Validate category belongs to this store
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.id, parsed.categoryId), eq(categories.storeId, storeId)))
          .limit(1);

        if (!cat) {
          throw new Error("Specified category does not belong to your store.");
        }
      }

      const res = await db
        .update(products)
        .set({ categoryId: parsed.categoryId || null, updatedAt: new Date() })
        .where(and(eq(products.storeId, storeId), inArray(products.id, validIds)))
        .returning();
      modifiedCount = res.length;
      break;
    }

    case "ADD_TO_COLLECTION": {
      if (!parsed.collectionId) {
        throw new Error("Target collection is required for ADD_TO_COLLECTION action.");
      }

      for (const pId of validIds) {
        await db
          .insert(productCollections)
          .values({
            productId: pId,
            collectionId: parsed.collectionId,
            sortOrder: 0,
          })
          .onConflictDoNothing();
      }
      modifiedCount = validIds.length;
      break;
    }
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/products");

  return {
    success: true,
    count: modifiedCount,
    message: `Successfully updated ${modifiedCount} product(s).`,
  };
}
