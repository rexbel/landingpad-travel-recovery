import { searchLocalContext } from "@/lib/tavily";
import type { FlightRecoveryOption } from "@/schemas/flight-recovery";

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…` : trimmed;
}

export type AlternateFlightSearchResult =
  | { ok: true; options: FlightRecoveryOption[] }
  | { ok: false; error: { code: string; message: string } };

/**
 * Grounded web links only — LandingPad has no live flight-search provider.
 * This never returns a bookable flight; it points to where a traveler can
 * search for one, same as Stay22 hands off to a supplier page for hotels.
 */
export async function searchAlternateFlights(
  originIata: string,
  destinationIata: string | undefined,
  scheduledDate: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<AlternateFlightSearchResult> {
  const route = destinationIata ? `${originIata} to ${destinationIata}` : `out of ${originIata}`;
  const query = `alternate flight options ${route} on ${scheduledDate}`;
  const result = await searchLocalContext(query, options);
  if (!result.ok) {
    return { ok: false, error: { code: result.error.code, message: result.error.message } };
  }

  const flightOptions = result.items.slice(0, 3).map((item) => ({
    label: truncate(item.claim, 90),
    url: item.url,
    sourceMode: "tavily-web" as const,
  }));
  return { ok: true, options: flightOptions };
}
