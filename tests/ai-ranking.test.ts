import { describe, expect, it } from "vitest";
import { createAdvisorHandoff } from "@/lib/ai/handoff";
import { rankRecoveryPlans } from "@/lib/ai/ranking";
import type { RankRequest } from "@/lib/ai/contracts";

const tripRequest: RankRequest["tripRequest"] = {
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
  mustHaves: ["Late check-in"],
  preferences: ["Within 25 minutes of the target area"],
  uncertainties: [],
  disruption: { summary: "Flight cancelled", urgency: "same-day" },
};

function candidate(id: string, price: number, minutes: number, preference: number) {
  return {
    stay: {
      id,
      name: `Hotel ${id}`,
      supplier: "Stay22",
      totalPrice: price,
      currency: "USD",
      bookingUrl: `https://example.com/${id}`,
      sourceMode: "stay22-live" as const,
    },
    proximityMinutes: minutes,
    recoveryFrictionScore: 0.8,
    preferenceMatchScore: preference,
    constraintEvidence: { verified: [], contradicted: [], unknown: ["Late check-in"] },
  };
}

describe("deterministic recovery ranking", () => {
  it("gates budget and contradictions before producing three stable plans", () => {
    const request: RankRequest = {
      tripRequest,
      candidates: [
        candidate("near", 260, 8, 0.6),
        candidate("cheap", 180, 22, 0.5),
        candidate("rest", 285, 18, 1),
        candidate("over", 350, 5, 1),
        {
          ...candidate("conflict", 150, 7, 1),
          constraintEvidence: { verified: [], unknown: [], contradicted: ["Late check-in"] },
        },
      ],
      localContext: [],
      stretchApproved: false,
    };

    const first = rankRecoveryPlans(request);
    const second = rankRecoveryPlans(request);

    expect(first).toEqual(second);
    expect(first.plans.map((plan) => [plan.label, plan.stay.id])).toEqual([
      ["fastest", "near"],
      ["best-value", "cheap"],
      ["best-rest", "rest"],
    ]);
    expect(first.excluded.map((item) => item.stayId).sort()).toEqual(["conflict", "over"]);
    expect(first.plans[0]?.assumptions).toEqual(["Late check-in is unknown and is not treated as satisfied."]);
  });

  it("offers explicit relaxations when nothing is eligible", () => {
    const result = rankRecoveryPlans({
      tripRequest: { ...tripRequest, hardBudgetTotal: 90 },
      candidates: [candidate("only", 180, 20, 0.5)],
      localContext: [],
      stretchApproved: false,
    });
    expect(result.plans).toEqual([]);
    expect(result.relaxations).toEqual(["increase-budget", "widen-area", "alternate-area"]);
  });

  it("creates an evidence-preserving, approval-required handoff", () => {
    const plan = rankRecoveryPlans({
      tripRequest,
      candidates: [candidate("near", 260, 8, 0.6)],
      localContext: [],
      stretchApproved: false,
    }).plans[0];
    const handoff = createAdvisorHandoff({ tripRequest, selectedPlan: plan, openQuestions: ["Confirm arrival time"] });
    expect(handoff.requiresApproval).toBe(true);
    expect(handoff.bookingUrl).toBe("https://example.com/near");
    expect(handoff.openQuestions).toContain("Confirm arrival time");
    expect(handoff.summary).toContain("Booking requires explicit traveler approval");
  });
});
