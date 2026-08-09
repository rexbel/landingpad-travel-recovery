import type { TripRequest } from "@/schemas/trip-request";
import type { ExactFlightHistoryQuery, RouteHistoryQuery } from "./client";

/**
 * Deterministic decision for whether the request carries enough detail for a
 * narrow, meaningful historical query. Requires an exact airline, flight
 * number, origin airport, and a scheduled date. An airport alone — e.g. "our
 * flight out of JFK was cancelled" — is airport-resolution-only and must
 * never trigger a historical OTP lookup.
 */
export function buildExactFlightHistoryQuery(flight: TripRequest["flight"]): ExactFlightHistoryQuery | null {
  if (!flight) return null;
  const airlineCode = flight.airlineCode?.trim();
  const flightNumber = flight.flightNumber?.trim();
  const originIata = flight.originIata?.trim();
  const scheduledDate = flight.scheduledDate;
  if (!airlineCode || !flightNumber || !originIata || !scheduledDate) return null;

  return {
    airlineCode,
    flightNumber,
    originIata,
    destinationIata: flight.destinationIata?.trim() || undefined,
    scheduledDate,
  };
}

/**
 * Looser than buildExactFlightHistoryQuery: a route-level historical query
 * only needs an origin and a date (destination narrows it further when
 * known). No airline or flight number required — a traveler weighing
 * alternate flights usually doesn't have a specific flight number yet.
 */
export function buildRouteHistoryQuery(flight: TripRequest["flight"]): RouteHistoryQuery | null {
  if (!flight) return null;
  const originIata = flight.originIata?.trim();
  const scheduledDate = flight.scheduledDate;
  if (!originIata || !scheduledDate) return null;

  return {
    originIata,
    destinationIata: flight.destinationIata?.trim() || undefined,
    scheduledDate,
  };
}
