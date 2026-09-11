import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { getOrderById } from "@/modules/orders/order-service";
import { requestReturn } from "@/modules/orders/returns-service";
import { RequestReturnSchema } from "@/modules/orders/validation";
import { ValidationError, NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

async function resolveRequestContext(req: NextRequest) {
  const headerHost = req.headers.get("x-store-domain") || req.headers.get("host") || "";
  const queryDomain = req.nextUrl.searchParams.get("domain");
  const targetDomain = queryDomain || headerHost;

  const resolution = await resolveStorefrontTenant(targetDomain);
  if (resolution.status !== "ACTIVE") {
    throw new NotFoundError(`No active store resolved for domain: ${targetDomain}`);
  }

  return { storeId: resolution.store.id };
}

/**
 * GET /api/v1/storefront/orders/[id]
 */
export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { storeId } = await resolveRequestContext(req);
    const { id: orderId } = await params;
    const customerId = req.nextUrl.searchParams.get("customerId");

    const order = await getOrderById(storeId, orderId, { customerId });
    return apiSuccess(order);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/v1/storefront/orders/[id]
 * Submits return request.
 */
export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { storeId } = await resolveRequestContext(req);
    const { id: orderId } = await params;
    const body = await req.json();
    const customerId = req.nextUrl.searchParams.get("customerId");

    const parsed = RequestReturnSchema.parse({ ...body, orderId });
    const returnReq = await requestReturn(storeId, parsed, customerId);

    return apiSuccess(returnReq, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}
