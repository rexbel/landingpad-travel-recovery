import { z } from "zod";
import type { ApiResult } from "@/schemas/api-result";
import { flightSchema } from "@/schemas/trip-request";
import { aviationContextSchema, type AviationContext } from "@/schemas/aviation-context";
import { getAviationContext } from "@/lib/aeroxplorer";
import { invalidRequest, serverFailure } from "@/lib/ai/http";

// Only the minimum fields needed to resolve an airport and, optionally, an
// exact historical flight — never the full TripRequest (budget, party, etc.
// have no bearing on aviation evidence and should not cross this boundary).
const aviationContextRequestSchema = z.object({
  currentLocation: z.string().trim().max(200).optional(),
  targetArea: z.string().trim().min(1).max(200),
  flight: flightSchema.optional(),
  appMode: z.enum(["demo", "active"]).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("A valid JSON request body is required.");
  }
  const parsed = aviationContextRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();

  if (parsed.data.appMode === "demo") {
    const body: ApiResult<AviationContext> = {
      ok: true,
      data: { mode: "unavailable", evidence: [], warnings: ["Aviation context is unavailable in demo mode."] },
    };
    return Response.json(body);
  }

  try {
    const data = aviationContextSchema.parse(
      await getAviationContext({
        currentLocation: parsed.data.currentLocation,
        targetArea: parsed.data.targetArea,
        flight: parsed.data.flight,
      }),
    );
    const result: ApiResult<AviationContext> = { ok: true, data };
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return serverFailure("AVIATION_CONTEXT_FAILED", "Historical aviation context is temporarily unavailable.", true);
  }
}
