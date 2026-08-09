import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAlternateFlights } from "@/lib/flight-recovery/search";

const originalKey = process.env.TAVILY_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalKey;
  vi.restoreAllMocks();
});

function tavilyResponse(results: Array<{ content: string; url: string }>) {
  return Response.json({ results });
}

describe("searchAlternateFlights", () => {
  it("returns bounded, labeled search links — never a bookable flight", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      tavilyResponse([
        { content: "Search American Airlines flights JFK to ORD", url: "https://example.com/aa" },
        { content: "Search United flights JFK to ORD", url: "https://example.com/ua" },
        { content: "Search Delta flights JFK to ORD", url: "https://example.com/dl" },
        { content: "A fourth result that should be dropped", url: "https://example.com/extra" },
      ]),
    );

    const result = await searchAlternateFlights("JFK", "ORD", "2026-08-10", { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options).toHaveLength(3);
    expect(result.options[0]).toEqual({
      label: "Search American Airlines flights JFK to ORD",
      url: "https://example.com/aa",
      sourceMode: "tavily-web",
    });
  });

  it("includes the route and date in the query without inventing flight data", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    const fetchImpl = vi.fn<typeof fetch>(async () => tavilyResponse([]));

    await searchAlternateFlights("JFK", "ORD", "2026-08-10", { fetchImpl });

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain("JFK to ORD");
    expect(body.query).toContain("2026-08-10");
  });

  it("truncates an overly long claim into a readable label", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    const longClaim = "x".repeat(200);
    const fetchImpl = vi.fn<typeof fetch>(async () => tavilyResponse([{ content: longClaim, url: "https://example.com/x" }]));

    const result = await searchAlternateFlights("JFK", undefined, "2026-08-10", { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options[0].label.length).toBeLessThan(100);
    expect(result.options[0].label.endsWith("…")).toBe(true);
  });

  it("fails safely when Tavily is not configured, without throwing", async () => {
    delete process.env.TAVILY_API_KEY;
    const fetchImpl = vi.fn<typeof fetch>(async () => tavilyResponse([]));

    const result = await searchAlternateFlights("JFK", "ORD", "2026-08-10", { fetchImpl });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
