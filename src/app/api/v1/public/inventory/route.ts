import { apiSuccess, apiError } from "@/core/api/response";
import { authenticateDeveloperRequest } from "@/core/developer/auth";
import { db } from "@/database/client";
import { inventory, productVariants } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public Developer API: Inventory
 * GET /api/v1/public/inventory
 * Requires Scope: read_inventory
 */
export async function GET() {
  try {
    const authContext = await authenticateDeveloperRequest("read_inventory");

    const stockRecords = await db
      .select({
        id: inventory.id,
        variantId: inventory.variantId,
        sku: productVariants.sku,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
        available: inventory.available,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
      .where(eq(inventory.storeId, authContext.storeId))
      .orderBy(desc(inventory.updatedAt))
      .limit(50);

    return apiSuccess({
      inventory: stockRecords,
      count: stockRecords.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
