# LandingPad — Claude Build Instructions

This file is the source of truth for building LandingPad with Claude Code. Read it completely before making changes. Do not create a repository or begin implementation until Rex explicitly says to start.

## 1. Mission

Build **LandingPad**, a voice-first travel disruption recovery advisor for the Checkout Travel Hack NYC on August 9, 2026.

LandingPad turns an urgent, unstructured travel problem into three ranked, bookable recovery plans using live accommodation inventory, current local context, and explicit human approval.

**One-line pitch:**

> LandingPad turns “my flight was cancelled—where can I find a suitable room tonight?” into an advisor-ready recovery plan with live hotel prices, grounded local essentials, and bookable links in under two minutes.

**Primary demo:** A cancelled flight at JFK. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport, with late check-in and food nearby after 10 PM.

**Primary product mode:** `recovery`

**Fallback product mode:** `event`, branded as **EventStay**. EventStay accepts an event URL or venue/date input and ranks **Closest exit**, **Best value**, and **Make a weekend of it** using the same application core.

The fallback must be a configuration change and feature reduction, not a fork or rewrite.

## 2. Non-negotiable product decisions

- LandingPad is approved as the primary concept.
- The JFK cancellation is the primary demo.
- ElevenLabs voice is required in the primary build.
- Text intake must remain fully functional as the guaranteed fallback.
- Stay22 is the transactional core and must supply live dated prices and booking links.
- Tavily supplies narrowly scoped, cited local context.
- The model extracts constraints and explains eligible options; it never invents travel facts.
- The user or advisor makes the final selection and completes booking on the supplier page.
- No payment, reservation, flight rebooking, or autonomous purchase is performed.
- No repository is created until Rex explicitly starts implementation.

## 3. Definition of done

The hackathon MVP is complete when all of the following pass:

1. A traveler can speak or type the JFK disruption request.
2. The app produces a validated, editable recovery brief.
3. A dated Stay22 query returns at least one normalized live accommodation with a full-stay total and booking link.
4. The app applies deterministic eligibility and ranking rules before generating explanations.
5. Three recovery plans render: **Fastest recovery**, **Best value**, and **Best rest**.
6. At least one local-context item is grounded by Tavily and retains its source URL.
7. Every material claim is labeled as user input, Stay22 live data, Tavily web context, model inference, or demo data.
8. The traveler can edit a constraint and rerank without restarting.
9. The user explicitly approves before opening an outbound booking link.
10. The full text journey works from seeded data when all external services are unavailable.
11. The app is deployed and verified in a clean browser.
12. The 90-second demo works live and has a recorded backup.

## 4. Product principles

- Optimize for recovery, not open-ended inspiration.
- Show three strong options rather than a long search-results list.
- Treat sourced facts, user statements, inference, and unknowns as different data classes.
- Never silently relax a hard constraint.
- Never claim verified safety, accessibility, travel time, amenity availability, or room availability without supporting source data.
- Never invent a price, supplier, booking link, citation, or hotel attribute.
- Keep every external integration replaceable behind a typed adapter.
- Make failure states useful and visible.
- Keep the workflow editable and advisor-compatible.

## 5. Approved technology

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS and shadcn/ui
- Zod validation at every external and model boundary
- ElevenLabs React SDK or web integration for voice
- Stay22 Direct Travel API through server-only routes
- Tavily Search API through server-only routes
- OpenAI Responses API through a server-only adapter
- Session or in-memory state only for the hackathon
- Vercel deployment
- Vitest for unit and contract tests
- Playwright for the critical seeded browser journey if time allows

Prefer the simplest stable implementation. Do not introduce a database, authentication, state-management framework, or additional vendor without explicit approval.

## 6. Canonical data contracts

Create these as Zod schemas first, then infer TypeScript types from them. Shared schemas are owned by the lead and are read-only to specialist agents unless a change is approved.

```ts
type SourceMode =
  | "user"
  | "stay22-live"
  | "tavily-web"
  | "inference"
  | "demo"

type TripRequest = {
  mode: "recovery" | "event"
  currentLocation?: string
  targetArea: string
  checkin: string
  checkout: string
  adults: number
  children: number
  rooms: number
  currency: string
  hardBudgetTotal?: number
  stretchBudgetTotal?: number
  mustHaves: string[]
  preferences: string[]
  uncertainties: string[]
  disruption?: {
    summary: string
    urgency: "same-day" | "next-day" | "flexible"
  }
  event?: {
    url?: string
    name?: string
    venue?: string
    startsAt?: string
    endsAt?: string
  }
}

type StayOption = {
  id: string
  name: string
  type?: string
  supplier: string
  totalPrice: number
  currency: string
  bookingUrl: string
  coordinates?: { lat: number; lng: number }
  sourceMode: SourceMode
}

type LocalContextItem = {
  claim: string
  url: string
  sourceMode: "tavily-web"
}

type RecoveryPlan = {
  label: "fastest" | "best-value" | "best-rest"
  stay: StayOption
  rationale: string[]
  tradeoffs: string[]
  localContext: LocalContextItem[]
  assumptions: string[]
  rejectedConstraints: string[]
}
```

Every response from Stay22, Tavily, ElevenLabs tooling, and the model must be validated before entering application state.

## 7. Deterministic ranking

Apply hard eligibility gates before scoring:

- Check-in and checkout dates are present and valid.
- A full-stay price is present.
- The result is within the hard budget unless the user explicitly approves a stretch.
- Party and room requirements are not contradicted by available source data.
- Required facts that are unknown remain unknown; they do not become assumed matches.

Score eligible results with:

```text
35% price fit
25% proximity fit
15% recovery-friction fit
15% stated-preference fit
10% source completeness
```

The model may summarize the deterministic result but may not change eligibility or the numeric ordering without returning a clearly labeled proposal for human review.

## 8. External integration contracts

### Stay22

- Call `GET https://api.stay22.com/v2/accommodations` from a server route.
- Supply `address` or coordinates plus `checkin` and `checkout`.
- Treat `price.total` as the full-stay total in `meta.currency` only after validating the response.
- Preserve Stay22-provided booking links exactly.
- Support keyless demo mode and keyed mode through the same adapter.
- Respect the documented demo rate limit; debounce requests and use only brief in-memory deduplication.
- Do not persist, cold-store, or analyze Stay22 listing inventory.
- On timeout, quota error, malformed response, or outage, return a typed partial-failure result and optionally use seeded Stay22-shaped fixtures labeled `demo`.

### ElevenLabs

- Use a private ElevenAgent.
- Keep the API key server-side.
- Generate short-lived signed conversation URLs through a server route.
- Voice and text must feed the same extraction and confirmation contract.
- If microphone permission is denied or the voice service fails, reveal text entry immediately without losing state.
- The voice layer may invoke application tools only through validated server endpoints.

### Tavily

- Use one narrow, low-result-count query for the primary demo.
- Keep the key server-side.
- Retain the source URL with every displayed local-context claim.
- Do not let Tavily failure block accommodation search or ranking.
- Display `Local context unavailable` when no grounded context is available.

### Model API

- Use the OpenAI Responses API behind a server-only adapter.
- Use structured output for `TripRequest` extraction.
- Retry invalid structured output once.
- After the retry fails, open a deterministic editable form prefilled with any safe, validated values.
- Use the model only for extraction, missing-information detection, concise tradeoff explanations, and advisor handoff generation.
- Never place model prose into a factual field without an explicit `inference` label.

## 9. Required routes

```text
POST /api/recovery/extract
GET  /api/stays/search
POST /api/context/search
POST /api/recovery/rank
POST /api/recovery/handoff
GET  /api/voice/signed-url
```

Return a consistent envelope from every route:

```ts
type ApiResult<T> =
  | { ok: true; data: T; mode?: SourceMode }
  | {
      ok: false
      error: { code: string; message: string; retryable: boolean }
      fallbackAvailable: boolean
    }
```

Do not expose provider error bodies, request headers, or secrets to the client.

## 10. Experience requirements

Build one complete five-screen vertical slice:

1. **Recovery start** — “Tell us what changed,” voice button, text alternative, seeded scenario, and the statement that no booking is made without approval.
2. **Confirm what we heard** — editable brief, uncertainty badges, and one primary search action.
3. **Live search** — separate progress for stays, local context, and ranking; never use a generic full-page spinner.
4. **Compare plans** — three comparable cards, emphasized full-stay total, evidence labels, tradeoffs, recommendation rationale, and constraint drawer.
5. **Advisor handoff** — copyable confirmed facts, open questions, selected stay, booking link, and concise handoff summary.

Every screen must include appropriate loading, partial, empty, error, success, and reset behavior.

Build a hidden EventStay direct form against the same `TripRequest` contract. Activate it only with:

```dotenv
NEXT_PUBLIC_PRODUCT_MODE=recovery
```

Allowed values are `recovery` and `event`. Do not duplicate pages, adapters, plan cards, schemas, or fixtures between modes.

## 11. Seeded demo cases

### Primary

> Our flight out of JFK was cancelled. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM.

### Complex

> We missed our connection and need two rooms for four adults and one child. One traveler cannot manage stairs. Keep the total under $650 and minimize transfers.

Expected behavior: represent accessibility as unverified unless sourced and make advisor review explicit.

### No match

> I need a room tonight near the airport for $90 total.

Expected behavior: do not invent a match. Offer explicit, separately selectable relaxations such as a wider radius, higher budget, or alternate area while preserving the original request.

## 12. Failure behavior

| Failure | Required behavior |
|---|---|
| Stay22 rate limit or outage | Use validated seeded fixtures and label every affected result `Demo data` |
| No dated price | Exclude the result from bookable rankings and explain the exclusion |
| Tavily unavailable | Show accommodation plans without local assertions |
| ElevenLabs unavailable | Preserve the complete text workflow and current state |
| Invalid model extraction | Retry once, then open the editable deterministic form |
| No eligible result | Offer explicit constraint relaxations; never silently widen |
| Booking link missing | Mark the stay non-bookable and exclude it from the three final plans |

## 13. Repository layout

Create this layout when implementation is authorized:

```text
app/
  api/
    context/
    recovery/
    stays/
    voice/
  page.tsx
components/
  landingpad/
lib/
  ai/
  ranking/
  stay22/
  tavily/
  voice/
  data/demo-cases.ts
schemas/
  trip-request.ts
  stay-option.ts
  recovery-plan.ts
docs/
  build-plan.md
  demo-script.md
  architecture.md
tests/
```

Proposed repository name: `landingpad-travel-recovery`.

Default branch: `main`.

License: MIT unless event or team terms require a different choice.

## 14. Multi-agent execution model

When subagents are available, use them. If human teammates join, assign these same workstreams to people. The lead must establish shared schemas, fixtures, interfaces, and exclusive path ownership before parallel work begins.

### Lead and integration owner

Own:

- Repository initialization
- `schemas/`, shared contracts, and product-mode configuration
- Integration decisions and cross-cutting changes
- Git operations, tests, deployment, and demo rehearsal
- Scope and fallback decisions

Only the lead may approve shared-schema changes or broad refactors.

### Agent A — Live travel data

Exclusive paths:

```text
lib/stay22/
lib/tavily/
app/api/stays/
app/api/context/
```

Deliver Stay22 and Tavily adapters, validation, normalization, timeouts, redacted errors, fixtures, and contract tests.

### Agent B — Voice and structured intelligence

Exclusive paths:

```text
lib/voice/
lib/ai/
app/api/recovery/
app/api/voice/
```

Deliver signed voice access, voice intake, structured extraction, uncertainty handling, evidence-bound explanations, advisor handoff, and the identical text fallback.

### Agent C — Experience and demo

Exclusive paths:

```text
components/
app/page.tsx
lib/data/demo-cases.ts
docs/demo-script.md
```

Deliver the five-screen vertical slice, all UI states, source badges, constraint editing, hidden EventStay form, responsive polish, and demo script.

### Coordination rules

- Never assign two agents to the same file at the same time.
- Specialists may not edit outside their assigned paths without lead approval.
- Specialists must propose, not directly make, shared-schema changes.
- Every handoff must list files changed, behavior added, tests run, assumptions, known gaps, and recommended next action.
- Prefer small reviewable patches over broad rewrites.
- Do not add unapproved features.
- Do not create duplicate types, adapters, fixtures, or UI primitives.
- If blocked by credentials, continue with fixtures, tests, and failure behavior in the same workstream.
- Freeze parallel feature work by 3:00 PM on hackathon day and shift to integration, defects, resilience, documentation, and demo rehearsal.
- In a shared worktree, the lead owns all Git operations. With human teammates, use separate feature branches and pull requests.

## 15. Build sequence and gates

### Phase 0 — Authorization and preflight

- Confirm Rex explicitly instructed implementation to begin.
- Confirm API access or document which services will begin in fixture/demo mode.
- Create the repository only after authorization.
- Initialize the app, linting, tests, environment template, and README.
- Commit schemas and seeded cases before parallel feature work.

### Phase 1 — Static vertical slice

- Build all five screens with seeded data.
- Complete the entire click path.
- Add source badges, reset, and failure states.

**Gate:** The full demo works without external APIs.

### Phase 2 — Stay22 live core

- Implement server-only Stay22 access.
- Validate and normalize results.
- Render real dated totals and booking links.
- Add timeout, deduplication, and demo fallback.

**Gate:** The primary case returns at least one live, bookable stay.

### Phase 3 — No-rewrite checkpoint

Continue with LandingPad only if:

- The complete text journey works with seeded data.
- A dated Stay22 search returns at least one normalized result.
- The same plan cards render live and fallback data.
- `TripRequest` supports both disruption and event context.
- EventStay can complete a booking-link handoff through configuration.

Fix shared-core failures before adding voice. If the shared core passes but voice or extraction is unreliable by the voice checkpoint, switch only the presentation mode to EventStay. The switch must take no more than 20 minutes.

### Phase 4 — Voice and extraction

- Add ElevenLabs voice entry and signed access.
- Connect voice to validated extraction.
- Preserve text fallback.
- Test incomplete speech, interruption, microphone denial, and provider failure.

### Phase 5 — Context and ranking

- Add one constrained Tavily query.
- Implement deterministic ranking and eligibility.
- Add concise evidence-bound explanations.
- Implement no-match relaxation controls.

### Phase 6 — Polish and proof

- Verify every loading, partial, empty, error, and success state.
- Test demo-mode switching.
- Remove dead controls.
- Validate keyboard use and the presentation viewport.
- Add sponsor attribution and architecture documentation.
- Deploy and test in an incognito browser.
- Verify outbound booking links.
- Record the fallback demo.
- Freeze features and rehearse the 90-second script.

## 16. Testing requirements

Before declaring a phase complete:

- Run type checking, linting, and relevant tests.
- Add fixture-based contract tests for every external adapter.
- Test valid, malformed, empty, timeout, quota, and partial external responses.
- Test hard-budget rejection and explicit stretch approval.
- Test missing booking links.
- Test source labels through the rendered plan.
- Test that external secrets never enter client code, responses, logs, snapshots, screenshots, or fixtures.
- Test that recovery and event modes render from the same normalized data.
- Test the complete seeded journey with all external keys absent.

Do not mark a task complete merely because the happy path compiles.

## 17. Environment contract

Create `.env.example` with names and safe empty values only:

```dotenv
STAY22_API_KEY=
STAY22_API_BASE_URL=https://api.stay22.com

ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=

TAVILY_API_KEY=
TAVILY_PROJECT=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6

NEXT_PUBLIC_PRODUCT_MODE=recovery
```

Rules:

- All provider keys are server-only.
- Never prefix a secret with `NEXT_PUBLIC_`.
- Never print, echo, log, commit, screenshot, or paste a secret.
- Keep `.env.local` and all local credential variants ignored.
- Add server secrets independently to Preview and Production deployment environments.
- Redact provider request headers and raw error bodies.
- If exposure occurs, stop, revoke the key, replace it, update environments, and retest.

## 18. Sponsor attribution

Credit sponsors accurately in the README, architecture documentation, and pitch:

- **Integrated:** Stay22, ElevenLabs, Tavily, AeroXplorer (historical aviation evidence only — airport identity and, for an exact flight query, historical performance; never live flight status)
- **Advisor-prize alignment:** Anecdote Travel
- **Strategic or future routes only:** Rove, Propellic, Globe Thrivers, Nappr, Lovable unless actually integrated during the event

Do not claim an API or partnership that is not actually used. Do not place sponsor logos in the product without clear brand-use permission.

## 19. Demo script

**Opening:**

> Travel planners optimize the trip you hope to take. LandingPad rescues the trip you’re already on. I’ve just had a flight cancelled at JFK, and I need somewhere bookable tonight.

Speak the seeded request, show the editable structured brief, and correct one field. Show the Stay22 live badge, full-stay prices, three plan labels, and one cited local-context item. Open the evidence panel briefly, copy the advisor summary, and then open the selected Stay22 booking link.

**Close:**

> From disruption to a bookable, advisor-ready recovery plan in under two minutes.

## 20. Stop conditions

Stop and ask Rex before:

- Creating the GitHub repository or beginning implementation without explicit authorization
- Changing the approved concept, primary scenario, or sponsor strategy
- Adding payment, booking automation, persistent inventory storage, authentication, a database, or flight rebooking
- Replacing an approved provider
- Expanding scope beyond the documented MVP
- Making a claim that requires unsupported safety, accessibility, availability, or travel-time data
- Making a late pivot outside the EventStay configuration fallback

When blocked by an incidental implementation problem, continue with safe in-scope fixture, test, documentation, or fallback work. Report the blocker with evidence and a recommended choice.

## 21. First response after import

After receiving this file, Claude should:

1. Confirm it has read the full file.
2. State that LandingPad, the JFK demo, required ElevenLabs voice, text fallback, and EventStay no-rewrite fallback are locked.
3. Confirm that repository creation remains paused until Rex explicitly starts implementation.
4. List any detected contradictions or missing prerequisites in no more than five bullets.
5. Ask only one question: **“Should I begin implementation and create the `landingpad-travel-recovery` repository now?”**

