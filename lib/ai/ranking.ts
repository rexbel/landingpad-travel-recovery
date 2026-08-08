import type { RecoveryPlan } from "@/schemas/recovery-plan";
import type { RankRequest, RankedRecovery } from "./contracts";

type Candidate = RankRequest["candidates"][number];

function targetMinutes(request: RankRequest): number | undefined {
  for (const preference of request.tripRequest.preferences) {
    const match = preference.match(/within\s+(\d+)\s+minutes/i);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function budgetFor(request: RankRequest): number | undefined {
  if (request.stretchApproved && request.tripRequest.stretchBudgetTotal) {
    return request.tripRequest.stretchBudgetTotal;
  }
  return request.tripRequest.hardBudgetTotal;
}

function priceFit(price: number, budget?: number): number {
  if (!budget) return 0.5;
  return Math.max(0, Math.min(1, 1 - price / budget + 0.5));
}

function proximityFit(minutes: number | undefined, target: number | undefined): number {
  if (minutes === undefined || target === undefined) return 0.5;
  return Math.max(0, Math.min(1, 1 - Math.max(0, minutes - target) / Math.max(target, 1)));
}

function completeness(candidate: Candidate): number {
  if (candidate.sourceCompletenessScore !== undefined) return candidate.sourceCompletenessScore;
  return candidate.stay.sourceMode === "stay22-live" ? 1 : 0.65;
}

function score(candidate: Candidate, request: RankRequest): number {
  return (
    0.35 * priceFit(candidate.stay.totalPrice, budgetFor(request)) +
    0.25 * proximityFit(candidate.proximityMinutes, targetMinutes(request)) +
    0.15 * (candidate.recoveryFrictionScore ?? 0.5) +
    0.15 * (candidate.preferenceMatchScore ?? 0.5) +
    0.1 * completeness(candidate)
  );
}

function eligibilityReasons(candidate: Candidate, request: RankRequest): string[] {
  const reasons: string[] = [];
  const budget = budgetFor(request);
  if (budget !== undefined && candidate.stay.totalPrice > budget) {
    reasons.push(`Full-stay total exceeds the approved ${request.tripRequest.currency} ${budget} budget.`);
  }
  for (const contradicted of candidate.constraintEvidence?.contradicted ?? []) {
    reasons.push(`Source data contradicts required constraint: ${contradicted}.`);
  }
  return reasons;
}

function rationale(candidate: Candidate, label: RecoveryPlan["label"], request: RankRequest): string[] {
  const items = [`Full-stay total is ${candidate.stay.currency} ${candidate.stay.totalPrice.toFixed(2)}.`];
  if (label === "fastest" && candidate.proximityMinutes !== undefined) {
    items.push(`Source-derived proximity estimate is ${candidate.proximityMinutes} minutes.`);
  } else if (label === "best-value") {
    items.push("This is the lowest-priced eligible option not already assigned to an earlier plan.");
  } else if (label === "best-rest") {
    items.push("This option has the strongest supplied preference and recovery-friction signals.");
  }
  if (candidate.stay.sourceMode === "demo") items.push("Accommodation details are demo data, not live inventory.");
  const unknown = candidate.constraintEvidence?.unknown ?? request.tripRequest.mustHaves;
  if (unknown.length) items.push(`Unverified: ${unknown.join(", ")}.`);
  return items;
}

function plan(candidate: Candidate, label: RecoveryPlan["label"], request: RankRequest): RecoveryPlan {
  const unknown = candidate.constraintEvidence?.unknown ?? request.tripRequest.mustHaves;
  return {
    label,
    stay: candidate.stay,
    rationale: rationale(candidate, label, request),
    tradeoffs: [
      ...(candidate.stay.sourceMode === "demo" ? ["Live price and availability must be rechecked."] : []),
      ...(unknown.length ? [`Required facts remain unverified: ${unknown.join(", ")}.`] : []),
    ],
    localContext: request.localContext,
    assumptions: unknown.map((value) => `${value} is unknown and is not treated as satisfied.`),
    rejectedConstraints: [],
  };
}

function chooseUnique(
  ordered: Candidate[],
  used: Set<string>,
): Candidate | undefined {
  const found = ordered.find((candidate) => !used.has(candidate.stay.id));
  if (found) used.add(found.stay.id);
  return found;
}

export function rankRecoveryPlans(request: RankRequest): RankedRecovery {
  const excluded = request.candidates
    .map((candidate) => ({ stayId: candidate.stay.id, reasons: eligibilityReasons(candidate, request) }))
    .filter((item) => item.reasons.length > 0);
  const excludedIds = new Set(excluded.map((item) => item.stayId));
  const eligible = request.candidates.filter((candidate) => !excludedIds.has(candidate.stay.id));
  const tie = (a: Candidate, b: Candidate) => a.stay.id.localeCompare(b.stay.id);
  const fastest = [...eligible].sort(
    (a, b) =>
      (a.proximityMinutes ?? Number.POSITIVE_INFINITY) -
        (b.proximityMinutes ?? Number.POSITIVE_INFINITY) ||
      (b.recoveryFrictionScore ?? 0.5) - (a.recoveryFrictionScore ?? 0.5) ||
      tie(a, b),
  );
  const value = [...eligible].sort(
    (a, b) => a.stay.totalPrice - b.stay.totalPrice || score(b, request) - score(a, request) || tie(a, b),
  );
  const rest = [...eligible].sort(
    (a, b) =>
      (b.preferenceMatchScore ?? 0.5) - (a.preferenceMatchScore ?? 0.5) ||
      (b.recoveryFrictionScore ?? 0.5) - (a.recoveryFrictionScore ?? 0.5) ||
      score(b, request) - score(a, request) ||
      tie(a, b),
  );
  const used = new Set<string>();
  const selections: Array<[RecoveryPlan["label"], Candidate | undefined]> = [
    ["fastest", chooseUnique(fastest, used)],
    ["best-value", chooseUnique(value, used)],
    ["best-rest", chooseUnique(rest, used)],
  ];
  const plans = selections.flatMap(([label, candidate]) => (candidate ? [plan(candidate, label, request)] : []));
  const relaxations: RankedRecovery["relaxations"] = plans.length
    ? []
    : ["increase-budget", "widen-area", "alternate-area"];
  return { plans, excluded, relaxations };
}
