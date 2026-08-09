import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as aviationContext } from "@/app/api/aviation/context/route";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
  delete process.env.AEROXPLORER_API_KEY;
  delete process.env.AEROXPLORER_API_SECRET;
});

function jsonRequest(value: unknown): Request {
  return new Request("http://localhost/api/aviation/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("POST /api/aviation/context", () => {
  it("rejects a malformed IATA-shaped flight object", async () => {
    const response = await aviationContext(
      jsonRequest({ targetArea: "JFK Airport, New York", flight: { originIata: "NOTANIATA" } }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "The request body is invalid.", retryable: false },
      fallbackAvailable: false,
    });
  });

  it("rejects an oversized targetArea payload", async () => {
    const response = await aviationContext(jsonRequest({ targetArea: "x".repeat(500) }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing targetArea", async () => {
    const response = await aviationContext(jsonRequest({}));
    expect(response.status).toBe(400);
  });

  it("ignores any credential or token fields sent from the browser", async () => {
    // No credentials configured server-side, so even if a client tried to smuggle
    // them in, the route must still resolve to "unavailable" rather than using them.
    const response = await aviationContext(
      jsonRequest({
        targetArea: "JFK Airport, New York",
        AEROXPLORER_API_KEY: "smuggled-key",
        token: "smuggled-token",
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.mode).toBe("unavailable");
    expect(JSON.stringify(payload)).not.toContain("smuggled");
  });

  it("returns the normalized aviation contract with no raw provider response leaked", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (url: string | URL) => {
      const target = url.toString();
      if (target === "https://api.aeroxplorer.com/v1/token") {
        return Response.json({ bearer: "opaque-test-token", expiration: 9_999_999_999 });
      }
      if (target.includes("/v1/airports")) {
        return Response.json({ results: [{ iata: "JFK", name: "JFK Intl", secretUpstreamField: "should-not-leak" }] });
      }
      throw new Error(`Unexpected fetch to ${target}`);
    }) as typeof fetch;

    try {
      const response = await aviationContext(jsonRequest({ targetArea: "JFK Airport, New York" }));
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.airport).toMatchObject({ iata: "JFK", name: "JFK Intl" });
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain("secretUpstreamField");
      expect(serialized).not.toContain("opaque-test-token");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("degrades gracefully to unavailable when AeroXplorer is unreachable, without throwing", async () => {
    process.env.AEROXPLORER_API_KEY = "k";
    process.env.AEROXPLORER_API_SECRET = "s";
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;

    try {
      const response = await aviationContext(jsonRequest({ targetArea: "JFK Airport, New York" }));
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.data.mode).toBe("unavailable");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
