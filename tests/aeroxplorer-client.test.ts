import { afterEach, describe, expect, it, vi } from "vitest";
import { getAirportByIata, getExactFlightHistory } from "@/lib/aeroxplorer/client";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
});

const TOKEN_URL = "https://api.aeroxplorer.com/v1/token";

function tokenResponse() {
  return Response.json({ bearer: "opaque-test-token", expiration: 9_999_999_999 });
}

function airportResponse() {
  return Response.json({
    results: [{ iata: "JFK", name: "John F. Kennedy International", location: "New York", lat: 40.64, lng: -73.78 }],
  });
}

function otpResponse(records: unknown[] = []) {
  return Response.json({ results: records });
}

describe("getAirportByIata", () => {
  it("authenticates with the X-Authorization header and requests exactly one result", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return airportResponse();
    });

    const result = await getAirportByIata("jfk", { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results[0]).toMatchObject({ iata: "JFK", name: "John F. Kennedy International" });

    const airportCall = fetchImpl.mock.calls.find(([url]) => url.toString().includes("/v1/airports"));
    expect(airportCall).toBeDefined();
    const [url, init] = airportCall!;
    expect(new Headers(init?.headers).get("X-Authorization")).toBe("Bearer opaque-test-token");
    const params = new URL(url as string | URL).searchParams;
    expect(params.get("iata")).toBe("jfk");
    expect(params.get("results")).toBe("1");
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("accepts lat/lng as numeric strings, matching the live API's actual response shape", async () => {
    // Confirmed against the real AeroXplorer API: lat/lng come back as
    // strings (e.g. "40.634638"), not JSON numbers, even though the OpenAPI
    // spec implies numbers. A plain z.number() rejected every real airport
    // response outright — this is the exact shape that broke in production.
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return Response.json({
        results: [
          {
            id: "2",
            iata: "JFK",
            icao: "KJFK",
            name: "John F. Kennedy International Airport",
            location: "Queens, New York, United States",
            description: "",
            lat: "40.634638",
            lng: "-73.781603",
          },
        ],
      });
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results[0]).toMatchObject({ iata: "JFK", lat: 40.634638, lng: -73.781603 });
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("fails safely on a malformed airport response", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return Response.json({ unexpected: true });
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: { code: "AEROXPLORER_RESPONSE_SCHEMA_INVALID", message: "AeroXplorer airport response was not in the expected shape.", retryable: false },
    });
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("clears the token and retries the request exactly once after a 401, then succeeds", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    let tokenRequests = 0;
    let airportAttempts = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
      if (url.toString() === TOKEN_URL) {
        tokenRequests += 1;
        return tokenResponse();
      }
      airportAttempts += 1;
      const auth = new Headers(init?.headers).get("X-Authorization");
      if (airportAttempts === 1) {
        expect(auth).toBe("Bearer opaque-test-token");
        return new Response(null, { status: 401 });
      }
      return airportResponse();
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result.ok).toBe(true);
    expect(airportAttempts).toBe(2);
    expect(tokenRequests).toBe(2); // one initial + one after invalidation
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("does not retry a second time if the retried request also 401s", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    let airportAttempts = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status: 401 });
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result.ok).toBe(false);
    expect(airportAttempts).toBe(2);
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it.each([403, 404, 500, 503])("does not retry on a %d, returning a typed failure", async (status) => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    let airportAttempts = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status });
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result.ok).toBe(false);
    expect(airportAttempts).toBe(1);
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("returns a distinct rate-limited failure on 429 without retrying", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    let airportAttempts = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status: 429 });
    });

    const result = await getAirportByIata("JFK", { fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: { code: "AEROXPLORER_RATE_LIMITED", message: "AeroXplorer is rate limited.", retryable: false },
    });
    expect(airportAttempts).toBe(1);
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });
});

describe("getExactFlightHistory", () => {
  it("constructs the query with airline, flight number, origin, and date filters, bounded to 100 results", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return otpResponse([{ cancelled: false, arrdelayminutes: 5 }]);
    });

    await getExactFlightHistory(
      { airlineCode: "AA", flightNumber: "100", originIata: "JFK", destinationIata: "LAX", scheduledDate: "2026-08-09" },
      { fetchImpl },
    );

    const otpCall = fetchImpl.mock.calls.find(([url]) => url.toString().includes("/v1/travel/otp"));
    const params = new URL(otpCall![0] as string | URL).searchParams;
    expect(params.get("airline_code")).toBe("AA");
    expect(params.get("flight_num")).toBe("100");
    expect(params.get("origin_code")).toBe("JFK");
    expect(params.get("dest_code")).toBe("LAX");
    expect(params.get("date")).toBe("2026-08-09");
    expect(params.get("year")).toBe("2026");
    expect(params.get("month")).toBe("8");
    expect(params.get("results")).toBe("100");
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });

  it("fails safely on a malformed OTP response", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return Response.json({ nope: true });
    });

    const result = await getExactFlightHistory(
      { airlineCode: "AA", flightNumber: "100", originIata: "JFK", scheduledDate: "2026-08-09" },
      { fetchImpl },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AEROXPLORER_RESPONSE_SCHEMA_INVALID");
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
  });
});
