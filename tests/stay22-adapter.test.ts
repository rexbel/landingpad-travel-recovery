import { afterEach, describe, expect, it, vi } from "vitest";
import { searchStays } from "@/lib/stay22";

const originalKey = process.env.STAY22_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.STAY22_API_KEY;
  else process.env.STAY22_API_KEY = originalKey;
  vi.restoreAllMocks();
});

function responseBody() {
  return {
    meta: { page: 1, pageSize: 10, total: 1, hasMore: false, currency: "USD", nights: 1 },
    results: [
      {
        id: "hotel-1",
        name: "JFK Test Hotel",
        type: "Hotel",
        url: "https://www.stay22.com/allez/roam/hotel-1",
        suppliers: {
          booking: {
            id: "book-1",
            link: "https://www.stay22.com/allez/booking/book-1",
            price: { total: 275 },
          },
          expedia: {
            id: "exp-1",
            link: "https://www.stay22.com/allez/expedia/exp-1",
            price: { total: 250 },
          },
          hotelscom: {
            id: "hotels-1",
            link: "https://www.stay22.com/allez/hotelscom/hotels-1",
            price: null,
          },
        },
        location: { coordinates: { lat: 40.64, lng: -73.78 } },
      },
    ],
  };
}

function input(address: string) {
  return {
    address,
    checkin: "2026-08-09",
    checkout: "2026-08-10",
    adults: 2,
    children: 0,
    rooms: 1,
    currency: "USD",
  };
}

describe("Stay22 adapter", () => {
  it("normalizes every quoted supplier and excludes unknown quotes", async () => {
    delete process.env.STAY22_API_KEY;
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(responseBody()));

    const result = await searchStays(input("JFK live normalize"), { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("stay22-live");
    expect(result.options).toHaveLength(2);
    expect(result.options.map((option) => option.supplier)).toEqual(["expedia", "booking"]);
    expect(result.options[0]).toMatchObject({
      totalPrice: 250,
      currency: "USD",
      bookingUrl: "https://www.stay22.com/allez/expedia/exp-1",
      sourceMode: "stay22-live",
    });
    const request = fetchImpl.mock.calls[0][1];
    expect(request?.headers).toBeUndefined();
  });

  it("forceDemo skips the network attempt entirely and returns undecorated demo data", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("must not be called in forceDemo mode");
    });

    const result = await searchStays(input("JFK demo mode"), { fetchImpl, forceDemo: true });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("demo");
    expect(result.warning).toBeUndefined();
    expect(result.options.every((option) => option.sourceMode === "demo")).toBe(true);
  });

  it("sends the server key only in the Stay22 header", async () => {
    process.env.STAY22_API_KEY = "private-test-key";
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(responseBody()));

    await searchStays(input("JFK keyed mode"), { fetchImpl });

    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).not.toContain("private-test-key");
    expect(request?.headers).toEqual({ "X-API-KEY": "private-test-key" });
  });

  it("briefly deduplicates identical in-flight searches", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(responseBody()));
    const searchInput = input("JFK dedupe");

    const [first, second] = await Promise.all([
      searchStays(searchInput, { fetchImpl }),
      searchStays(searchInput, { fetchImpl }),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it("returns validated demo options with a typed warning for malformed data", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ results: "not-an-array" }));

    const result = await searchStays(input("JFK malformed"), { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("demo");
    expect(result.options).toHaveLength(3);
    expect(result.options.every((option) => option.sourceMode === "demo")).toBe(true);
    expect(result.warning?.code).toBe("STAY22_MALFORMED_RESPONSE");
  });

  it("keeps a valid empty live response empty rather than inventing availability", async () => {
    const body = responseBody();
    body.meta.total = 0;
    body.results = [];
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(body));

    const result = await searchStays(input("JFK empty"), { fetchImpl });

    expect(result).toEqual({ ok: true, options: [], mode: "stay22-live" });
  });

  it("returns a redacted typed rate-limit failure when fallback is disabled", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ message: "secret provider diagnostic" }, { status: 429 }),
    );

    const result = await searchStays(input("JFK quota"), { fetchImpl, fallbackToDemo: false });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "STAY22_RATE_LIMITED",
        message: "Stay search is temporarily rate limited.",
        retryable: true,
      },
      fallbackAvailable: true,
    });
    expect(JSON.stringify(result)).not.toContain("secret provider diagnostic");
  });

  it("falls back after a timeout without exposing the thrown error", async () => {
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("sensitive timeout detail"), { name: "AbortError" })),
        );
      }),
    ) as typeof fetch;

    const result = await searchStays(input("JFK timeout"), { fetchImpl, timeoutMs: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("demo");
    expect(result.warning?.code).toBe("STAY22_TIMEOUT");
    expect(JSON.stringify(result)).not.toContain("sensitive timeout detail");
  });
});
