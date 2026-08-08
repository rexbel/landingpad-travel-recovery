import type { HandoffRequest, HandoffResult } from "./contracts";

export function createAdvisorHandoff(input: HandoffRequest): HandoffResult {
  const request = input.tripRequest;
  const party = `${request.adults} adult${request.adults === 1 ? "" : "s"}${
    request.children ? ` and ${request.children} child${request.children === 1 ? "" : "ren"}` : ""
  }`;
  const budget = request.hardBudgetTotal
    ? `${request.currency} ${request.hardBudgetTotal} hard total budget`
    : "total budget not confirmed";
  const confirmedFacts = [
    `${party}; ${request.rooms} room${request.rooms === 1 ? "" : "s"}.`,
    `${request.checkin} to ${request.checkout} in ${request.targetArea}.`,
    budget,
    ...(request.mustHaves.length ? [`Must-haves stated by traveler: ${request.mustHaves.join(", ")}.`] : []),
  ];
  const openQuestions = Array.from(
    new Set([...request.uncertainties, ...input.openQuestions, ...(input.selectedPlan?.assumptions ?? [])]),
  );
  const selected = input.selectedPlan?.stay;
  const selectionText = selected
    ? ` Selected option: ${selected.name}, ${selected.currency} ${selected.totalPrice.toFixed(2)} full-stay total via ${selected.supplier}.`
    : " No stay has been selected.";
  return {
    summary: `Recovery request for ${party} near ${request.targetArea}, ${request.checkin} to ${request.checkout}.${selectionText} Booking requires explicit traveler approval on the supplier page.`,
    confirmedFacts,
    openQuestions,
    selectedStay: selected,
    bookingUrl: selected?.bookingUrl,
    requiresApproval: true,
  };
}
