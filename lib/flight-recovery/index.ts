import type { TripRequest } from "@/schemas/trip-request";
import type { FlightRecoveryContext } from "@/schemas/flight-recovery";
import { searchAlternateFlights } from "./search";
import { getRouteHistoricalContext } from "./context";

export type FlightRecoveryOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * Orchestrates flight-recovery assistance: grounded search links (Tavily) and
 * route-level historical context (AeroXplorer), run independently so one
 * failing never blocks the other. Never throws; degrades to "unavailable".
 */
export async function getFlightRecoveryContext(
  request: Pick<TripRequest, "flight">,
  options: FlightRecoveryOptions = {},
): Promise<FlightRecoveryContext> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");

  const flight = request.flight;
  if (!flight?.originIata || !flight.scheduledDate) {
    return {
      mode: "unavailable",
      options: [],
      evidence: [],
      warnings: ["No origin airport or date was available for a flight search."],
    };
  }

  const now = options.now ?? (() => new Date());
  const warnings: string[] = [];

  const [searchOutcome, historicalOutcome] = await Promise.allSettled([
    searchAlternateFlights(flight.originIata, flight.destinationIata, flight.scheduledDate, options),
    getRouteHistoricalContext(flight, options),
  ]);

  const flightOptions =
    searchOutcome.status === "fulfilled" && searchOutcome.value.ok ? searchOutcome.value.options : [];
  if (searchOutcome.status === "rejected" || (searchOutcome.status === "fulfilled" && !searchOutcome.value.ok)) {
    warnings.push("Flight search links are temporarily unavailable.");
  }

  const historicalContext = historicalOutcome.status === "fulfilled" ? historicalOutcome.value : undefined;

  const evidence: FlightRecoveryContext["evidence"] = [];
  if (flightOptions.length > 0) {
    evidence.push({ provider: "Tavily", label: "Web-grounded flight search links", retrievedAt: now().toISOString() });
  }
  if (historicalContext) {
    evidence.push({ provider: "AeroXplorer", label: "Historical aviation data", retrievedAt: now().toISOString() });
  }

  if (flightOptions.length === 0 && !historicalContext) {
    return {
      mode: "unavailable",
      options: [],
      evidence: [],
      warnings: warnings.length ? warnings : ["Flight recovery assistance is currently unavailable."],
    };
  }

  return {
    mode: "flight-recovery",
    options: flightOptions,
    historicalContext,
    evidence,
    warnings,
  };
}
