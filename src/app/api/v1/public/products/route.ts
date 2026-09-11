import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { authenticateDeveloperRequest } from "@/core/developer/auth";
import { db } from "@/database/client";
import { products, productVariants } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public Developer API: Products
 * GET /api/v1/public/products
 * Requires Scope: read_products
 */
export async function GET() {
  try {
    const authContext = await authenticateDeveloperRequest("read_products");

    const storeProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        status: products.status,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.storeId, authContext.storeId))
      .orderBy(desc(products.createdAt))
      .limit(50);

    return apiSuccess({
      products: storeProducts,
      count: storeProducts.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
