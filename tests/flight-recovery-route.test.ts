import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as flightRecoveryContext } from "@/app/api/flight-recovery/context/route";
import { __resetAeroXplorerTokenCacheForTests } from "@/lib/aeroxplorer/token";

afterEach(() => {
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
  delete process.env.AEROXPLORER_API_KEY;
  delete process.env.AEROXPLORER_API_SECRET;
  delete process.env.TAVILY_API_KEY;
});

function jsonRequest(value: unknown): Request {
  return new Request("http://localhost/api/flight-recovery/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("POST /api/flight-recovery/context", () => {
  it("rejects a malformed IATA code", async () => {
    const response = await flightRecoveryContext(jsonRequest({ flight: { originIata: "NOTVALID" } }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing body", async () => {
    const response = await flightRecoveryContext(jsonRequest({}));
    expect(response.status).toBe(400);
  });

  it("degrades to unavailable without any provider configured, never throwing", async () => {
    const response = await flightRecoveryContext(
      jsonRequest({ flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.mode).toBe("unavailable");
  });

  it("ignores any credential or token fields sent from the browser", async () => {
    const response = await flightRecoveryContext(
      jsonRequest({
        flight: { originIata: "JFK", scheduledDate: "2026-08-10" },
        AEROXPLORER_API_KEY: "smuggled",
        TAVILY_API_KEY: "smuggled-too",
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(payload)).not.toContain("smuggled");
  });

  it("returns normalized options with no raw provider response leaked", async () => {
    process.env.TAVILY_API_KEY = "t";
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (url: string | URL) => {
      if (url.toString().includes("api.tavily.com")) {
        return Response.json({
          results: [{ content: "Search flights JFK to ORD", url: "https://example.com/1", secretUpstreamField: "should-not-leak" }],
        });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as typeof fetch;

    try {
      const response = await flightRecoveryContext(
        jsonRequest({ flight: { originIata: "JFK", destinationIata: "ORD", scheduledDate: "2026-08-10" } }),
      );
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload.data.options).toHaveLength(1);
      expect(JSON.stringify(payload)).not.toContain("secretUpstreamField");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
