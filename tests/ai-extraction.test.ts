import { afterEach, describe, expect, it, vi } from "vitest";
import { deterministicExtract } from "@/lib/ai/deterministic-extraction";
import { extractWithOpenAI } from "@/lib/ai/openai";

const seeded =
  "Our flight out of JFK was cancelled. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM.";

function modelResponse(payload: unknown): Response {
  return Response.json({
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }],
  });
}

describe("trip request extraction", () => {
  afterEach(() => vi.restoreAllMocks());

  it("extracts the seeded JFK demo deterministically without a provider", () => {
    const result = deterministicExtract({ transcript: seeded, referenceDate: "2026-08-09", mode: "recovery" });

    expect(result.extractionMode).toBe("demo");
    expect(result.tripRequest).toMatchObject({
      mode: "recovery",
      currentLocation: "JFK Airport, New York",
      targetArea: "JFK Airport, New York",
      checkin: "2026-08-09",
      checkout: "2026-08-10",
      adults: 2,
      children: 0,
      rooms: 1,
      hardBudgetTotal: 300,
      mustHaves: ["Late check-in"],
      disruption: { summary: "Flight cancelled", urgency: "same-day" },
    });
    expect(result.tripRequest.preferences).toContain("Within 25 minutes of the target area");
    expect(result.tripRequest.preferences).toContain("Food nearby after 10 PM");
  });

  it("uses the Responses API structured output and removes nullable optional fields", async () => {
    const fetchImpl = vi.fn(async () =>
      modelResponse({
        mode: "recovery",
        currentLocation: "JFK Airport, New York",
        targetArea: "JFK Airport, New York",
        checkin: "2026-08-09",
        checkout: "2026-08-10",
        adults: 2,
        children: 0,
        rooms: 1,
        currency: "USD",
        hardBudgetTotal: 300,
        stretchBudgetTotal: null,
        mustHaves: ["Late check-in"],
        preferences: [],
        uncertainties: ["Late check-in is unverified"],
        disruption: { summary: "Flight cancelled", urgency: "same-day" },
        event: null,
        missingFields: [],
      }),
    ) as unknown as typeof fetch;

    const result = await extractWithOpenAI(
      { transcript: seeded, referenceDate: "2026-08-09", mode: "recovery" },
      { apiKey: "test-key", model: "test-model", fetchImpl },
    );

    expect(result.extractionMode).toBe("inference");
    expect(result.tripRequest.stretchBudgetTotal).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(String(init.body)).not.toContain("test-key");
    expect(JSON.parse(String(init.body))).toMatchObject({ store: false, model: "test-model" });
  });

  it("retries one invalid structured response", async () => {
    const valid = {
      mode: "recovery",
      currentLocation: null,
      targetArea: "JFK Airport, New York",
      checkin: "2026-08-09",
      checkout: "2026-08-10",
      adults: 1,
      children: 0,
      rooms: 1,
      currency: "USD",
      hardBudgetTotal: null,
      stretchBudgetTotal: null,
      mustHaves: [],
      preferences: [],
      uncertainties: ["Budget unknown"],
      disruption: { summary: "Travel disruption", urgency: "same-day" },
      event: null,
      missingFields: ["hardBudgetTotal"],
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(modelResponse({ bad: true }))
      .mockResolvedValueOnce(modelResponse(valid)) as unknown as typeof fetch;

    const result = await extractWithOpenAI(
      { transcript: "I need a room at JFK tonight", referenceDate: "2026-08-09", mode: "recovery" },
      { apiKey: "test-key", fetchImpl },
    );

    expect(result.missingFields).toEqual(["hardBudgetTotal"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
