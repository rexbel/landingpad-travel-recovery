# LandingPad ~100-second demo

## Preflight

- Set `NEXT_PUBLIC_PRODUCT_MODE=recovery` and open the deployed app in a clean browser.
- Confirm the voice route, one dated Stay22 result, and its outbound link. Keep the seeded text journey ready.
- Keep the browser at 1440 × 900, increase the pointer size if needed, and close unrelated tabs.
- Do not call a fixture live, and do not describe proximity, safety, late check-in, food hours, accessibility, or availability as verified unless the displayed source supports it.
- For a full-functionality live run (Active mode, real credentials), use the exact parameter set below — see "Live Active-mode parameters" — so every evidence lane (Stay22, Tavily, AeroXplorer) returns real, populated data instead of an "unavailable" fallback.

## Live Active-mode parameters (full functionality)

AeroXplorer's historical dataset currently only contains **2025** flight records (their beta docs claim 2025-2026 coverage, but 2026 dates return zero results live, confirmed against the real API). Stay22's hotel search needs a **present/near-future** checkin. These two constraints can't share one date, so the script below deliberately uses both: the disruption narrative and hotel dates stay anchored to "today," while the flight's exact identity is confirmed with a real 2025 date so the aviation-evidence lanes pull genuine historical records instead of showing "unavailable."

**Recommended flow — reliable, bypasses LLM date-extraction ambiguity:**

1. Speak or type the existing seeded line unchanged: *"Our flight out of JFK was cancelled. We're trying to get to a wedding in Chicago tomorrow. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM."*
2. On the structured confirmation screen, leave **Target area**, **Check-in**, **Check-out**, budget, and must-haves as extracted (checkin/checkout should default near today — that's what drives the live Stay22 search).
3. In the flight fields, explicitly set (don't rely on voice/LLM extraction to infer these — type them directly):

   | Field | Value |
   |---|---|
   | Origin airport (IATA) | `JFK` |
   | Destination airport (IATA) | `ORD` |
   | Flight date | `2025-06-15` |
   | Airline code | `AA` |
   | Flight number | `483` |

4. Select **Search live stays**.

**Confirmed live results with this exact combination** (verified directly against the AeroXplorer API on 2026-08-10, with real credentials, through the actual app routes):
- **Historical operating context** (`/api/aviation/context`): `mode: "aeroxplorer-historical"` — JFK airport identity resolved, AA 483 JFK→ORD on 2025-06-15 found (1 observation, on time, not cancelled, not diverted).
- **Alternate flight options** (`/api/flight-recovery/context`): real Tavily search links (Kayak, Skyscanner, CheapOair) plus route-level historical context for JFK→ORD in June 2025 — 80% on-time rate across 5 observations.
- Stay22 (hotel) and Tavily (local context) are unaffected by any of this — they already resolve from **Target area** / **Check-in** / **Check-out** exactly as before.

If voice extraction happens to get the flight date right on its own, step 3 is unnecessary — but don't count on it; the deterministic/LLM extractor is not guaranteed to infer "2025" for a spoken date, and the whole point of this section is a reliable, repeatable full-functionality run.

## Script

**0:00–0:12 — The problem**

> Travel planners optimize the trip you hope to take. LandingPad rescues the trip you’re already on. My flight was just cancelled at JFK, and I need somewhere bookable tonight.

Start voice and say the seeded request. If voice is not ready within five seconds, point out the preserved text and select **Build my brief**.

**0:12–0:30 — Structured confirmation**

Show the editable recovery brief. Change the budget from $300 to $290.

> LandingPad separates confirmed constraints from facts that still need verification. It never silently relaxes the hard budget.

Select **Search live stays**.

**0:30–0:47 — Independent evidence**

Pause on the three progress rows.

> Accommodation, local context, and ranking resolve independently, so one provider failure does not erase the useful result.

**0:47–1:08 — Three recovery strategies**

Show **Fastest recovery**, **Best value**, and **Best rest**. Point to the full-stay price, source badge, rationale, and tradeoff. Open one Tavily source only when present.

> Stay22 supplies dated accommodation data and the booking path. Tavily adds cited local context. LandingPad applies the hard eligibility rules first and explains the tradeoffs second.

**1:08–1:18 — Alternate flight options**

Point to the **Alternate flight options** panel above the plan cards — the historical on-time line, then one search link. Select it and pause on its own approval gate.

> LandingPad has no live flight-search provider, so it doesn’t pretend to. These are grounded search links plus historical operating context — never live status, never a booking. The same approval gate applies before leaving for a search page.

Return to LandingPad without completing a search.

**1:18–1:33 — Human approval**

Select the recommended plan and pause on the approval gate.

> LandingPad never books autonomously. The traveler explicitly approves before leaving for the supplier page.

Approve the link, then return to LandingPad.

**1:33–1:40 — Advisor handoff**

Copy the summary.

> The same confirmed facts, open questions, and selected stay are ready for a human advisor. From disruption to a bookable, advisor-ready recovery plan — hotel and flight both — in under two minutes.

## Failure pivots

- **Voice unavailable:** “The secure voice layer is unavailable, so LandingPad preserved the complete text journey.” Continue immediately.
- **Stay22 unavailable or rate-limited:** Point to **Demo data**. “These are validated fixtures, clearly labeled—not live availability.”
- **Tavily unavailable:** Point to **Local context unavailable**. Do not improvise local claims.
- **Flight recovery unavailable:** Point to the unavailable state under the plan cards. “Flight assistance is down; hotel results are unaffected either way.” Never improvise a flight status or price.
- **No eligible result:** Return to the brief and change a constraint explicitly. State which hard limit is being relaxed.
- **Outbound link issue:** Stop at the approval gate and use the recorded backup; never imply a booking occurred.

## EventStay fallback

Set `NEXT_PUBLIC_PRODUCT_MODE=event` and restart the app. The same journey presents **Closest exit**, **Best value**, and **Make a weekend of it**; no page, data contract, plan card, or booking flow changes.
