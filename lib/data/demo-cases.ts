import type { RecoveryPlan } from "@/schemas/recovery-plan";
import type { TripRequest } from "@/schemas/trip-request";

export const primaryPrompt =
  "Our flight out of JFK was cancelled. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM.";

export const primaryTripRequest: TripRequest = {
  mode: "recovery",
  currentLocation: "John F. Kennedy International Airport (JFK)",
  targetArea: "JFK Airport, Queens, New York",
  checkin: "2026-08-09",
  checkout: "2026-08-10",
  adults: 2,
  children: 0,
  rooms: 1,
  currency: "USD",
  hardBudgetTotal: 300,
  mustHaves: ["Late check-in"],
  preferences: ["Within 25 minutes of JFK", "Food nearby after 10 PM"],
  uncertainties: [
    "Late check-in must be verified on the supplier page",
    "Travel time depends on current traffic",
  ],
  disruption: {
    summary: "Outbound flight cancelled at JFK",
    urgency: "same-day",
  },
};

export const seededPlans: RecoveryPlan[] = [
  {
    label: "fastest",
    stay: {
      id: "demo-jfk-1",
      name: "Airport recovery stay",
      type: "Hotel",
      supplier: "Stay22 demo fixture",
      totalPrice: 249,
      currency: "USD",
      bookingUrl: "https://www.stay22.com/",
      sourceMode: "demo",
    },
    rationale: ["Prioritizes the lowest-friction airport recovery route."],
    tradeoffs: ["Travel time and late check-in remain unverified."],
    localContext: [],
    assumptions: ["One-night stay for two adults in one room."],
    rejectedConstraints: [],
  },
  {
    label: "best-value",
    stay: {
      id: "demo-jfk-2",
      name: "Queens value stay",
      type: "Hotel",
      supplier: "Stay22 demo fixture",
      totalPrice: 219,
      currency: "USD",
      bookingUrl: "https://www.stay22.com/",
      sourceMode: "demo",
    },
    rationale: ["Leaves the most room under the confirmed hard budget."],
    tradeoffs: ["May require a longer transfer from JFK."],
    localContext: [],
    assumptions: ["Transfer cost is not included in the room total."],
    rejectedConstraints: [],
  },
  {
    label: "best-rest",
    stay: {
      id: "demo-jfk-3",
      name: "Comfort-first airport stay",
      type: "Hotel",
      supplier: "Stay22 demo fixture",
      totalPrice: 289,
      currency: "USD",
      bookingUrl: "https://www.stay22.com/",
      sourceMode: "demo",
    },
    rationale: ["Uses the available budget to prioritize recovery comfort."],
    tradeoffs: ["Only $11 remains below the hard budget."],
    localContext: [],
    assumptions: ["Comfort is inferred from the demo scenario only."],
    rejectedConstraints: [],
  },
];
