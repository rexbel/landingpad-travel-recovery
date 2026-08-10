import { z } from "zod";
import type { ApiResult } from "@/schemas/api-result";
import { flightSchema } from "@/schemas/trip-request";
import { flightRecoveryContextSchema, type FlightRecoveryContext } from "@/schemas/flight-recovery";
import { getFlightRecoveryContext } from "@/lib/flight-recovery";
import { invalidRequest, serverFailure } from "@/lib/ai/http";

// Only the flight fields needed for a route/date-scoped search — no budget,
// party, or hotel fields belong here, and no credential or token can ever
// arrive through this schema.
const flightRecoveryRequestSchema = z.object({
  flight: flightSchema,
  appMode: z.enum(["demo", "active"]).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("A valid JSON request body is required.");
  }
  const parsed = flightRecoveryRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();

  if (parsed.data.appMode === "demo") {
    const body: ApiResult<FlightRecoveryContext> = {
      ok: true,
      data: { mode: "unavailable", options: [], evidence: [], warnings: ["Flight recovery is unavailable in demo mode."] },
    };
    return Response.json(body);
  }

  try {
    const data = flightRecoveryContextSchema.parse(await getFlightRecoveryContext({ flight: parsed.data.flight }));
    const result: ApiResult<FlightRecoveryContext> = { ok: true, data };
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return serverFailure("FLIGHT_RECOVERY_FAILED", "Flight recovery assistance is temporarily unavailable.", true);
  }
}
