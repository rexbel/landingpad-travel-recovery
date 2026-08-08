import type { ApiResult } from "@/schemas/api-result";
import { createAdvisorHandoff } from "@/lib/ai/handoff";
import { handoffRequestSchema, handoffResultSchema, type HandoffResult } from "@/lib/ai/contracts";
import { invalidRequest, serverFailure } from "@/lib/ai/http";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("A valid JSON request body is required.");
  }
  const parsed = handoffRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();
  try {
    const data = handoffResultSchema.parse(createAdvisorHandoff(parsed.data));
    const result: ApiResult<HandoffResult> = { ok: true, data };
    return Response.json(result);
  } catch {
    return serverFailure("HANDOFF_FAILED", "The advisor handoff could not be generated.", false);
  }
}
