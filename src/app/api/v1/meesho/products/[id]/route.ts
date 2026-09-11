import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import {
  products,
  marketplaceProducts,
  marketplaceProductMappings,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "@/core/errors";
import { calculateMarketplaceProfit } from "@/modules/marketplaces/pricing/pricing-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/meesho/products/[id]
 * Retrieves an imported Meesho product with its mapping details and profit margin.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("marketplace:read");

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, ctx.store.id)))
      .limit(1);

    if (!product) throw new NotFoundError("Product");

    const [mapping] = await db
      .select()
      .from(marketplaceProductMappings)
      .where(
        and(
          eq(marketplaceProductMappings.storeId, ctx.store.id),
          eq(marketplaceProductMappings.productId, id)
        )
      )
      .limit(1);

    if (!mapping) throw new NotFoundError("Marketplace product mapping");

    const [mpProduct] = await db
      .select()
      .from(marketplaceProducts)
      .where(eq(marketplaceProducts.id, mapping.marketplaceProductId))
      .limit(1);

    const profit = calculateMarketplaceProfit({
      retailPricePaise: product.basePrice,
      sourceCostPaise: mpProduct?.sourceCostPaise || mapping.sourceCostSnapshotPaise,
    });

    return apiSuccess({
      product,
      mapping,
      sourceProduct: mpProduct,
      profit,
    });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PUT /api/v1/meesho/products/[id]
 * Updates retail pricing or status for an imported Meesho product.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("marketplace:write");

    const body = await req.json();
    const { retailPricePaise, status, title, description } = body;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, ctx.store.id)))
      .limit(1);

    if (!product) throw new NotFoundError("Product");

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (retailPricePaise !== undefined && retailPricePaise > 0) {
      updates.basePrice = retailPricePaise;
    }
    if (status) {
      updates.status = status;
    }
    if (title) {
      updates.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();

    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}
