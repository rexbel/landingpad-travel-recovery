# LandingPad Travel Recovery

LandingPad is a voice-first travel disruption advisor built for the Checkout Travel Hack NYC. It turns "my flight was cancelled — where can I stay tonight?" into three ranked, bookable recovery plans in under two minutes.

The primary demo is a cancelled flight at JFK. ElevenLabs powers voice intake, with text as the guaranteed fallback. Stay22 supplies live accommodation data and booking links, Tavily supplies current local context, and OpenAI supports structured extraction. Every material claim is labeled by source (live, web-grounded, inferred, or demo), and no booking link opens without explicit user approval. EventStay — the same application core reconfigured for event-based stay planning — is a no-rewrite fallback available via `NEXT_PUBLIC_PRODUCT_MODE=event`.

## Local setup

```bash
npm ci
cp .env.example .env.local   # optional — see "Offline / demo mode" below
npm run dev
```

The app runs at `http://localhost:3000`.

## Offline / demo mode

**No provider credentials are required to run the full journey.** Every server-side adapter fails closed to labeled demo/fallback data when a credential is absent:

- **Stay22** works keyless out of the box (its own demo mode); a key only changes attribution.
- **ElevenLabs** returns a clear "voice unavailable" response with no key configured — text intake covers the full journey.
- **Tavily** returns "local context unavailable" without blocking accommodation results.
- **OpenAI** absent → structured extraction falls back to a deterministic, regex-based parser tuned for the seeded JFK scenario.

This means `npm run dev` with an empty `.env.local` (or none at all) still demonstrates the complete five-screen flow end to end, labeled as demo data throughout.

## Credential-safe preflight

```bash
npm run preflight        # default: reports each provider's configuration status only — makes zero network calls
npm run preflight:live   # opt-in: performs one authenticated request per configured provider
```

`preflight:live` is the only command in this repo that contacts a provider. Never run it without deliberately intending to — it will make a real request to any provider with credentials present, including Stay22's keyless demo endpoint.

## Provider roles

| Provider | Role | Required for MVP? |
|---|---|---|
| **Stay22** | Dated accommodation search, full-stay pricing, booking deeplinks | No — keyless demo mode covers the primary flow |
| **ElevenLabs** | Browser voice conversation for intake | No — text intake is the guaranteed path |
| **Tavily** | Narrow, cited local-context search (transport, food, essentials) | No — plans render without it |
| **OpenAI** | Natural-language → structured `TripRequest` extraction | No — deterministic extraction is the fallback |

## Safety boundaries

- No reservation, payment, or booking is ever made by the app — every booking link requires an explicit approval click and opens the supplier's own page.
- Server credentials never reach the client; `NEXT_PUBLIC_*` variables carry no secrets.
- `.env.local` is gitignored and is never read, logged, or committed by tooling in this repo.
- The model may extract, summarize, and explain — it may never invent a price, availability, amenity, or booking link.

## Primary demo flow

1. **Tell us** — speak or type: *"Our flight out of JFK was cancelled. Two adults need one room tonight, under $300 total, preferably within 25 minutes of the airport. We need late check-in and somewhere nearby to get food after 10 PM."*
2. **Confirm** — an editable structured brief (dates, party, budget, must-haves) built from the request.
3. **Search** — Stay22 (dated pricing + deeplinks) and Tavily (local context) run in parallel; each degrades to labeled fallback data independently if it fails.
4. **Compare** — three ranked plans (Fastest recovery / Best value / Best rest), each labeled by data source.
5. **Handoff** — an approval gate before any booking link opens, plus a copyable advisor summary with confirmed facts and open questions.

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
