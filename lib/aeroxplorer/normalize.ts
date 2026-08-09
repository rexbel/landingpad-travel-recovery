import type { TripRequest } from "@/schemas/trip-request";
import type { AviationContext } from "@/schemas/aviation-context";
import { getAirportByIata, getExactFlightHistory, type ExactFlightHistoryQuery } from "./client";
import type { AeroXplorerAirportResponse, AeroXplorerOtpResponse } from "./schemas";
import { buildExactFlightHistoryQuery } from "./otp-eligibility";

// US DOT on-time-performance convention: an arrival is "delayed" at 15+ minutes.
const DELAY_THRESHOLD_MINUTES = 15;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toBooleanFlag(value: boolean | number | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return undefined;
}

function describeObservationWindow(query: ExactFlightHistoryQuery): string {
  const [year] = query.scheduledDate.split("-");
  const monthName = new Date(`${query.scheduledDate}T00:00:00Z`).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return `${monthName} ${year}`;
}

export function normalizeAirport(response: AeroXplorerAirportResponse): AviationContext["airport"] | undefined {
  const first = response.results[0];
  if (!first) return undefined;
  return {
    iata: first.iata,
    name: first.name,
    city: first.location,
    latitude: first.lat,
    longitude: first.lng,
  };
}

/** Rates are computed from the returned sample, each with its own explicit
 * denominator (records with a known status for that metric) — never a forecast. */
export function normalizeHistoricalFlight(
  response: AeroXplorerOtpResponse,
  query: ExactFlightHistoryQuery,
): AviationContext["historicalFlight"] | undefined {
  const records = response.results;
  const observations = records.length;
  if (observations === 0) return undefined;

  const cancelledFlags = records.map((r) => toBooleanFlag(r.cancelled)).filter((v): v is boolean => v !== undefined);
  const divertedFlags = records.map((r) => toBooleanFlag(r.diverted)).filter((v): v is boolean => v !== undefined);
  const delayValues = records.map((r) => r.arrdelayminutes).filter((v): v is number => typeof v === "number");

  return {
    airlineCode: query.airlineCode,
    flightNumber: query.flightNumber,
    originIata: query.originIata,
    destinationIata: query.destinationIata,
    observationWindow: describeObservationWindow(query),
    observations,
    cancellationRate:
      cancelledFlags.length > 0 ? clamp01(cancelledFlags.filter(Boolean).length / cancelledFlags.length) : undefined,
    diversionRate:
      divertedFlags.length > 0 ? clamp01(divertedFlags.filter(Boolean).length / divertedFlags.length) : undefined,
    delayRate:
      delayValues.length > 0
        ? clamp01(delayValues.filter((minutes) => minutes >= DELAY_THRESHOLD_MINUTES).length / delayValues.length)
        : undefined,
  };
}

function evidenceEntry(retrievedAt: string): AviationContext["evidence"][number] {
  return { provider: "AeroXplorer", classification: "historical", label: "Historical aviation data", retrievedAt };
}

export type AviationContextRequest = Pick<TripRequest, "currentLocation" | "targetArea" | "flight">;

function resolveIataCandidate(request: AviationContextRequest): string | undefined {
  if (request.flight?.originIata) return request.flight.originIata;
  const text = `${request.currentLocation ?? ""} ${request.targetArea}`;
  return text.match(/\b([A-Z]{3})\b/)?.[1];
}

export type AviationContextOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * Orchestrates airport resolution and, only when sufficiently specific, a
 * historical flight lookup. Never throws — always returns a usable
 * AviationContext, degrading to "unavailable" on total failure.
 */
export async function getAviationContext(
  request: AviationContextRequest,
  options: AviationContextOptions = {},
): Promise<AviationContext> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const warnings: string[] = [];
  const now = options.now ?? (() => new Date());
  const iataCandidate = resolveIataCandidate(request);

  let airport: AviationContext["airport"] | undefined;
  if (!iataCandidate) {
    warnings.push("No resolvable airport code was found in the request.");
  } else {
    const airportResult = await getAirportByIata(iataCandidate, options);
    if (airportResult.ok) {
      airport = normalizeAirport(airportResult.data);
      if (!airport) warnings.push(`No AeroXplorer airport record was found for ${iataCandidate}.`);
    } else {
      warnings.push(airportResult.error.message);
    }
  }

  const flightQuery = buildExactFlightHistoryQuery(request.flight);
  let historicalFlight: AviationContext["historicalFlight"] | undefined;
  if (!flightQuery) {
    if (request.flight) {
      warnings.push("Flight details were insufficient for a narrow historical lookup; showing airport information only.");
    }
  } else {
    const otpResult = await getExactFlightHistory(flightQuery, options);
    if (otpResult.ok) {
      historicalFlight = normalizeHistoricalFlight(otpResult.data, flightQuery);
      if (!historicalFlight) warnings.push("No matching historical observations were found for this flight.");
    } else {
      warnings.push(otpResult.error.message);
    }
  }

  if (!airport && !historicalFlight) {
    return {
      mode: "unavailable",
      evidence: [],
      warnings: warnings.length ? warnings : ["AeroXplorer data is currently unavailable."],
    };
  }

  return {
    mode: historicalFlight ? "aeroxplorer-historical" : "airport-metadata-only",
    airport,
    historicalFlight,
    evidence: [evidenceEntry(now().toISOString())],
    warnings,
  };
}
