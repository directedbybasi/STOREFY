import { NextRequest } from "next/server";
import { getAiUsageSummaryAction } from "@/modules/ai/actions";
import { apiSuccess, apiError } from "@/core/api/response";

export async function GET(_req: NextRequest) {
  try {
    const metrics = await getAiUsageSummaryAction();
    return apiSuccess(metrics);
  } catch (err: unknown) {
    return apiError(err);
  }
}
