import { db } from "@/database/client";
import {
  suppliers,
  supplierProducts,
  supplierProductVariants,
  supplierInventory,
} from "@/database/schema";
import { eq, and, desc, ilike, sql, type SQL } from "drizzle-orm";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors";
import type { SupplierProductDTO, SupplierVariantDTO, MarketplaceProductDTO } from "./types";

// ─── Supplier Catalog CRUD ─────────────────────────────

/**
 * Creates a new supplier product with default variant and inventory record.
 * Only APPROVED suppliers may publish; DRAFT is always allowed.
 */
export async function createSupplierProduct(
  supplierId: string,
  input: {
    title: string;
    description?: string;
    images?: string[];
    categoryName?: string;
    supplierSku?: string;
    costPricePaise: number;
    suggestedRetailPaise?: number;
    processingTimeDays?: number;
    returnable?: boolean;
    returnWindowDays?: number;
    weight?: string;
    status?: string;
  }
): Promise<SupplierProductDTO> {
  // Validate supplier status for publishing
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplier) throw new NotFoundError("Supplier");

  if (input.status === "ACTIVE" && supplier.status !== "APPROVED") {
    throw new ForbiddenError(
      "Only approved suppliers can publish active products."
    );
  }

  if (supplier.status === "SUSPENDED") {
    throw new ForbiddenError("Suspended suppliers cannot create new products.");
  }

  if (input.costPricePaise <= 0) {
    throw new ValidationError("Supplier cost price must be a positive integer Paise value.");
  }

  const slug = generateSlug(input.title);

  const [product] = await db
    .insert(supplierProducts)
    .values({
      supplierId,
      title: input.title,
      slug,
      description: input.description || null,
      images: input.images || [],
      categoryName: input.categoryName || null,
      supplierSku: input.supplierSku || null,
      costPricePaise: input.costPricePaise,
      suggestedRetailPaise: input.suggestedRetailPaise || null,
      processingTimeDays: input.processingTimeDays ?? 3,
      returnable: input.returnable ?? true,
      returnWindowDays: input.returnWindowDays ?? 7,
      weight: input.weight || null,
      status: input.status || "DRAFT",
    })
    .returning();

  // Create default variant
  const [defaultVariant] = await db
    .insert(supplierProductVariants)
    .values({
      supplierProductId: product.id,
      title: "Default",
      supplierSku: input.supplierSku || null,
      costPricePaise: input.costPricePaise,
      suggestedRetailPaise: input.suggestedRetailPaise || null,
    })
    .returning();

  // Initialize supplier inventory
  await db.insert(supplierInventory).values({
    supplierId,
    supplierProductId: product.id,
    supplierVariantId: defaultVariant.id,
    onHand: 0,
    reserved: 0,
    available: 0,
  });

  return getSupplierProductById(supplierId, product.id);
}

/**
 * Updates a supplier product's editable fields.
 */
export async function updateSupplierProduct(
  supplierId: string,
  productId: string,
  input: Partial<{
    title: string;
    description: string;
    images: string[];
    categoryName: string;
    supplierSku: string;
    costPricePaise: number;
    suggestedRetailPaise: number;
    processingTimeDays: number;
    returnable: boolean;
    returnWindowDays: number;
    weight: string;
    status: string;
  }>
): Promise<SupplierProductDTO> {
  const [product] = await db
    .select()
    .from(supplierProducts)
    .where(
      and(
        eq(supplierProducts.id, productId),
        eq(supplierProducts.supplierId, supplierId)
      )
    )
    .limit(1);

  if (!product) throw new NotFoundError("Supplier Product");

  if (input.costPricePaise !== undefined && input.costPricePaise <= 0) {
    throw new ValidationError("Cost price must be positive Paise.");
  }

  await db
    .update(supplierProducts)
    .set({
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.images && { images: input.images }),
      ...(input.categoryName !== undefined && { categoryName: input.categoryName || null }),
      ...(input.supplierSku !== undefined && { supplierSku: input.supplierSku || null }),
      ...(input.costPricePaise && { costPricePaise: input.costPricePaise }),
      ...(input.suggestedRetailPaise !== undefined && {
        suggestedRetailPaise: input.suggestedRetailPaise || null,
      }),
      ...(input.processingTimeDays !== undefined && {
        processingTimeDays: input.processingTimeDays,
      }),
      ...(input.returnable !== undefined && { returnable: input.returnable }),
      ...(input.returnWindowDays !== undefined && {
        returnWindowDays: input.returnWindowDays,
      }),
      ...(input.weight !== undefined && { weight: input.weight || null }),
      ...(input.status && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(eq(supplierProducts.id, productId));

  return getSupplierProductById(supplierId, productId);
}

/**
 * Gets a single supplier product with variants and stock.
 */
export async function getSupplierProductById(
  supplierId: string,
  productId: string
): Promise<SupplierProductDTO> {
  const [product] = await db
    .select()
    .from(supplierProducts)
    .where(
      and(
        eq(supplierProducts.id, productId),
        eq(supplierProducts.supplierId, supplierId)
      )
    )
    .limit(1);

  if (!product) throw new NotFoundError("Supplier Product");

  const variants = await db
    .select()
    .from(supplierProductVariants)
    .where(eq(supplierProductVariants.supplierProductId, productId))
    .orderBy(supplierProductVariants.sortOrder);

  const inventoryItems = await db
    .select()
    .from(supplierInventory)
    .where(eq(supplierInventory.supplierProductId, productId));

  const invMap = new Map(inventoryItems.map((i) => [i.supplierVariantId, i]));

  const variantDTOs: SupplierVariantDTO[] = variants.map((v) => ({
    id: v.id,
    title: v.title,
    supplierSku: v.supplierSku,
    costPricePaise: v.costPricePaise,
    suggestedRetailPaise: v.suggestedRetailPaise,
    option1: v.option1,
    option2: v.option2,
    option3: v.option3,
    imageUrl: v.imageUrl,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
    available: invMap.get(v.id)?.available ?? 0,
  }));

  const totalStock = variantDTOs.reduce((sum, v) => sum + v.available, 0);

  return {
    id: product.id,
    supplierId: product.supplierId,
    title: product.title,
    slug: product.slug,
    description: product.description,
    images: product.images,
    categoryName: product.categoryName,
    supplierSku: product.supplierSku,
    costPricePaise: product.costPricePaise,
    suggestedRetailPaise: product.suggestedRetailPaise,
    processingTimeDays: product.processingTimeDays,
    returnable: product.returnable,
    returnWindowDays: product.returnWindowDays,
    weight: product.weight,
    status: product.status,
    variants: variantDTOs,
    totalStock,
    createdAt: product.createdAt.toISOString(),
  };
}

/**
 * Lists all products for a supplier.
 */
export async function listSupplierProducts(
  supplierId: string,
  status?: string
): Promise<SupplierProductDTO[]> {
  const conditions = [eq(supplierProducts.supplierId, supplierId)];
  if (status) {
    conditions.push(eq(supplierProducts.status, status));
  }

  const products = await db
    .select()
    .from(supplierProducts)
    .where(and(...conditions))
    .orderBy(desc(supplierProducts.createdAt));

  const results: SupplierProductDTO[] = [];
  for (const p of products) {
    results.push(await getSupplierProductById(supplierId, p.id));
  }
  return results;
}

/**
 * Updates supplier variant stock. Only the supplier can change their own inventory.
 */
export async function updateSupplierStock(
  supplierId: string,
  supplierVariantId: string,
  newOnHand: number
): Promise<void> {
  if (newOnHand < 0) {
    throw new ValidationError("Stock quantity cannot be negative.");
  }

  const [inv] = await db
    .select()
    .from(supplierInventory)
    .where(
      and(
        eq(supplierInventory.supplierId, supplierId),
        eq(supplierInventory.supplierVariantId, supplierVariantId)
      )
    )
    .limit(1);

  if (!inv) throw new NotFoundError("Supplier Inventory");

  const newAvailable = Math.max(0, newOnHand - inv.reserved);

  await db
    .update(supplierInventory)
    .set({
      onHand: newOnHand,
      available: newAvailable,
      updatedAt: new Date(),
    })
    .where(eq(supplierInventory.id, inv.id));
}

// ─── Marketplace Browsing ──────────────────────────────

/**
 * Browses the supplier marketplace — only shows ACTIVE products from APPROVED suppliers.
 * Suppliers cost is intentionally visible to merchants for margin calculation.
 */
export async function browseMarketplace(filters?: {
  search?: string;
  categoryName?: string;
  supplierId?: string;
  minCostPaise?: number;
  maxCostPaise?: number;
  limit?: number;
  offset?: number;
}): Promise<{ products: MarketplaceProductDTO[]; total: number }> {
  const limit = Math.min(filters?.limit || 20, 50);
  const offset = filters?.offset || 0;

  const conditions: SQL[] = [
    eq(supplierProducts.status, "ACTIVE"),
  ];

  if (filters?.search) {
    conditions.push(ilike(supplierProducts.title, `%${filters.search}%`));
  }
  if (filters?.categoryName) {
    conditions.push(eq(supplierProducts.categoryName, filters.categoryName));
  }
  if (filters?.supplierId) {
    conditions.push(eq(supplierProducts.supplierId, filters.supplierId));
  }

  const products = await db
    .select()
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(and(...conditions, eq(suppliers.status, "APPROVED")))
    .orderBy(desc(supplierProducts.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(and(...conditions, eq(suppliers.status, "APPROVED")));

  const marketplaceProducts: MarketplaceProductDTO[] = [];

  for (const row of products) {
    const p = row.supplier_products;
    const s = row.suppliers;

    const variants = await db
      .select()
      .from(supplierProductVariants)
      .where(
        and(
          eq(supplierProductVariants.supplierProductId, p.id),
          eq(supplierProductVariants.isActive, true)
        )
      )
      .orderBy(supplierProductVariants.sortOrder);

    const inventoryItems = await db
      .select()
      .from(supplierInventory)
      .where(eq(supplierInventory.supplierProductId, p.id));

    const invMap = new Map(inventoryItems.map((i) => [i.supplierVariantId, i]));

    marketplaceProducts.push({
      id: p.id,
      supplierId: p.supplierId,
      supplierDisplayName: s.displayName,
      title: p.title,
      slug: p.slug,
      description: p.description,
      images: p.images,
      categoryName: p.categoryName,
      costPricePaise: p.costPricePaise,
      suggestedRetailPaise: p.suggestedRetailPaise,
      processingTimeDays: p.processingTimeDays,
      returnable: p.returnable,
      returnWindowDays: p.returnWindowDays,
      totalStock: inventoryItems.reduce((sum, i) => sum + i.available, 0),
      variants: variants.map((v) => ({
        id: v.id,
        title: v.title,
        costPricePaise: v.costPricePaise,
        suggestedRetailPaise: v.suggestedRetailPaise,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        imageUrl: v.imageUrl,
        available: invMap.get(v.id)?.available ?? 0,
      })),
    });
  }

  return { products: marketplaceProducts, total: countResult?.count ?? 0 };
}

// ─── Helpers ───────────────────────────────────────────

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${base}-${Date.now().toString(36)}`;
}
