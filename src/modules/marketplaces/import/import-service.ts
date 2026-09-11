import { db } from "@/database/client";
import {
  products,
  productVariants,
  marketplaceProducts,
  marketplaceProductVariants,
  marketplaceProductMappings,
  marketplaceSyncLogs,
} from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/core/errors";
import { marketplaceRegistry } from "../core/registry";
import "../meesho/adapter"; // Ensures Meesho adapter is registered
import { calculateMarketplaceProfit } from "../pricing/pricing-service";
import type {
  ImportPreviewDTO,
  ImportOverrides,
  ImportResultDTO,
  ImportedProductSummaryDTO,
} from "./types";

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "product"}-${Date.now().toString(36)}`;
}

/**
 * Previews a Meesho product before importing.
 * Does not write anything to the database.
 */
export async function previewMeeshoProduct(
  urlOrCode: string
): Promise<ImportPreviewDTO> {
  const connector = marketplaceRegistry.get("MEESHO");
  const validation = await connector.validateProductReference(urlOrCode);
  if (!validation.isValid) {
    throw new ValidationError(validation.error || "Invalid Meesho product reference.");
  }

  const normalized = await connector.fetchProduct(validation.canonicalReference);

  // Calculate default retail markup: 60% gross margin above wholesale cost
  const defaultRetailPaise = Math.round(normalized.sourceCostPaise * 1.6);
  const profit = calculateMarketplaceProfit({
    retailPricePaise: defaultRetailPaise,
    sourceCostPaise: normalized.sourceCostPaise,
  });

  return {
    sourceProductId: normalized.sourceProductId,
    sourceUrl: normalized.sourceUrl,
    title: normalized.title,
    description: normalized.description,
    categoryName: normalized.categoryName,
    categoryStatus: normalized.categoryStatus,
    sourceCostPaise: normalized.sourceCostPaise,
    suggestedRetailPaise: defaultRetailPaise,
    estimatedProfitPaise: profit.estimatedProfitPaise,
    marginPercent: profit.marginPercent,
    images: normalized.images,
    variants: normalized.variants,
    specifications: normalized.specifications,
    rating: normalized.reviews.rating,
    reviewCount: normalized.reviews.reviewCount,
    availability: normalized.availability,
  };
}

/**
 * Idempotently imports a Meesho product into the merchant's store catalog.
 *
 * CRITICAL INVARIANTS:
 * 1. product.source = 'MEESHO', fulfillmentType = 'MEESHO_RESELLING'
 * 2. Duplicate import guard via unique index (storeId, marketplace, sourceProductId)
 * 3. Does NOT add stock to merchant physical inventory ledger
 * 4. Stores wholesale cost securely in internal tables (never in public storefront responses)
 */
export async function importMeeshoProduct(
  storeId: string,
  urlOrCode: string,
  overrides?: ImportOverrides
): Promise<ImportResultDTO> {
  const connector = marketplaceRegistry.get("MEESHO");
  const validation = await connector.validateProductReference(urlOrCode);
  if (!validation.isValid) {
    throw new ValidationError(validation.error || "Invalid Meesho product reference.");
  }

  const normalized = await connector.fetchProduct(validation.canonicalReference);

  // 1. Check for existing mapping in this store (Duplicate Import Protection)
  const [existingMarketplaceProduct] = await db
    .select()
    .from(marketplaceProducts)
    .where(
      and(
        eq(marketplaceProducts.storeId, storeId),
        eq(marketplaceProducts.marketplace, "MEESHO"),
        eq(marketplaceProducts.sourceProductId, normalized.sourceProductId)
      )
    )
    .limit(1);

  if (existingMarketplaceProduct) {
    const [mapping] = await db
      .select()
      .from(marketplaceProductMappings)
      .where(
        and(
          eq(marketplaceProductMappings.storeId, storeId),
          eq(marketplaceProductMappings.marketplaceProductId, existingMarketplaceProduct.id)
        )
      )
      .limit(1);

    if (mapping) {
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, mapping.productId))
        .limit(1);

      if (existingProduct) {
        const profit = calculateMarketplaceProfit({
          retailPricePaise: existingProduct.basePrice,
          sourceCostPaise: existingMarketplaceProduct.sourceCostPaise,
        });

        return {
          productId: existingProduct.id,
          marketplaceProductId: existingMarketplaceProduct.id,
          title: existingProduct.title,
          retailPricePaise: existingProduct.basePrice,
          sourceCostPaise: existingMarketplaceProduct.sourceCostPaise,
          estimatedProfitPaise: profit.estimatedProfitPaise,
          marginPercent: profit.marginPercent,
          variantsCreated: 0,
          isExisting: true,
        };
      }
    }
  }

  // 2. Compute retail pricing
  const retailPricePaise =
    overrides?.retailPricePaise || Math.round(normalized.sourceCostPaise * 1.6);
  const slug = generateSlug(overrides?.title || normalized.title);

  let createdProductId = "";
  let createdMpProductId = "";
  let variantsCount = 0;

  // 3. Database transaction
  await db.transaction(async (tx) => {
    // A. Insert into canonical products table
    const [newProduct] = await tx
      .insert(products)
      .values({
        storeId,
        source: "MEESHO",
        fulfillmentType: "MEESHO_RESELLING",
        title: overrides?.title || normalized.title,
        slug,
        description: overrides?.description || normalized.description,
        basePrice: retailPricePaise,
        compareAtPrice: overrides?.compareAtPricePaise || normalized.sourceComparePaise || null,
        costPrice: normalized.sourceCostPaise, // Stored internally, never exposed to storefront
        vendor: "Meesho Reselling",
        trackInventory: false, // Invariant: Meesho stock is NOT merchant-owned stock
        allowBackorders: false,
        status: overrides?.status || "DRAFT",
      })
      .returning();

    createdProductId = newProduct.id;

    // B. Insert into marketplace_products cache
    const [newMpProduct] = await tx
      .insert(marketplaceProducts)
      .values({
        storeId,
        marketplace: "MEESHO",
        sourceProductId: normalized.sourceProductId,
        sourceUrl: normalized.sourceUrl,
        sourceTitle: normalized.title,
        sourceDescription: normalized.description,
        sourceCategory: normalized.categoryName || null,
        sourceCostPaise: normalized.sourceCostPaise,
        sourceComparePaise: normalized.sourceComparePaise || null,
        currency: "INR",
        rating: normalized.reviews.rating ? String(normalized.reviews.rating) : null,
        reviewCount: normalized.reviews.reviewCount,
        specifications: normalized.specifications,
        images: normalized.images,
        availabilityStatus: normalized.availability,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
      })
      .returning();

    createdMpProductId = newMpProduct.id;

    // C. Insert variants and mappings
    for (const v of normalized.variants) {
      const variantRetailPaise = Math.round(v.sourceCostPaise * 1.6);

      const [merchantVariant] = await tx
        .insert(productVariants)
        .values({
          productId: newProduct.id,
          storeId,
          title: v.title,
          sku: v.sku ? `MSH-${v.sku}` : null,
          price: variantRetailPaise,
          costPrice: v.sourceCostPaise,
          option1: v.options.size || null,
          option2: v.options.color || null,
          isActive: true,
          sortOrder: variantsCount,
        })
        .returning();

      await tx
        .insert(marketplaceProductVariants)
        .values({
          marketplaceProductId: newMpProduct.id,
          sourceVariantId: v.sourceVariantId,
          title: v.title,
          options: v.options,
          sourceCostPaise: v.sourceCostPaise,
          available: v.available,
          sku: v.sku || null,
        });

      await tx.insert(marketplaceProductMappings).values({
        storeId,
        marketplace: "MEESHO",
        marketplaceProductId: newMpProduct.id,
        sourceProductId: normalized.sourceProductId,
        productId: newProduct.id,
        variantId: merchantVariant.id,
        sourceVariantId: v.sourceVariantId,
        sourceCostSnapshotPaise: v.sourceCostPaise,
        autoSyncPrice: false,
        autoSyncAvailability: true,
      });

      variantsCount++;
    }

    // D. Log audit entry
    await tx.insert(marketplaceSyncLogs).values({
      storeId,
      marketplace: "MEESHO",
      sourceProductId: normalized.sourceProductId,
      action: "IMPORT",
      status: "SUCCESS",
      details: {
        productId: newProduct.id,
        variantsCount,
        retailPricePaise,
        sourceCostPaise: normalized.sourceCostPaise,
      },
    });
  });

  const profit = calculateMarketplaceProfit({
    retailPricePaise,
    sourceCostPaise: normalized.sourceCostPaise,
  });

  return {
    productId: createdProductId,
    marketplaceProductId: createdMpProductId,
    title: overrides?.title || normalized.title,
    retailPricePaise,
    sourceCostPaise: normalized.sourceCostPaise,
    estimatedProfitPaise: profit.estimatedProfitPaise,
    marginPercent: profit.marginPercent,
    variantsCreated: variantsCount,
    isExisting: false,
  };
}

/**
 * Lists all imported Meesho products for a store with margin metrics.
 */
export async function listImportedMeeshoProducts(
  storeId: string
): Promise<ImportedProductSummaryDTO[]> {
  const mpProducts = await db
    .select()
    .from(marketplaceProducts)
    .where(
      and(
        eq(marketplaceProducts.storeId, storeId),
        eq(marketplaceProducts.marketplace, "MEESHO")
      )
    )
    .orderBy(desc(marketplaceProducts.createdAt));

  const results: ImportedProductSummaryDTO[] = [];

  for (const mp of mpProducts) {
    const [mapping] = await db
      .select()
      .from(marketplaceProductMappings)
      .where(
        and(
          eq(marketplaceProductMappings.storeId, storeId),
          eq(marketplaceProductMappings.marketplaceProductId, mp.id)
        )
      )
      .limit(1);

    if (!mapping) continue;

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, mapping.productId))
      .limit(1);

    if (!prod) continue;

    const profit = calculateMarketplaceProfit({
      retailPricePaise: prod.basePrice,
      sourceCostPaise: mp.sourceCostPaise,
    });

    results.push({
      id: prod.id,
      marketplaceProductId: mp.id,
      sourceProductId: mp.sourceProductId,
      sourceUrl: mp.sourceUrl || "",
      title: prod.title,
      status: prod.status,
      retailPricePaise: prod.basePrice,
      sourceCostPaise: mp.sourceCostPaise,
      estimatedProfitPaise: profit.estimatedProfitPaise,
      marginPercent: profit.marginPercent,
      availabilityStatus: mp.availabilityStatus,
      syncStatus: mp.syncStatus,
      lastSyncedAt: mp.lastSyncedAt.toISOString(),
      createdAt: mp.createdAt.toISOString(),
    });
  }

  return results;
}

/**
 * Refreshes source data for an imported product without overwriting custom merchant pricing.
 */
export async function refreshMeeshoProduct(
  storeId: string,
  productId: string
): Promise<{ success: boolean; sourceCostPaise: number; availability: string }> {
  const [mapping] = await db
    .select()
    .from(marketplaceProductMappings)
    .where(
      and(
        eq(marketplaceProductMappings.storeId, storeId),
        eq(marketplaceProductMappings.productId, productId)
      )
    )
    .limit(1);

  if (!mapping) {
    throw new NotFoundError("Marketplace product mapping");
  }

  const connector = marketplaceRegistry.get("MEESHO");
  const normalized = await connector.fetchProduct(mapping.sourceProductId);

  // Update marketplace_products cache
  await db
    .update(marketplaceProducts)
    .set({
      sourceCostPaise: normalized.sourceCostPaise,
      availabilityStatus: normalized.availability,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceProducts.id, mapping.marketplaceProductId));

  // If autoSyncPrice is enabled, update product variant costs
  if (mapping.autoSyncPrice) {
    await db
      .update(products)
      .set({ costPrice: normalized.sourceCostPaise, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  // Log sync
  await db.insert(marketplaceSyncLogs).values({
    storeId,
    marketplace: "MEESHO",
    sourceProductId: mapping.sourceProductId,
    action: "REFRESH",
    status: "SUCCESS",
    details: {
      newCostPaise: normalized.sourceCostPaise,
      availability: normalized.availability,
    },
  });

  return {
    success: true,
    sourceCostPaise: normalized.sourceCostPaise,
    availability: normalized.availability,
  };
}
