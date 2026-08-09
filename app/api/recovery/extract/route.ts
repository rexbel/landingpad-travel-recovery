import type { ApiResult } from "@/schemas/api-result";
import { extractRequestSchema, extractionResultSchema, type ExtractionResult } from "@/lib/ai/contracts";
import { extractTripRequest } from "@/lib/ai/extraction";
import { invalidRequest, serverFailure } from "@/lib/ai/http";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("A valid JSON request body is required.");
  }
  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();
  try {
    const data = extractionResultSchema.parse(
      await extractTripRequest(parsed.data, { forceDemo: parsed.data.appMode === "demo" }),
    );
    const result: ApiResult<ExtractionResult> = { ok: true, data, mode: data.extractionMode };
    return Response.json(result);
  } catch {
    return serverFailure("EXTRACTION_FAILED", "We could not structure this request. Use the editable text form.", true);
  }
}
