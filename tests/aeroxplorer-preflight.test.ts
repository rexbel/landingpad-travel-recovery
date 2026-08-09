import { describe, expect, it, vi } from "vitest";
import { checkAeroXplorer, requestAirport, requestToken, statusClass } from "../scripts/aeroxplorer-preflight.mjs";

const TOKEN_URL = "https://api.aeroxplorer.com/v1/token";
const AIRPORT_URL_PREFIX = "https://api.aeroxplorer.com/v1/airports";

function tokenResponse(overrides: Record<string, unknown> = {}) {
  return Response.json({ bearer: "opaque-token-value", expiration: 9_999_999_999, ...overrides });
}

function airportResponse(overrides: Record<string, unknown> = {}) {
  return Response.json({
    amt: 1,
    time: 1_700_000_000,
    results: [{ id: "1", iata: "JFK", icao: "KJFK", name: "John F. Kennedy International", location: "New York", description: "", lat: 40.6, lng: -73.8 }],
    ...overrides,
  });
}

describe("statusClass", () => {
  it("collapses an HTTP status to its class", () => {
    expect(statusClass(200)).toBe("2xx");
    expect(statusClass(401)).toBe("4xx");
    expect(statusClass(503)).toBe("5xx");
  });
});

describe("requestToken", () => {
  it("sends credentials only through the X-User header, never as query data", async () => {
    const fetchImpl = vi.fn(async () => tokenResponse()) as unknown as typeof fetch;
    const result = await requestToken({ apiKey: "key-value", apiSecret: "secret-value", fetchImpl });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token).toBe("opaque-token-value");
      expect(result.expiration).toBe(9_999_999_999);
    }
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-User")).toBe("key-value:secret-value");
  });

  it("fails safely on a malformed token response without throwing", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ unexpected: true })) as unknown as typeof fetch;
    const result = await requestToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.ok || result.detail).toContain("schema unexpected");
  });

  it("fails safely on an invalid-credential (401) response", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    const result = await requestToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.ok || result.detail).toContain("4xx");
  });

  it("fails safely on a timeout", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    }) as unknown as typeof fetch;
    const result = await requestToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.ok || result.detail).toContain("timed out");
  });
});

describe("checkAeroXplorer", () => {
  it("passes end to end with a valid token and a JFK response, using the primary header", async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: url.toString(), headers: new Headers(init?.headers) });
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return airportResponse();
    }) as unknown as typeof fetch;

    const onToken = vi.fn();
    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl, onToken });

    expect(result.status).toBe("ready");
    expect(result.headerUsed).toBe("X-Authorization");
    expect(onToken).toHaveBeenCalledWith("opaque-token-value");

    const airportCall = calls.find((c) => c.url.startsWith(AIRPORT_URL_PREFIX));
    expect(airportCall?.headers.get("X-Authorization")).toBe("Bearer opaque-token-value");
    expect(new URL(airportCall!.url).searchParams.get("iata")).toBe("JFK");
    expect(new URL(airportCall!.url).searchParams.get("results")).toBe("1");
  });

  it("retries exactly once with the documented alternate header on a 401, then succeeds", async () => {
    let airportAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      const headers = new Headers(init?.headers);
      if (headers.has("X-Authorization")) return new Response(null, { status: 401 });
      return airportResponse();
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(airportAttempts).toBe(2);
    expect(result.status).toBe("ready");
    expect(result.headerUsed).toBe("Authorization (documented alternate)");
  });

  it("does not retry more than once even if the alternate header also fails", async () => {
    let airportAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status: 401 });
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(airportAttempts).toBe(2);
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("authentication-header mismatch");
  });

  it("does not retry on a rate-limit (429) failure", async () => {
    let airportAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status: 429 });
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(airportAttempts).toBe(1);
    expect(result.status).toBe("failed");
  });

  it("does not retry on a server (500) failure", async () => {
    let airportAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      airportAttempts += 1;
      return new Response(null, { status: 500 });
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(airportAttempts).toBe(1);
    expect(result.status).toBe("failed");
  });

  it("fails safely on a malformed airport response", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return Response.json({ results: [{ iata: "LGA" }] });
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl });
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("unexpected");
  });

  it("never calls onToken and short-circuits when the token request itself fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    const onToken = vi.fn();
    const result = await checkAeroXplorer({ apiKey: "k", apiSecret: "s", fetchImpl, onToken });

    expect(result.status).toBe("failed");
    expect(onToken).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("never exposes the token, key, secret, or full response body in its output", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (url.toString() === TOKEN_URL) return tokenResponse();
      return airportResponse();
    }) as unknown as typeof fetch;

    const result = await checkAeroXplorer({ apiKey: "super-secret-key", apiSecret: "super-secret-secret", fetchImpl });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("opaque-token-value");
    expect(serialized).not.toContain("super-secret-key");
    expect(serialized).not.toContain("super-secret-secret");
    expect(serialized).not.toContain("John F. Kennedy International");
  });
});

describe("requestAirport", () => {
  it("queries only the safe JFK identifier, nothing else", async () => {
    const fetchImpl = vi.fn(async () => airportResponse()) as unknown as typeof fetch;
    await requestAirport({ token: "t", headerName: "X-Authorization", fetchImpl });
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [URL];
    expect(Array.from(new URL(url).searchParams.keys())).toEqual(["iata", "results"]);
  });
});
