import { afterEach, describe, expect, it, vi } from "vitest";
import { getFlightRecoveryContext } from "@/lib/flight-recovery";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";

const TOKEN_URL = "https://api.aeroxplorer.com/v1/token";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
  delete process.env.AEROXPLORER_API_KEY;
  delete process.env.AEROXPLORER_API_SECRET;
  delete process.env.TAVILY_API_KEY;
});

describe("getFlightRecoveryContext", () => {
  it("returns unavailable, with no fabricated data, when no origin/date is present", async () => {
    const result = await getFlightRecoveryContext({ flight: undefined }, { fetchImpl: vi.fn() });
    expect(result.mode).toBe("unavailable");
    expect(result.options).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it("combines Tavily links and AeroXplorer historical context when both succeed", async () => {
    process.env.TAVILY_API_KEY = "t";
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === TOKEN_URL) return Response.json({ bearer: "tok", expiration: 9_999_999_999 });
      if (target.includes("api.tavily.com")) {
        return Response.json({ results: [{ content: "Search flights JFK to ORD", url: "https://example.com/1" }] });
      }
      if (target.includes("/v1/travel/otp")) return Response.json({ results: [{ cancelled: false, diverted: false }] });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getFlightRecoveryContext(
      { flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } },
      { fetchImpl },
    );

    expect(result.mode).toBe("flight-recovery");
    expect(result.options).toHaveLength(1);
    expect(result.historicalContext?.observations).toBe(1);
    expect(result.evidence.map((e) => e.provider).sort()).toEqual(["AeroXplorer", "Tavily"]);
  });

  it("one provider failing does not collapse the other's results", async () => {
    process.env.TAVILY_API_KEY = "t";
    // AeroXplorer intentionally left unconfigured.
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target.includes("api.tavily.com")) {
        return Response.json({ results: [{ content: "Search flights JFK to ORD", url: "https://example.com/1" }] });
      }
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getFlightRecoveryContext(
      { flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } },
      { fetchImpl },
    );

    expect(result.mode).toBe("flight-recovery");
    expect(result.options).toHaveLength(1);
    expect(result.historicalContext).toBeUndefined();
  });

  it("degrades to unavailable, not a throw, when both providers fail", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 500 }));

    const result = await getFlightRecoveryContext(
      { flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } },
      { fetchImpl },
    );

    expect(result.mode).toBe("unavailable");
    expect(result.options).toEqual([]);
  });

  it("never claims a flight is bookable, cancelled, or has live status anywhere in its output", async () => {
    process.env.TAVILY_API_KEY = "t";
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      const target = url.toString();
      if (target === TOKEN_URL) return Response.json({ bearer: "tok", expiration: 9_999_999_999 });
      if (target.includes("api.tavily.com")) {
        return Response.json({ results: [{ content: "Search flights JFK to ORD", url: "https://example.com/1" }] });
      }
      if (target.includes("/v1/travel/otp")) return Response.json({ results: [{ cancelled: false }] });
      throw new Error(`Unexpected request to ${target}`);
    });

    const result = await getFlightRecoveryContext(
      { flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } },
      { fetchImpl },
    );

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("bookable");
    expect(serialized).not.toContain("confirmed cancellation");
    expect(serialized).not.toMatch(/\blive status\b/);
  });
});
