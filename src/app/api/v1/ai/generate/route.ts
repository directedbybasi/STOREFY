import { NextRequest } from "next/server";
import { generateAiSuggestionAction } from "@/modules/ai/actions";
import { apiSuccess, apiError } from "@/core/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateAiSuggestionAction({
      productId: body.productId,
      tool: body.tool,
      context: body.context || {},
    });

    return apiSuccess(result);
  } catch (err: unknown) {
    return apiError(err);
  }
}
