import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouteHistoricalContext } from "@/lib/flight-recovery/context";
import { buildRouteHistoryQuery } from "@/lib/aeroxplorer/otp-eligibility";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
  delete process.env.AEROXPLORER_API_KEY;
  delete process.env.AEROXPLORER_API_SECRET;
});

describe("buildRouteHistoryQuery", () => {
  it("returns null without an origin and date — never queries on partial data", () => {
    expect(buildRouteHistoryQuery(undefined)).toBeNull();
    expect(buildRouteHistoryQuery({ originIata: "JFK" })).toBeNull();
  });

  it("does not require an airline or flight number, unlike the exact-flight query", () => {
    expect(buildRouteHistoryQuery({ originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" })).toEqual({
      originIata: "JFK",
      destinationIata: "ORD",
      scheduledDate: "2026-08-10",
    });
  });

  it("works with only an origin and date — destination is optional", () => {
    expect(buildRouteHistoryQuery({ originIata: "JFK", scheduledDate: "2026-08-10" })).toEqual({
      originIata: "JFK",
      destinationIata: undefined,
      scheduledDate: "2026-08-10",
    });
  });
});

describe("getRouteHistoricalContext", () => {
  const TOKEN_URL = "https://api.aeroxplorer.com/v1/token";

  it("returns undefined when there isn't enough detail to query", async () => {
    const result = await getRouteHistoricalContext(undefined, { fetchImpl: vi.fn() });
    expect(result).toBeUndefined();
  });

  it("computes an on-time rate from cancellation, diversion, and delay status with an explicit denominator", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      return Response.json({
        results: [
          { cancelled: false, diverted: false, arrdelayminutes: 5 }, // on time
          { cancelled: true, diverted: false, arrdelayminutes: 0 }, // cancelled
          { cancelled: false, diverted: false, arrdelayminutes: 40 }, // delayed
        ],
      });
    });

    const result = await getRouteHistoricalContext(
      { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" },
      { fetchImpl },
    );

    expect(result?.observations).toBe(3);
    expect(result?.onTimeRate).toBeCloseTo(1 / 3);
    expect(result?.originIata).toBe("JFK");
    expect(result?.destinationIata).toBe("ORD");
  });

  it("returns undefined when there are zero historical records, rather than a fabricated rate", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return Response.json({ bearer: "t", expiration: 9_999_999_999 });
      return Response.json({ results: [] });
    });

    const result = await getRouteHistoricalContext(
      { originIata: "JFK", scheduledDate: "2026-08-10" },
      { fetchImpl },
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined (not a throw) when AeroXplorer is unavailable", async () => {
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
    const result = await getRouteHistoricalContext(
      { originIata: "JFK", scheduledDate: "2026-08-10" },
      { fetchImpl: vi.fn() },
    );
    expect(result).toBeUndefined();
  });
});
