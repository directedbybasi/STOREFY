import { NextResponse } from "next/server";
import { formatApiError } from "@/core/errors";

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiSuccessPayload<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Generates standardized Next.js JSON success responses matching API-SPECIFICATION.md
 */
export function apiSuccess<T>(data: T, meta?: PaginationMeta, status = 200) {
  const payload: ApiSuccessPayload<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(payload, { status });
}

/**
 * Generates standardized Next.js JSON error responses matching RFC 7807 / API-SPECIFICATION.md
 */
export function apiError(error: unknown, traceId?: string) {
  const formatted = formatApiError(error, traceId);
  return NextResponse.json(formatted.body, { status: formatted.statusCode });
}
