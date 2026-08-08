import { afterEach, describe, expect, it, vi } from "vitest";

const searchStays = vi.fn();
vi.mock("@/lib/stay22", () => ({ searchStays }));

afterEach(() => searchStays.mockReset());

describe("GET /api/stays/search", () => {
  it("rejects an invalid stay window before calling Stay22", async () => {
    const { GET } = await import("@/app/api/stays/search/route");
    const response = await GET(
      new Request("http://localhost/api/stays/search?address=JFK&checkin=2026-08-10&checkout=2026-08-09"),
    );

    expect(response.status).toBe(400);
    expect(searchStays).not.toHaveBeenCalled();
  });

  it("returns the canonical envelope and preserves demo warnings", async () => {
    searchStays.mockResolvedValue({
      ok: true,
      options: [],
      mode: "demo",
      warning: { code: "STAY22_TIMEOUT", message: "Live stay search timed out.", retryable: true },
    });
    const { GET } = await import("@/app/api/stays/search/route");
    const response = await GET(
      new Request(
        "http://localhost/api/stays/search?address=JFK&checkin=2026-08-09&checkout=2026-08-10&adults=2&rooms=1",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: [], mode: "demo" });
  });

  it("accepts the canonical TripRequest targetArea name", async () => {
    searchStays.mockResolvedValue({ ok: true, options: [], mode: "stay22-live" });
    const { GET } = await import("@/app/api/stays/search/route");
    const response = await GET(
      new Request(
        "http://localhost/api/stays/search?targetArea=JFK%20Airport&checkin=2026-08-09&checkout=2026-08-10",
      ),
    );

    expect(response.status).toBe(200);
    expect(searchStays).toHaveBeenCalledWith(expect.objectContaining({ address: "JFK Airport" }));
  });
});
