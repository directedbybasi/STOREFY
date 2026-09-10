"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import {
  products,
  productVariants,
  productImages,
  productCollections,
  categories,
} from "@/database/schema";
import { eq, and, sql, desc, asc, ilike, or, count, inArray } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import {
  ProductCreateSchema,
  ProductUpdateSchema,
  rupeesToPaise,
  slugify,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "./validation";
import { NotFoundError } from "@/core/errors";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | "ALL";
  categoryId?: string;
  collectionId?: string;
  sort?: "newest" | "oldest" | "price-asc" | "price-desc" | "title-asc" | "title-desc";
}

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  basePrice: number; // in Paise
  compareAtPrice: number | null;
  sku: string | null;
  primaryImage: string | null;
  variantCount: number;
  categoryName: string | null;
  createdAt: Date;
}

/**
 * Server-side Paginated Product Query strictly scoped to the active tenant store.
 * Guaranteed zero-trust: uses requirePermission("catalog:read").
 */
export async function getProductsAction(params: GetProductsParams = {}) {
  const ctx = await requirePermission("catalog:read");
  const storeId = ctx.store.id;

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [eq(products.storeId, storeId)];

  if (params.status && params.status !== "ALL") {
    conditions.push(eq(products.status, params.status));
  }

  if (params.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId));
  }

  if (params.search && params.search.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(or(ilike(products.title, q), ilike(products.sku, q))!);
  }

  // If filtered by collection, filter products belonging to that collection
  if (params.collectionId) {
    const matchingProductIds = await db
      .select({ productId: productCollections.productId })
      .from(productCollections)
      .where(eq(productCollections.collectionId, params.collectionId));

    const pIds = matchingProductIds.map((r) => r.productId);
    if (pIds.length === 0) {
      return {
        products: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 },
      };
    }
    conditions.push(inArray(products.id, pIds));
  }

  const whereClause = and(...conditions);

  // Sorting
  let orderByClause = desc(products.createdAt);
  if (params.sort === "oldest") orderByClause = asc(products.createdAt);
  else if (params.sort === "price-asc") orderByClause = asc(products.basePrice);
  else if (params.sort === "price-desc") orderByClause = desc(products.basePrice);
  else if (params.sort === "title-asc") orderByClause = asc(products.title);
  else if (params.sort === "title-desc") orderByClause = desc(products.title);

  // Total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(whereClause);

  const totalCount = Number(total);
  const totalPages = Math.ceil(totalCount / limit);

  // Fetch products
  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      status: products.status,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: categories.name,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  if (productRows.length === 0) {
    return {
      products: [],
      pagination: { page, limit, totalCount, totalPages },
    };
  }

  const productIds = productRows.map((p) => p.id);

  // Fetch primary images for these products
  const images = await db
    .select({
      productId: productImages.productId,
      imageUrl: productImages.imageUrl,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(and(eq(productImages.storeId, storeId), inArray(productImages.productId, productIds)))
    .orderBy(asc(productImages.sortOrder));

  // Fetch variant counts
  const variantCounts = await db
    .select({
      productId: productVariants.productId,
      variantCount: count(),
    })
    .from(productVariants)
    .where(and(eq(productVariants.storeId, storeId), inArray(productVariants.productId, productIds)))
    .groupBy(productVariants.productId);

  const imageMap = new Map<string, string>();
  for (const img of images) {
    if (!imageMap.has(img.productId)) {
      imageMap.set(img.productId, img.imageUrl);
    }
  }

  const variantCountMap = new Map<string, number>();
  for (const vc of variantCounts) {
    variantCountMap.set(vc.productId, Number(vc.variantCount));
  }

  const result: ProductListItem[] = productRows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    basePrice: p.basePrice,
    compareAtPrice: p.compareAtPrice,
    sku: p.sku,
    primaryImage: imageMap.get(p.id) || null,
    variantCount: variantCountMap.get(p.id) || 0,
    categoryName: p.categoryName || null,
    createdAt: p.createdAt,
  }));

  return {
    products: result,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
}

/**
 * Retrieves a full product with all variants, images, categories, and collection IDs.
 * Strictly verifies product ownership against ctx.store.id.
 */
export async function getProductByIdAction(id: string) {
  const ctx = await requirePermission("catalog:read");
  const storeId = ctx.store.id;

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .limit(1);

  if (!product) {
    throw new NotFoundError(`Product not found or unauthorized access: ${id}`);
  }

  // Fetch variants
  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, id), eq(productVariants.storeId, storeId)))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

  // Fetch images
  const images = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.productId, id), eq(productImages.storeId, storeId)))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));

  // Fetch assigned collections
  const collectionsAssigned = await db
    .select({ collectionId: productCollections.collectionId })
    .from(productCollections)
    .where(eq(productCollections.productId, id));

  return {
    product,
    variants,
    images,
    collectionIds: collectionsAssigned.map((c) => c.collectionId),
  };
}

/**
 * Creates a new product for the active store.
 * Enforces slug collision resolution, financial Paise conversions, and permission checks.
 */
export async function createProductAction(input: ProductCreateInput) {
  const parsed = ProductCreateSchema.parse(input);

  // If product is published immediately, require catalog:publish, else catalog:write
  const requiredPerm = parsed.status === "ACTIVE" ? "catalog:publish" : "catalog:write";
  const ctx = await requirePermission(requiredPerm);
  const storeId = ctx.store.id;

  // Handle unique slug generation scoped to this store
  let baseSlug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  if (!baseSlug) baseSlug = `product-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.slug, finalSlug)))
      .limit(1);
    if (!existing) break;
    counter++;
    finalSlug = `${baseSlug}-${counter}`;
  }

  const basePricePaise = rupeesToPaise(parsed.basePriceRupees);
  const compareAtPricePaise = parsed.compareAtPriceRupees
    ? rupeesToPaise(parsed.compareAtPriceRupees)
    : null;
  const costPricePaise = parsed.costPriceRupees
    ? rupeesToPaise(parsed.costPriceRupees)
    : null;

  // Insert product
  const [createdProduct] = await db
    .insert(products)
    .values({
      storeId,
      source: "MERCHANT",
      fulfillmentType: "MERCHANT",
      title: parsed.title,
      slug: finalSlug,
      description: parsed.description || null,
      shortDescription: parsed.shortDescription || null,
      productType: parsed.productType || null,
      vendor: parsed.vendor || null,
      brand: parsed.brand || null,
      categoryId: parsed.categoryId || null,
      tags: parsed.tags || [],
      basePrice: basePricePaise,
      compareAtPrice: compareAtPricePaise,
      costPrice: costPricePaise,
      sku: parsed.sku || null,
      barcode: parsed.barcode || null,
      trackInventory: parsed.trackInventory,
      allowBackorders: parsed.allowBackorders,
      lowStockThreshold: parsed.lowStockThreshold,
      isPhysical: parsed.isPhysical,
      weight: parsed.weight ? parsed.weight.toString() : null,
      status: parsed.status,
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.shortDescription || null,
    })
    .returning();

  // Create variants
  if (parsed.variants && parsed.variants.length > 0) {
    const variantInserts = parsed.variants.map((v, idx) => ({
      storeId,
      productId: createdProduct.id,
      title: v.title,
      sku: v.sku || null,
      barcode: v.barcode || null,
      price: rupeesToPaise(v.priceRupees),
      compareAtPrice: v.compareAtPriceRupees ? rupeesToPaise(v.compareAtPriceRupees) : null,
      costPrice: v.costPriceRupees ? rupeesToPaise(v.costPriceRupees) : null,
      option1: v.option1 || null,
      option2: v.option2 || null,
      option3: v.option3 || null,
      imageUrl: v.imageUrl || null,
      weight: v.weight ? v.weight.toString() : null,
      isActive: v.isActive ?? true,
      sortOrder: v.sortOrder ?? idx,
    }));

    await db.insert(productVariants).values(variantInserts);
  } else {
    // Generate default single variant
    await db.insert(productVariants).values({
      storeId,
      productId: createdProduct.id,
      title: "Default Title",
      sku: parsed.sku || null,
      barcode: parsed.barcode || null,
      price: basePricePaise,
      compareAtPrice: compareAtPricePaise,
      costPrice: costPricePaise,
      isActive: true,
      sortOrder: 0,
    });
  }

  // Insert images if provided
  if (parsed.images && parsed.images.length > 0) {
    const imageInserts = parsed.images.map((img, idx) => ({
      storeId,
      productId: createdProduct.id,
      imageUrl: img.imageUrl,
      storagePath: img.storagePath,
      altText: img.altText || parsed.title,
      sortOrder: img.sortOrder ?? idx,
    }));
    await db.insert(productImages).values(imageInserts);
  }

  // Insert collection associations
  if (parsed.collectionIds && parsed.collectionIds.length > 0) {
    const collectionInserts = parsed.collectionIds.map((cId, idx) => ({
      productId: createdProduct.id,
      collectionId: cId,
      sortOrder: idx,
    }));
    await db.insert(productCollections).values(collectionInserts);
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${createdProduct.id}`);
  revalidatePath("/products");

  return { success: true, product: createdProduct };
}

/**
 * Updates an existing product.
 * Strictly verifies ownership against ctx.store.id.
 */
export async function updateProductAction(input: ProductUpdateInput) {
  const parsed = ProductUpdateSchema.parse(input);

  const requiredPerm = parsed.status === "ACTIVE" ? "catalog:publish" : "catalog:write";
  const ctx = await requirePermission(requiredPerm);
  const storeId = ctx.store.id;

  const [existingProduct] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, parsed.id), eq(products.storeId, storeId)))
    .limit(1);

  if (!existingProduct) {
    throw new NotFoundError(`Product not found or unauthorized: ${parsed.id}`);
  }

  // Check slug uniqueness if updating slug
  let updateSlug = existingProduct.slug;
  if (parsed.slug && parsed.slug !== existingProduct.slug) {
    const candidateSlug = slugify(parsed.slug);
    const [slugOwner] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.slug, candidateSlug),
          sql`${products.id} != ${parsed.id}`
        )
      )
      .limit(1);

    if (slugOwner) {
      throw new Error(`A product with handle '${candidateSlug}' already exists in your store.`);
    }
    updateSlug = candidateSlug;
  }

  const basePricePaise =
    parsed.basePriceRupees !== undefined
      ? rupeesToPaise(parsed.basePriceRupees)
      : existingProduct.basePrice;

  const compareAtPricePaise =
    parsed.compareAtPriceRupees !== undefined
      ? parsed.compareAtPriceRupees
        ? rupeesToPaise(parsed.compareAtPriceRupees)
        : null
      : existingProduct.compareAtPrice;

  const costPricePaise =
    parsed.costPriceRupees !== undefined
      ? parsed.costPriceRupees
        ? rupeesToPaise(parsed.costPriceRupees)
        : null
      : existingProduct.costPrice;

  const [updatedProduct] = await db
    .update(products)
    .set({
      title: parsed.title ?? existingProduct.title,
      slug: updateSlug,
      description: parsed.description !== undefined ? parsed.description : existingProduct.description,
      shortDescription:
        parsed.shortDescription !== undefined
          ? parsed.shortDescription
          : existingProduct.shortDescription,
      productType: parsed.productType !== undefined ? parsed.productType : existingProduct.productType,
      vendor: parsed.vendor !== undefined ? parsed.vendor : existingProduct.vendor,
      brand: parsed.brand !== undefined ? parsed.brand : existingProduct.brand,
      categoryId: parsed.categoryId !== undefined ? parsed.categoryId : existingProduct.categoryId,
      tags: parsed.tags ?? existingProduct.tags,
      basePrice: basePricePaise,
      compareAtPrice: compareAtPricePaise,
      costPrice: costPricePaise,
      sku: parsed.sku !== undefined ? parsed.sku : existingProduct.sku,
      barcode: parsed.barcode !== undefined ? parsed.barcode : existingProduct.barcode,
      trackInventory:
        parsed.trackInventory !== undefined
          ? parsed.trackInventory
          : existingProduct.trackInventory,
      allowBackorders:
        parsed.allowBackorders !== undefined
          ? parsed.allowBackorders
          : existingProduct.allowBackorders,
      lowStockThreshold:
        parsed.lowStockThreshold !== undefined
          ? parsed.lowStockThreshold
          : existingProduct.lowStockThreshold,
      isPhysical: parsed.isPhysical !== undefined ? parsed.isPhysical : existingProduct.isPhysical,
      weight: parsed.weight !== undefined ? (parsed.weight ? parsed.weight.toString() : null) : existingProduct.weight,
      status: parsed.status ?? existingProduct.status,
      seoTitle: parsed.seoTitle !== undefined ? parsed.seoTitle : existingProduct.seoTitle,
      seoDescription:
        parsed.seoDescription !== undefined
          ? parsed.seoDescription
          : existingProduct.seoDescription,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, parsed.id), eq(products.storeId, storeId)))
    .returning();

  // Sync Variants if provided
  if (parsed.variants !== undefined) {
    // Replace variants safely
    await db
      .delete(productVariants)
      .where(and(eq(productVariants.productId, parsed.id), eq(productVariants.storeId, storeId)));

    if (parsed.variants.length > 0) {
      const variantInserts = parsed.variants.map((v, idx) => ({
        storeId,
        productId: parsed.id,
        title: v.title,
        sku: v.sku || null,
        barcode: v.barcode || null,
        price: rupeesToPaise(v.priceRupees),
        compareAtPrice: v.compareAtPriceRupees ? rupeesToPaise(v.compareAtPriceRupees) : null,
        costPrice: v.costPriceRupees ? rupeesToPaise(v.costPriceRupees) : null,
        option1: v.option1 || null,
        option2: v.option2 || null,
        option3: v.option3 || null,
        imageUrl: v.imageUrl || null,
        weight: v.weight ? v.weight.toString() : null,
        isActive: v.isActive ?? true,
        sortOrder: v.sortOrder ?? idx,
      }));
      await db.insert(productVariants).values(variantInserts);
    } else {
      await db.insert(productVariants).values({
        storeId,
        productId: parsed.id,
        title: "Default Title",
        sku: updatedProduct.sku || null,
        barcode: updatedProduct.barcode || null,
        price: basePricePaise,
        compareAtPrice: compareAtPricePaise,
        costPrice: costPricePaise,
        isActive: true,
        sortOrder: 0,
      });
    }
  }

  // Sync Images if provided
  if (parsed.images !== undefined) {
    await db
      .delete(productImages)
      .where(and(eq(productImages.productId, parsed.id), eq(productImages.storeId, storeId)));

    if (parsed.images.length > 0) {
      const imageInserts = parsed.images.map((img, idx) => ({
        storeId,
        productId: parsed.id,
        imageUrl: img.imageUrl,
        storagePath: img.storagePath,
        altText: img.altText || updatedProduct.title,
        sortOrder: img.sortOrder ?? idx,
      }));
      await db.insert(productImages).values(imageInserts);
    }
  }

  // Sync Collections if provided
  if (parsed.collectionIds !== undefined) {
    await db
      .delete(productCollections)
      .where(eq(productCollections.productId, parsed.id));

    if (parsed.collectionIds.length > 0) {
      const collectionInserts = parsed.collectionIds.map((cId, idx) => ({
        productId: parsed.id,
        collectionId: cId,
        sortOrder: idx,
      }));
      await db.insert(productCollections).values(collectionInserts);
    }
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${parsed.id}`);
  revalidatePath("/products");
  revalidatePath(`/products/${updatedProduct.slug}`);

  return { success: true, product: updatedProduct };
}

/**
 * Deletes a product permanently or cascades to variants, images, and collections.
 * Guarded strictly by catalog:delete.
 */
export async function deleteProductAction(id: string) {
  const ctx = await requirePermission("catalog:delete");
  const storeId = ctx.store.id;

  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError(`Product not found or unauthorized: ${id}`);
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/products");
  return { success: true, id };
}

/**
 * Changes status of a product (DRAFT, ACTIVE, ARCHIVED).
 */
export async function changeProductStatusAction(
  id: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"
) {
  const perm = status === "ACTIVE" ? "catalog:publish" : "catalog:write";
  const ctx = await requirePermission(perm);
  const storeId = ctx.store.id;

  const [updated] = await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .returning();

  if (!updated) {
    throw new NotFoundError(`Product not found or unauthorized: ${id}`);
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath("/products");
  return { success: true, product: updated };
}
