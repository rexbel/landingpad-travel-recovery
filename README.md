# LandingPad Travel Recovery

LandingPad is a voice-first travel disruption advisor built for the Checkout Travel Hack NYC. It turns "my flight was cancelled — where can I stay tonight?" into three ranked, bookable recovery plans in under two minutes.

The primary demo is a cancelled flight at JFK. ElevenLabs powers voice intake, with text as the guaranteed fallback. Stay22 supplies live accommodation data and booking links, Tavily supplies current local context, OpenAI supports structured extraction, and AeroXplorer supplies **historical** aviation evidence (airport identity and, for an exact flight query, historical performance) — never live flight status. Every material claim is labeled by source (live, web-grounded, historical, inferred, or demo), and no booking link opens without explicit user approval. EventStay — the same application core reconfigured for event-based stay planning — is a no-rewrite fallback available via `NEXT_PUBLIC_PRODUCT_MODE=event`.

## Local setup

```bash
npm ci
cp .env.example .env.local   # optional — see "Offline / demo mode" below
npm run dev
```

The app runs at `http://localhost:3000`.

## Demo mode vs. Active mode

The app header has a **Demo mode / Active mode** toggle (defaults to Active — so a configured provider is actually used without an extra click; switch to Demo for a guaranteed-offline walkthrough):

- **Active mode** attempts real calls to every configured provider (Stay22, Tavily, OpenAI, ElevenLabs, AeroXplorer). A provider that isn't configured, or that fails, still degrades gracefully to fallback data exactly as documented below; Active mode does not require every provider to be configured.
- **Demo mode** forces every server route to its seeded/fallback path — Stay22 returns its own demo fixtures, and Tavily, AeroXplorer, flight recovery, and voice all report themselves unavailable. **No provider is contacted, regardless of what credentials are configured.** Switch to this if you want a guaranteed-offline run, e.g. before a presentation where you don't want a flaky network call live on stage.

Toggling is purely a client preference sent as `appMode: "demo" | "active"` on every request — no page reload needed.

## Offline / demo mode

**No provider credentials are required to run the full journey.** Every server-side adapter fails closed to labeled demo/fallback data when a credential is absent:

- **Stay22** works keyless out of the box (its own demo mode); a key only changes attribution.
- **ElevenLabs** returns a clear "voice unavailable" response with no key configured — text intake covers the full journey.
- **Tavily** returns "local context unavailable" without blocking accommodation results.
- **OpenAI** absent → structured extraction falls back to a deterministic, regex-based parser tuned for the seeded JFK scenario.
- **AeroXplorer** absent → the historical-evidence panel reports itself unavailable; the hotel-recovery journey is completely unaffected either way.

This means `npm run dev` with an empty `.env.local` (or none at all) still demonstrates the complete five-screen flow end to end, labeled as demo data throughout.

## Credential-safe preflight

```bash
npm run preflight                    # default: reports each provider's configuration status only — makes zero network calls
npm run preflight:live               # opt-in: performs one authenticated request per configured provider
npm run preflight:live:aeroxplorer   # opt-in: AeroXplorer only (token + one JFK airport lookup)
```

`preflight:live*` commands are the only ones in this repo that contact a provider. Never run them without deliberately intending to — they make a real request to any provider with credentials present, including Stay22's keyless demo endpoint. The manual, credential-gated **Provider credential preflight** GitHub Actions workflow can also be run scoped to AeroXplorer only (Actions tab → Run workflow → `provider: aeroxplorer`).

## Provider roles

| Provider | Role | Required for MVP? |
|---|---|---|
| **Stay22** | Dated accommodation search, full-stay pricing, booking deeplinks | No — keyless demo mode covers the primary flow |
| **ElevenLabs** | Browser voice conversation for intake | No — text intake is the guaranteed path |
| **Tavily** | Narrow, cited local-context search (transport, food, essentials) | No — plans render without it |
| **OpenAI** | Natural-language → structured `TripRequest` extraction | No — deterministic extraction is the fallback |
| **AeroXplorer** | Historical aviation evidence: airport identity + historical flight performance for an exact query | No — the evidence panel simply reports itself unavailable |

### AeroXplorer: historical aviation evidence

AeroXplorer is a **historical** evidence provider, not a live flight-status feed — every statement it produces is labeled "Historical aviation data" / "AeroXplorer historical records" and includes a retrieval timestamp. It can never determine hotel eligibility, override a user-confirmed constraint, or claim a flight is currently cancelled.

- **Airport resolution** happens whenever a request resolves to a recognizable airport (e.g. the canonical "our flight out of JFK was cancelled" demo) — this is metadata only, no historical query.
- **Historical flight performance** is only queried when the request has an exact airline, flight number, origin airport, and date — a deterministic, tested function (`buildExactFlightHistoryQuery`) makes this call. An airport alone never triggers it.
- **Server-only credentials:** `AEROXPLORER_API_KEY`, `AEROXPLORER_API_SECRET`, optional `AEROXPLORER_API_BASE_URL` (defaults to `https://api.aeroxplorer.com`). Never exposed to the client.
- **Token lifecycle:** cached in server-process memory, refreshed 5 minutes before its documented expiration, single-flight for concurrent requests, cleared and retried exactly once on a `401`. This module-level cache is fine for one hackathon server instance but is **not** a multi-instance strategy — a horizontally scaled deployment would need a centralized token broker so instances don't invalidate each other's tokens.
- **Limitations:** rates (cancellation/delay/diversion) are computed from whatever sample AeroXplorer's historical database returns for the narrow query (bounded to 100 records), each with its own explicit denominator — they are a historical sample, not a forecast, and are never presented as one.

### Voice conversation flow

Voice is only attempted in **Active mode** — it's disabled entirely in Demo mode (the button explains why if clicked). When active, the ElevenLabs conversation actively asks two questions rather than passively waiting: *"What happened, and do you need help with a hotel, an alternate flight, or both?"* This is sent as a session-start override (`overrides.agent.firstMessage` and `overrides.agent.prompt`), not a dashboard change — but **the ElevenLabs agent's dashboard security settings must allow first-message and prompt overrides for this to take effect live**; if overrides aren't permitted, the agent falls back to its own configured behavior and the app still degrades gracefully (text intake always works regardless). The traveler's answer to "hotel, flight, or both" flows into the same transcript sent to extraction, where it's parsed into `assistanceScope` — saying "just a hotel" skips the flight-recovery search entirely rather than showing options nobody asked for.

### Flight recovery: search assistance, not live search

LandingPad has no live flight-search, availability, or booking provider — AeroXplorer's API is historical-only. `lib/flight-recovery/` combines a narrow Tavily query (up to 3 grounded search links, e.g. "search JFK → ORD flights") with a route-level AeroXplorer historical on-time rate, both independent of each other and of hotel search. It never lists a specific bookable flight, and outbound links go through the same explicit approval gate as hotel booking links. This intentionally revises part of the original non-goal "Flight search or airline rebooking" — see `docs/build-plan.md`'s revision note and `docs/architecture.md` for the full boundary. Airline rebooking (actually completing a booking) remains out of scope.

## Safety boundaries

- No reservation, payment, or booking is ever made by the app — every booking link requires an explicit approval click and opens the supplier's own page.
- Server credentials never reach the client; `NEXT_PUBLIC_*` variables carry no secrets.
- `.env.local` is gitignored and is never read, logged, or committed by tooling in this repo.
- The model may extract, summarize, and explain — it may never invent a price, availability, amenity, or booking link.
- AeroXplorer may explain airport or historical operating context — it never decides hotel eligibility, never overrides a user-confirmed constraint, and never claims live flight status.

## Primary demo flow

1. **Tell us** — speak or type: *"Our flight out of JFK was cancelled. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM."*
2. **Confirm** — an editable structured brief (dates, party, budget, must-haves) built from the request.
3. **Search** — Stay22 (dated pricing + deeplinks) and Tavily (local context) run in parallel; each degrades to labeled fallback data independently if it fails.
4. **Compare** — three ranked plans (Fastest recovery / Best value / Best rest), each labeled by data source, alongside an "Alternate flight options" panel (grounded search links + historical on-time context) when a destination was mentioned.
5. **Handoff** — an approval gate before any booking or flight-search link opens, plus a copyable advisor summary with confirmed facts and open questions.

## Validation commands

```bash
npm ci
npm run lint
npm test
npm run build
npm run preflight   # offline, credential-safe
```

## Project documents

- [LandingPad build plan](docs/build-plan.md)
- [Architecture](docs/architecture.md)
- [Demo script](docs/demo-script.md)
- [Pre-hackathon readiness checklist](docs/preflight-checklist.md)
- [Claude Code instructions](CLAUDE.md)
- [Environment variable template](.env.example)

## Security

Never commit `.env.local`, API keys, tokens, signed URLs, credentials, or provider response bodies that may contain account data. Copy `.env.example` to `.env.local` only if you intend to configure real credentials — the app runs fully without it.
