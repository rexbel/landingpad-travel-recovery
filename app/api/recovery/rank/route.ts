import type { ApiResult } from "@/schemas/api-result";
import { rankRequestSchema, rankedRecoverySchema, type RankedRecovery } from "@/lib/ai/contracts";
import { invalidRequest, serverFailure } from "@/lib/ai/http";
import { rankRecoveryPlans } from "@/lib/ai/ranking";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("A valid JSON request body is required.");
  }
  const parsed = rankRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();
  try {
    const data = rankedRecoverySchema.parse(rankRecoveryPlans(parsed.data));
    const result: ApiResult<RankedRecovery> = { ok: true, data };
    return Response.json(result);
  } catch {
    return serverFailure("RANKING_FAILED", "The eligible stays could not be ranked.", false);
  }
}
