import { tripRequestSchema, type TripRequest } from "@/schemas/trip-request";
import type { ExtractRequest, ExtractionResult } from "./contracts";

const DAY_MS = 86_400_000;

function nextIsoDate(date: string, days = 1): string {
  return new Date(`${date}T12:00:00.000Z`).getTime() + days * DAY_MS > 0
    ? new Date(new Date(`${date}T12:00:00.000Z`).getTime() + days * DAY_MS)
        .toISOString()
        .slice(0, 10)
    : date;
}

function numberBefore(text: string, noun: string, fallback: number): number {
  const match = text.match(new RegExp(`(\\d+)\\s+${noun}`, "i"));
  return match ? Number(match[1]) : fallback;
}

function budgetFrom(text: string): number | undefined {
  const match = text.match(/(?:under|below|budget(?:\s+of)?|keep(?:\s+the)?\s+total\s+under)\s*\$?([\d,]+)/i);
  return match ? Number(match[1].replaceAll(",", "")) : undefined;
}

function targetAreaFrom(text: string): string {
  if (/\bJFK\b|John F\. Kennedy/i.test(text)) return "JFK Airport, New York";
  const near = text.match(/near\s+(?:the\s+)?([^,.]+?)(?:\s+for\s+\$|\s+under\s+\$|[,.]|$)/i);
  return near?.[1]?.trim() || "JFK Airport, New York";
}

// Deliberately small and explicit — a handful of well-known cities' primary
// IATA code, not general geocoding. Never invents a code for an unrecognized
// destination; the flight field simply stays unset in that case.
const CITY_TO_IATA: Record<string, string> = {
  chicago: "ORD",
  "los angeles": "LAX",
  boston: "BOS",
  miami: "MIA",
  "san francisco": "SFO",
  atlanta: "ATL",
  dallas: "DFW",
  denver: "DEN",
  seattle: "SEA",
  "washington": "DCA",
};

// Narrows scope only — ambiguous or unmentioned stays undefined ("both"
// downstream), never expands to a service the traveler didn't ask about.
function assistanceScopeFrom(text: string): "hotel" | "flight" | "both" | undefined {
  const hotelOnly =
    /\b(just|only)\s+(need\s+)?(a\s+|the\s+)?(hotel|room|accommodations?)\b/i.test(text) || /\bno\s+flight\b/i.test(text);
  const flightOnly =
    /\b(just|only)\s+(need\s+)?(an?\s+|the\s+)?(flight|alternate\s+flight)\b/i.test(text) || /\bno\s+hotel\b/i.test(text);
  if (hotelOnly && !flightOnly) return "hotel";
  if (flightOnly && !hotelOnly) return "flight";
  if (/\bboth\b/i.test(text)) return "both";
  return undefined;
}

const KNOWN_CITY_PATTERN = new RegExp(
  `\\b(${Object.keys(CITY_TO_IATA)
    .sort((a, b) => b.length - a.length)
    .map((city) => city.replace(/\s+/g, "\\s+"))
    .join("|")})\\b`,
  "i",
);

function destinationIataFrom(text: string): string | undefined {
  const match = text.match(KNOWN_CITY_PATTERN);
  return match ? CITY_TO_IATA[match[1].toLowerCase()] : undefined;
}

export function deterministicExtract(input: ExtractRequest): ExtractionResult {
  const text = input.transcript.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const checkin = referenceDate;
  const checkout = nextIsoDate(checkin);
  const hardBudgetTotal = budgetFrom(text);
  const adults = numberBefore(text, "adults?", /two adults/i.test(text) ? 2 : 1);
  const children = numberBefore(text, "(?:children|child)", /one child/i.test(text) ? 1 : 0);
  const rooms = numberBefore(text, "rooms?", /two rooms/i.test(text) ? 2 : 1);
  const mustHaves: string[] = [];
  const preferences: string[] = [];
  const uncertainties: string[] = [];

  if (/late check[ -]?in/i.test(text)) mustHaves.push("Late check-in");
  if (/cannot manage stairs|no stairs|step-free/i.test(text)) {
    mustHaves.push("Step-free access");
    uncertainties.push("Accessibility has not been verified by a source");
  }
  const minutes = text.match(/within\s+(\d+)\s+minutes?/i)?.[1];
  if (minutes) preferences.push(`Within ${minutes} minutes of the target area`);
  if (/food after\s+10|food nearby|late[- ]night food/i.test(text)) {
    preferences.push("Food nearby after 10 PM");
  }
  if (/minimi[sz]e transfers/i.test(text)) preferences.push("Minimize transfers");
  if (!hardBudgetTotal) uncertainties.push("Hard total budget was not provided");
  if (!/tonight|today|\d{4}-\d{2}-\d{2}/i.test(text)) {
    uncertainties.push("Check-in date defaults to the reference date and needs confirmation");
  }

  const cancelled = /cancel(?:led|ed|lation)/i.test(text);
  const missed = /missed (?:our |a )?connection/i.test(text);
  const disruptionSummary = cancelled
    ? "Flight cancelled"
    : missed
      ? "Missed connection"
      : "Urgent lodging needed after a travel disruption";

  const originIata = /\bJFK\b/i.test(text) ? "JFK" : undefined;
  const destinationIata = destinationIataFrom(text);
  const assistanceScope = assistanceScopeFrom(text);

  const candidate: TripRequest = {
    mode: input.mode,
    currentLocation: /\bJFK\b/i.test(text) ? "JFK Airport, New York" : undefined,
    targetArea: targetAreaFrom(text),
    checkin,
    checkout,
    adults,
    children,
    rooms,
    currency: "USD",
    hardBudgetTotal,
    mustHaves,
    preferences,
    uncertainties,
    ...(input.mode === "recovery"
      ? {
          disruption: {
            summary: disruptionSummary,
            urgency: /tonight|today|cancel|missed/i.test(text) ? ("same-day" as const) : ("flexible" as const),
          },
        }
      : { event: { venue: targetAreaFrom(text) } }),
    // scheduledDate is deliberately omitted — this extractor has no way to
    // parse an actual stated flight date from free text, and defaulting it
    // to the checkout date would invent a fact the traveler never gave,
    // silently driving a flight-recovery search for the wrong date. The
    // traveler can fill it in directly via the step-2 flight-details field.
    ...(originIata ? { flight: { originIata, destinationIata } } : {}),
    ...(assistanceScope ? { assistanceScope } : {}),
  };

  const tripRequest = tripRequestSchema.parse(candidate);
  const missingFields = [
    ...(hardBudgetTotal ? [] : ["hardBudgetTotal"]),
    ...(!/tonight|today|\d{4}-\d{2}-\d{2}/i.test(text) ? ["checkin"] : []),
  ];

  return { tripRequest, missingFields, extractionMode: "demo" };
}
