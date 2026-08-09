# LandingPad ~100-second demo

## Preflight

- Set `NEXT_PUBLIC_PRODUCT_MODE=recovery` and open the deployed app in a clean browser.
- Confirm the voice route, one dated Stay22 result, and its outbound link. Keep the seeded text journey ready.
- Keep the browser at 1440 × 900, increase the pointer size if needed, and close unrelated tabs.
- Do not call a fixture live, and do not describe proximity, safety, late check-in, food hours, accessibility, or availability as verified unless the displayed source supports it.

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
