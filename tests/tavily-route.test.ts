import { afterEach, describe, expect, it, vi } from "vitest";

const searchLocalContext = vi.fn();
vi.mock("@/lib/tavily", () => ({ searchLocalContext }));

afterEach(() => searchLocalContext.mockReset());

describe("POST /api/context/search", () => {
  it("rejects invalid JSON", async () => {
    const { POST } = await import("@/app/api/context/search/route");
    const response = await POST(
      new Request("http://localhost/api/context/search", { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
    expect(searchLocalContext).not.toHaveBeenCalled();
  });

  it("surfaces missing configuration as a safe partial failure", async () => {
    searchLocalContext.mockResolvedValue({
      ok: false,
      error: {
        code: "TAVILY_NOT_CONFIGURED",
        message: "Local context is unavailable because search is not configured.",
        retryable: false,
      },
    });
    const { POST } = await import("@/app/api/context/search/route");
    const response = await POST(
      new Request("http://localhost/api/context/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "late-night food near JFK" }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "TAVILY_NOT_CONFIGURED" },
      fallbackAvailable: false,
    });
  });

  it("skips the live attempt entirely when appMode=demo", async () => {
    const { POST } = await import("@/app/api/context/search/route");
    const response = await POST(
      new Request("http://localhost/api/context/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "late-night food near JFK", appMode: "demo" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(searchLocalContext).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "TAVILY_DEMO_MODE" } });
  });
});
