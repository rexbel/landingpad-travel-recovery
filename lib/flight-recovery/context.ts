import { getRouteHistory } from "@/lib/aeroxplorer/client";
import { buildRouteHistoryQuery } from "@/lib/aeroxplorer/otp-eligibility";
import { clamp01, describeObservationWindow, toBooleanFlag } from "@/lib/aeroxplorer/normalize";
import type { TripRequest } from "@/schemas/trip-request";
import type { FlightRecoveryContext } from "@/schemas/flight-recovery";

const DELAY_THRESHOLD_MINUTES = 15;

/**
 * Route-level (not exact-flight) historical on-time context — how flights on
 * this origin/destination pair have historically fared, computed from
 * whatever sample AeroXplorer's historical database returns. Never a
 * forecast, never tied to a specific bookable flight.
 */
export async function getRouteHistoricalContext(
  flight: TripRequest["flight"],
  options: { baseUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<FlightRecoveryContext["historicalContext"] | undefined> {
  const query = buildRouteHistoryQuery(flight);
  if (!query) return undefined;

  const result = await getRouteHistory(query, options);
  if (!result.ok) return undefined;

  const records = result.data.results;
  if (records.length === 0) return undefined;

  // A record can only be confidently called on-time or not if we actually
  // know its cancellation/diversion status — an unknown status is excluded
  // rather than defaulted to "not cancelled/not diverted", matching how
  // lib/aeroxplorer/normalize.ts excludes unknown-status records from its
  // own rate denominators instead of silently assuming the best case.
  const onTimeFlags = records
    .map((record) => {
      const cancelled = toBooleanFlag(record.cancelled);
      const diverted = toBooleanFlag(record.diverted);
      if (cancelled === undefined || diverted === undefined) return undefined;
      const delayed = typeof record.arrdelayminutes === "number" && record.arrdelayminutes >= DELAY_THRESHOLD_MINUTES;
      return !cancelled && !diverted && !delayed;
    })
    .filter((flag): flag is boolean => flag !== undefined);

  if (onTimeFlags.length === 0) return undefined;

  return {
    originIata: query.originIata,
    destinationIata: query.destinationIata,
    onTimeRate: clamp01(onTimeFlags.filter(Boolean).length / onTimeFlags.length),
    observations: records.length,
    observationWindow: describeObservationWindow(query),
  };
}
