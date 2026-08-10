import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeAirport, normalizeHistoricalFlight, getAviationContext } from "@/lib/aeroxplorer/normalize";
import { buildExactFlightHistoryQuery } from "@/lib/aeroxplorer/otp-eligibility";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";
import type { ExactFlightHistoryQuery } from "@/lib/aeroxplorer/client";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
  delete process.env.AEROXPLORER_API_KEY;
  delete process.env.AEROXPLORER_API_SECRET;
});

const query: ExactFlightHistoryQuery = {
  airlineCode: "AA",
  flightNumber: "100",
  originIata: "JFK",
  destinationIata: "LAX",
  scheduledDate: "2026-08-09",
};

describe("normalizeAirport", () => {
  it("returns undefined for an empty result set rather than inventing a placeholder", () => {
    expect(normalizeAirport({ results: [] })).toBeUndefined();
  });

  it("normalizes the first result's identity fields", () => {
    const result = normalizeAirport({
      results: [{ iata: "jfk", name: "JFK Intl", location: "Queens, NY", lat: 40.6, lng: -73.8 }],
    });
    expect(result).toEqual({ iata: "jfk", name: "JFK Intl", city: "Queens, NY", latitude: 40.6, longitude: -73.8 });
  });
});

describe("normalizeHistoricalFlight", () => {
  it("returns undefined when there are zero observations rather than a zeroed-out rate", () => {
    expect(normalizeHistoricalFlight({ results: [] }, query)).toBeUndefined();
  });

  it("computes each rate with its own explicit, comparable denominator", () => {
    const result = normalizeHistoricalFlight(
      {
        results: [
          { cancelled: true, diverted: false, arrdelayminutes: 20 },
          { cancelled: false, diverted: false, arrdelayminutes: 5 },
          { cancelled: false, arrdelayminutes: undefined }, // no delay data — excluded from delayRate's denominator
        ],
      },
      query,
    );
    expect(result?.observations).toBe(3);
    expect(result?.cancellationRate).toBeCloseTo(1 / 3);
    expect(result?.diversionRate).toBeCloseTo(0 / 2); // only 2 records report a diverted status
    expect(result?.delayRate).toBeCloseTo(1 / 2); // only 2 records report a delay value
  });

  it("handles a mix of boolean and 0/1 status encodings identically", () => {
    const result = normalizeHistoricalFlight({ results: [{ cancelled: 1 }, { cancelled: 0 }] }, query);
    expect(result?.cancellationRate).toBeCloseTo(0.5);
  });

  it("treats a null arrdelayminutes as no delay data, not zero delay", () => {
    const result = normalizeHistoricalFlight({ results: [{ cancelled: false, arrdelayminutes: null }] }, query);
    expect(result?.delayRate).toBeUndefined();
  });

  it("omits a rate entirely when no record reports that status, rather than guessing", () => {
    const result = normalizeHistoricalFlight({ results: [{ arrdelayminutes: 30 }] }, query);
    expect(result?.cancellationRate).toBeUndefined();
    expect(result?.diversionRate).toBeUndefined();
    expect(result?.delayRate).toBe(1);
  });

  it("keeps every rate bounded between 0 and 1", () => {
    const result = normalizeHistoricalFlight(
      { results: [{ cancelled: true }, { cancelled: true }, { cancelled: true }] },
      query,
    );
    expect(result?.cancellationRate).toBeLessThanOrEqual(1);
    expect(result?.cancellationRate).toBeGreaterThanOrEqual(0);
  });

  it("carries the query's flight identity and a human-readable observation window", () => {
    const result = normalizeHistoricalFlight({ results: [{ cancelled: false }] }, query);
    expect(result).toMatchObject({ airlineCode: "AA", flightNumber: "100", originIata: "JFK", destinationIata: "LAX" });
    expect(result?.observationWindow).toBe("August 2026");
  });
});

describe("buildExactFlightHistoryQuery (OTP eligibility)", () => {
  it("returns null when flight details are entirely absent — airport-only, matching the canonical JFK demo", () => {
    expect(buildExactFlightHistoryQuery(undefined)).toBeNull();
  });

  it("returns null when only an airport-level hint is present", () => {
    expect(buildExactFlightHistoryQuery({ originIata: "JFK" })).toBeNull();
  });

  it.each([
    ["airlineCode", { flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" }],
    ["flightNumber", { airlineCode: "AA", originIata: "JFK", scheduledDate: "2026-08-09" }],
    ["originIata", { airlineCode: "AA", flightNumber: "100", scheduledDate: "2026-08-09" }],
    ["scheduledDate", { airlineCode: "AA", flightNumber: "100", originIata: "JFK" }],
  ])("returns null when %s is missing", (_field, partial) => {
    expect(buildExactFlightHistoryQuery(partial)).toBeNull();
  });

  it("builds a query only when airline, flight number, origin, and date are all present", () => {
    expect(
      buildExactFlightHistoryQuery({ airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" }),
    ).toEqual({ airlineCode: "AA", flightNumber: "100", originIata: "JFK", destinationIata: undefined, scheduledDate: "2026-08-09" });
  });
});

describe("getAviationContext orchestration", () => {
  it("returns unavailable, without any airport fabrication, when credentials are absent", async () => {
    const result = await getAviationContext({ targetArea: "JFK Airport, New York" }, { fetchImpl: vi.fn() });
    expect(result.mode).toBe("unavailable");
    expect(result.airport).toBeUndefined();
    expect(result.evidence).toEqual([]);
  });

  it("resolves airport metadata only for the canonical 'flight out of JFK was cancelled' style request — no OTP call made", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      if (target.includes("/v1/airports")) {
        return Response.json({ results: [{ iata: "JFK", name: "JFK Intl" }] });
      }
      throw new Error(`Unexpected request to ${target} — OTP must not be called without flight details`);
    });

    const result = await getAviationContext(
      { currentLocation: "John F. Kennedy International Airport (JFK)", targetArea: "JFK Airport, Queens, New York" },
      { fetchImpl },
    );

    expect(result.mode).toBe("airport-metadata-only");
    expect(result.airport).toMatchObject({ iata: "JFK" });
    expect(result.historicalFlight).toBeUndefined();
    expect(fetchImpl.mock.calls.some(([url]) => url.toString().includes("/v1/travel/otp"))).toBe(false);
  });

  it("fetches historical context only when flight details are exact and sufficient", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      if (target.includes("/v1/airports")) return Response.json({ results: [{ iata: "JFK", name: "JFK Intl" }] });
      if (target.includes("/v1/travel/otp")) return Response.json({ results: [{ cancelled: true }, { cancelled: false }] });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getAviationContext(
      {
        targetArea: "JFK Airport, New York",
        flight: { airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" },
      },
      { fetchImpl },
    );

    expect(result.mode).toBe("aeroxplorer-historical");
    expect(result.historicalFlight?.observations).toBe(2);
    expect(result.evidence).toEqual([
      { provider: "AeroXplorer", classification: "historical", label: "Historical aviation data", retrievedAt: expect.any(String) },
    ]);
  });

  it("reports explicitly when zero historical observations were found, rather than a fabricated rate", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      if (target.includes("/v1/airports")) return Response.json({ results: [{ iata: "JFK", name: "JFK Intl" }] });
      if (target.includes("/v1/travel/otp")) return Response.json({ results: [] });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getAviationContext(
      {
        targetArea: "JFK Airport, New York",
        flight: { airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" },
      },
      { fetchImpl },
    );

    expect(result.historicalFlight).toBeUndefined();
    expect(result.warnings).toContain("No matching historical observations were found for this flight.");
  });

  it("discards a malformed OTP result but keeps airport data", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      if (target.includes("/v1/airports")) return Response.json({ results: [{ iata: "JFK", name: "JFK Intl" }] });
      if (target.includes("/v1/travel/otp")) return Response.json({ nonsense: true });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getAviationContext(
      {
        targetArea: "JFK Airport, New York",
        flight: { airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" },
      },
      { fetchImpl },
    );

    expect(result.mode).toBe("airport-metadata-only");
    expect(result.airport).toMatchObject({ iata: "JFK" });
    expect(result.historicalFlight).toBeUndefined();
  });

  it("never produces a claim resembling live flight status anywhere in its output", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      if (target.includes("/v1/airports")) return Response.json({ results: [{ iata: "JFK", name: "JFK Intl" }] });
      if (target.includes("/v1/travel/otp")) return Response.json({ results: [{ cancelled: true }] });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getAviationContext(
      {
        targetArea: "JFK Airport, New York",
        flight: { airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" },
      },
      { fetchImpl },
    );

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("live");
    expect(serialized).not.toContain("current flight status");
    expect(serialized).not.toContain("confirmed cancellation");
    expect(result.evidence[0]?.classification).toBe("historical");
  });
});
