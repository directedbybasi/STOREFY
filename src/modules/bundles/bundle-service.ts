import { db } from "@/database/client";
import {
  productBundles,
  bundleComponents,
  inventory,
  productVariants,
  products,
} from "@/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface BundleComponentInput {
  componentProductId: string;
  componentVariantId: string;
  quantity: number;
}

export interface CreateBundleInput {
  storeId: string;
  bundleProductId: string;
  pricingMode?: "FIXED" | "COMPONENT_DERIVED";
  fixedPricePaise?: number;
  components: BundleComponentInput[];
}

/**
 * Creates a product bundle definition linked to component products and variants.
 */
export async function createProductBundle(input: CreateBundleInput) {
  const { storeId, bundleProductId, pricingMode = "COMPONENT_DERIVED", fixedPricePaise, components } = input;

  if (!components || components.length === 0) {
    throw new ValidationError("A bundle must contain at least one component product.");
  }

  return db.transaction(async (tx) => {
    const [bundle] = await tx
      .insert(productBundles)
      .values({
        storeId,
        bundleProductId,
        pricingMode,
        fixedPricePaise: fixedPricePaise || null,
        isActive: true,
      })
      .returning();

    for (const comp of components) {
      if (comp.quantity <= 0) {
        throw new ValidationError("Component quantity must be at least 1.");
      }

      await tx.insert(bundleComponents).values({
        bundleId: bundle.id,
        componentProductId: comp.componentProductId,
        componentVariantId: comp.componentVariantId,
        quantity: comp.quantity,
      });
    }

    return bundle;
  });
}

/**
 * Authoritatively calculates maximum bundle availability based on component inventories:
 * Available = min(available_i / quantity_i)
 */
export async function calculateBundleAvailability(
  storeId: string,
  bundleId: string
): Promise<number> {
  const components = await db
    .select({
      variantId: bundleComponents.componentVariantId,
      requiredQty: bundleComponents.quantity,
    })
    .from(bundleComponents)
    .where(eq(bundleComponents.bundleId, bundleId));

  if (components.length === 0) return 0;

  const variantIds = components.map((c) => c.variantId);

  // Fetch available inventory for all component variants in this store
  const invRows = await db
    .select({
      variantId: inventory.variantId,
      available: inventory.available,
    })
    .from(inventory)
    .where(and(eq(inventory.storeId, storeId), inArray(inventory.variantId, variantIds)));

  const inventoryMap = new Map<string, number>();
  for (const row of invRows) {
    inventoryMap.set(row.variantId, (inventoryMap.get(row.variantId) || 0) + row.available);
  }

  let maxAvailableBundles = Infinity;

  for (const comp of components) {
    const stock = inventoryMap.get(comp.variantId) || 0;
    const possibleFromThisComponent = Math.floor(stock / comp.requiredQty);
    if (possibleFromThisComponent < maxAvailableBundles) {
      maxAvailableBundles = possibleFromThisComponent;
    }
  }

  return maxAvailableBundles === Infinity ? 0 : maxAvailableBundles;
}

/**
 * Calculates authoritative bundle pricing in Paise.
 */
export async function calculateBundlePrice(
  storeId: string,
  bundleId: string
): Promise<number> {
  const [bundle] = await db
    .select()
    .from(productBundles)
    .where(and(eq(productBundles.storeId, storeId), eq(productBundles.id, bundleId)))
    .limit(1);

  if (!bundle) throw new NotFoundError("Bundle not found.");

  if (bundle.pricingMode === "FIXED" && bundle.fixedPricePaise !== null) {
    return bundle.fixedPricePaise;
  }

  // Calculate sum of component variant prices
  const components = await db
    .select({
      variantPrice: productVariants.price,
      quantity: bundleComponents.quantity,
    })
    .from(bundleComponents)
    .innerJoin(productVariants, eq(bundleComponents.componentVariantId, productVariants.id))
    .where(eq(bundleComponents.bundleId, bundleId));

  return components.reduce((sum, c) => sum + Number(c.variantPrice || 0) * c.quantity, 0);
}

/**
 * Generates an immutable snapshot of bundle components for order line item fulfillment.
 */
export async function getBundleComponentSnapshot(storeId: string, bundleId: string) {
  return db
    .select({
      componentProductId: bundleComponents.componentProductId,
      componentVariantId: bundleComponents.componentVariantId,
      quantity: bundleComponents.quantity,
      title: products.title,
      variantTitle: productVariants.title,
      sku: productVariants.sku,
    })
    .from(bundleComponents)
    .innerJoin(products, eq(bundleComponents.componentProductId, products.id))
    .innerJoin(productVariants, eq(bundleComponents.componentVariantId, productVariants.id))
    .where(eq(bundleComponents.bundleId, bundleId));
}
