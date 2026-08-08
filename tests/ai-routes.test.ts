import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as extract } from "@/app/api/recovery/extract/route";
import { POST as handoff } from "@/app/api/recovery/handoff/route";
import { POST as rank } from "@/app/api/recovery/rank/route";

const request = {
  mode: "recovery" as const,
  targetArea: "JFK Airport, New York",
  checkin: "2026-08-09",
  checkout: "2026-08-10",
  adults: 2,
  children: 0,
  rooms: 1,
  currency: "USD",
  hardBudgetTotal: 300,
  mustHaves: [],
  preferences: [],
  uncertainties: [],
  disruption: { summary: "Flight cancelled", urgency: "same-day" as const },
};

function jsonRequest(value: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("recovery route contracts", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the deterministic text fallback when the model key is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await extract(
      jsonRequest({
        transcript: "Our flight at JFK was cancelled. Two adults need one room tonight under $300.",
        referenceDate: "2026-08-09",
        mode: "recovery",
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, mode: "demo", data: { extractionMode: "demo" } });
  });

  it("rejects malformed ranking input without exposing validation internals", async () => {
    const response = await rank(jsonRequest({ tripRequest: { mode: "recovery" }, candidates: [] }));
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "The request body is invalid.", retryable: false },
      fallbackAvailable: false,
    });
  });

  it("returns a validated advisor handoff envelope", async () => {
    const response = await handoff(jsonRequest({ tripRequest: request, openQuestions: [] }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { requiresApproval: true },
    });
    expect(payload.data).not.toHaveProperty("bookingUrl");
  });
});
