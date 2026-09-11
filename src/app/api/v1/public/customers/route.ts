import { apiSuccess, apiError } from "@/core/api/response";
import { authenticateDeveloperRequest } from "@/core/developer/auth";
import { db } from "@/database/client";
import { customers } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public Developer API: Customers
 * GET /api/v1/public/customers
 * Requires Scope: read_customers
 */
export async function GET() {
  try {
    const authContext = await authenticateDeveloperRequest("read_customers");

    const storeCustomers = await db
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        ordersCount: customers.ordersCount,
        totalSpent: customers.totalSpent,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.storeId, authContext.storeId))
      .orderBy(desc(customers.createdAt))
      .limit(50);

    return apiSuccess({
      customers: storeCustomers,
      count: storeCustomers.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
