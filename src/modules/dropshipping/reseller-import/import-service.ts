import { db } from "@/database/client";
import {
  products,
  productVariants,
  supplierProducts,
  supplierProductVariants,
  supplierInventory,
  suppliers,
  resellerProductMappings,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/core/errors";
import type { ImportPreviewDTO } from "../supplier-catalog/types";

/**
 * Generates an import preview for a supplier product.
 * Shows supplier cost, suggested retail, estimated margin, and whether already imported.
 */
export async function getImportPreview(
  storeId: string,
  supplierProductId: string
): Promise<ImportPreviewDTO> {
  const [sp] = await db
    .select()
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(
      and(
        eq(supplierProducts.id, supplierProductId),
        eq(supplierProducts.status, "ACTIVE"),
        eq(suppliers.status, "APPROVED")
      )
    )
    .limit(1);

  if (!sp) throw new NotFoundError("Supplier Product");

  const variants = await db
    .select()
    .from(supplierProductVariants)
    .where(
      and(
        eq(supplierProductVariants.supplierProductId, supplierProductId),
        eq(supplierProductVariants.isActive, true)
      )
    );

  const inventoryItems = await db
    .select()
    .from(supplierInventory)
    .where(eq(supplierInventory.supplierProductId, supplierProductId));

  const invMap = new Map(inventoryItems.map((i) => [i.supplierVariantId, i]));

  // Check if already imported
  const existingMappings = await db
    .select()
    .from(resellerProductMappings)
    .where(
      and(
        eq(resellerProductMappings.storeId, storeId),
        eq(resellerProductMappings.supplierProductId, supplierProductId)
      )
    )
    .limit(1);

  const alreadyImported = existingMappings.length > 0;
  const product = sp.supplier_products;
  const supplier = sp.suppliers;

  const suggestedRetail = product.suggestedRetailPaise ?? Math.round(product.costPricePaise * 1.5);
  const estimatedMarginPaise = suggestedRetail - product.costPricePaise;

  return {
    supplierProduct: {
      id: product.id,
      supplierId: product.supplierId,
      supplierDisplayName: supplier.displayName,
      title: product.title,
      slug: product.slug,
      description: product.description,
      images: product.images,
      categoryName: product.categoryName,
      costPricePaise: product.costPricePaise,
      suggestedRetailPaise: product.suggestedRetailPaise,
      processingTimeDays: product.processingTimeDays,
      returnable: product.returnable,
      returnWindowDays: product.returnWindowDays,
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
    },
    estimatedMarginPaise,
    alreadyImported,
    existingMappingId: existingMappings[0]?.id,
  };
}

/**
 * Imports a supplier product into the merchant's store.
 *
 * IDEMPOTENCY: If a mapping already exists for (storeId, supplierProductId, supplierVariantId),
 * the import is rejected as a duplicate. Double-click safe.
 *
 * Creates:
 * 1. Merchant product (source=PLATFORM_SUPPLIER, fulfillmentType=PLATFORM_DROPSHIP)
 * 2. Merchant variants (one per supplier variant)
 * 3. Reseller product mappings linking each variant back to supplier
 *
 * Does NOT create merchant inventory — supplier inventory is authoritative.
 */
export async function importSupplierProduct(
  storeId: string,
  supplierProductId: string,
  resellerOverrides?: {
    title?: string;
    description?: string;
    retailPricePaise?: number;
    compareAtPricePaise?: number;
    status?: string;
  }
): Promise<{ productId: string; mappingCount: number }> {
  // Validate supplier product exists and is active
  const [sp] = await db
    .select()
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(
      and(
        eq(supplierProducts.id, supplierProductId),
        eq(supplierProducts.status, "ACTIVE"),
        eq(suppliers.status, "APPROVED")
      )
    )
    .limit(1);

  if (!sp) throw new NotFoundError("Supplier Product");

  const supplierProduct = sp.supplier_products;
  const supplier = sp.suppliers;

  // Check for duplicate import
  const [existingMapping] = await db
    .select()
    .from(resellerProductMappings)
    .where(
      and(
        eq(resellerProductMappings.storeId, storeId),
        eq(resellerProductMappings.supplierProductId, supplierProductId)
      )
    )
    .limit(1);

  if (existingMapping) {
    throw new ConflictError(
      "This supplier product has already been imported to your store."
    );
  }

  // Get supplier variants
  const supplierVariants = await db
    .select()
    .from(supplierProductVariants)
    .where(
      and(
        eq(supplierProductVariants.supplierProductId, supplierProductId),
        eq(supplierProductVariants.isActive, true)
      )
    )
    .orderBy(supplierProductVariants.sortOrder);

  if (supplierVariants.length === 0) {
    throw new ValidationError("Supplier product has no active variants.");
  }

  const retailPrice =
    resellerOverrides?.retailPricePaise ??
    supplierProduct.suggestedRetailPaise ??
    Math.round(supplierProduct.costPricePaise * 1.5);

  const slug = generateImportSlug(
    resellerOverrides?.title || supplierProduct.title
  );

  let mappingCount = 0;

  await db.transaction(async (tx) => {
    // 1. Create merchant product
    const [merchantProduct] = await tx
      .insert(products)
      .values({
        storeId,
        source: "PLATFORM_SUPPLIER",
        fulfillmentType: "PLATFORM_DROPSHIP",
        supplierId: supplier.id,
        supplierProductId: supplierProduct.id,
        title: resellerOverrides?.title || supplierProduct.title,
        slug,
        description: resellerOverrides?.description || supplierProduct.description,
        basePrice: retailPrice,
        compareAtPrice: resellerOverrides?.compareAtPricePaise || null,
        costPrice: supplierProduct.costPricePaise, // Internal — never exposed to storefront
        vendor: supplier.displayName,
        trackInventory: true,
        allowBackorders: false,
        status: resellerOverrides?.status || "DRAFT",
      })
      .returning();

    // 2. Create merchant variants mapped to supplier variants
    for (const sv of supplierVariants) {
      const variantRetailPrice =
        sv.suggestedRetailPaise ??
        retailPrice;

      const [merchantVariant] = await tx
        .insert(productVariants)
        .values({
          productId: merchantProduct.id,
          storeId,
          title: sv.title,
          sku: sv.supplierSku ? `DS-${sv.supplierSku}` : null,
          price: variantRetailPrice,
          costPrice: sv.costPricePaise,
          option1: sv.option1,
          option2: sv.option2,
          option3: sv.option3,
          imageUrl: sv.imageUrl,
          isActive: true,
          sortOrder: sv.sortOrder,
        })
        .returning();

      // 3. Create reseller mapping (idempotency guard via unique index)
      await tx.insert(resellerProductMappings).values({
        storeId,
        productId: merchantProduct.id,
        variantId: merchantVariant.id,
        supplierId: supplier.id,
        supplierProductId: supplierProduct.id,
        supplierVariantId: sv.id,
        supplierCostSnapshot: sv.costPricePaise,
        autoSyncStock: true,
        autoSyncPrice: false,
        autoSyncTitle: false,
      });

      mappingCount++;
    }
  });

  return {
    productId: (
      await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.slug, slug)))
        .limit(1)
    )[0].id,
    mappingCount,
  };
}

/**
 * Syncs supplier data to reseller product. Respects auto-sync flags.
 * - Stock is always from supplier (merchant inventory NOT used for PLATFORM_SUPPLIER products)
 * - Price sync optional — reseller overrides are preserved if autoSyncPrice=false
 * - Title sync optional — reseller customizations preserved if autoSyncTitle=false
 */
export async function syncSupplierToReseller(
  supplierProductId: string
): Promise<{ synced: number }> {
  const mappings = await db
    .select()
    .from(resellerProductMappings)
    .where(eq(resellerProductMappings.supplierProductId, supplierProductId));

  let synced = 0;

  for (const mapping of mappings) {
    const [sv] = await db
      .select()
      .from(supplierProductVariants)
      .where(eq(supplierProductVariants.id, mapping.supplierVariantId))
      .limit(1);

    if (!sv) continue;

    const updates: Record<string, unknown> = {};

    if (mapping.autoSyncPrice) {
      updates.costPrice = sv.costPricePaise;
    }

    // Update cost snapshot always (for profit calculation accuracy)
    await db
      .update(resellerProductMappings)
      .set({
        supplierCostSnapshot: sv.costPricePaise,
        updatedAt: new Date(),
      })
      .where(eq(resellerProductMappings.id, mapping.id));

    if (Object.keys(updates).length > 0) {
      await db
        .update(productVariants)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(productVariants.id, mapping.variantId));
    }

    synced++;
  }

  return { synced };
}

/**
 * Gets all reseller mappings for a store.
 */
export async function getStoreMappings(
  storeId: string
): Promise<Array<{
  id: string;
  productId: string;
  variantId: string;
  supplierId: string;
  supplierProductId: string;
  supplierVariantId: string;
  supplierCostSnapshot: number;
  autoSyncPrice: boolean;
  autoSyncStock: boolean;
  createdAt: string;
}>> {
  const mappings = await db
    .select()
    .from(resellerProductMappings)
    .where(eq(resellerProductMappings.storeId, storeId));

  return mappings.map((m) => ({
    id: m.id,
    productId: m.productId,
    variantId: m.variantId,
    supplierId: m.supplierId,
    supplierProductId: m.supplierProductId,
    supplierVariantId: m.supplierVariantId,
    supplierCostSnapshot: m.supplierCostSnapshot,
    autoSyncPrice: m.autoSyncPrice,
    autoSyncStock: m.autoSyncStock,
    createdAt: m.createdAt.toISOString(),
  }));
}

// ─── Helpers ───────────────────────────────────────────

function generateImportSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${base}-${Date.now().toString(36)}`;
}
