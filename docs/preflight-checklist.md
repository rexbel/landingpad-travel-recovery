# Pre-hackathon integration checklist

Run `npm run preflight` after adding server credentials to `.env.local`. The command reports only provider name, readiness, HTTP status, and elapsed time. It does not print keys, headers, or response bodies.

## Current status — August 8, 2026

| Provider | Account created | Credential stored locally | Connection verified | Current state |
|---|---:|---:|---:|---|
| Stay22 | Pending | Pending (optional for demo) | Keyless demo passed: dated JFK search returned HTTP 200 | Begin account setup |
| ElevenLabs | Pending | Pending | Pending | Not started |
| Tavily | Pending | Pending | Pending | Not started |
| OpenAI API | Pending | Pending | Pending | Not started |

Update a cell to `Complete` only after that exact step is confirmed. A keyless demo request verifies Stay22's demo endpoint, but it does not prove that an account exists or that an account token works.

## Credential handling

1. Copy `.env.example` to `.env.local` locally.
2. Paste each credential only into `.env.local`; never place it in chat, source files, fixtures, screenshots, logs, or GitHub.
3. Keep all provider credentials server-only. No secret may use a `NEXT_PUBLIC_` prefix.
4. Run `npm run preflight` and confirm the relevant row becomes `ready`.
5. Run `npm test`, `npm run lint`, and `npm run build` after every integration is enabled.
6. Verify the app in an incognito browser with microphone permission allowed and denied.

## Account-by-account acceptance

### Stay22

- Keyless dated search returns at least one result with a supplier price and deeplink.
- Optional token is accepted through `X-API-KEY` when configured.
- Repeated identical requests are deduplicated briefly.
- Provider failure produces typed fallback data with a visible `Demo data` label.

### ElevenLabs

- Private agent exists and the configured agent ID matches it.
- Server route returns a short-lived signed conversation URL.
- Browser receives no API key.
- Denied microphone permission and provider failure preserve the typed request.

### Tavily

- A single narrow JFK local-context query succeeds.
- Every displayed claim retains a source URL.
- Missing key, timeout, or empty results do not block stay ranking.

### OpenAI

- The API project has separate billing and spend controls.
- The configured model can return a validated `TripRequest`.
- Invalid structured output retries once, then opens the deterministic editable form.
- No model output can change a hard eligibility decision without explicit user approval.

## GitHub

- Local repository initialized: complete.
- Shared contract commit on `main`: complete (`fa72763`).
- Remote repository created and verified: complete (`rexbel/landingpad-travel-recovery`).
- Connected GitHub app access: complete (admin and push permission confirmed).
- Pre-hackathon planning/configuration initialization: in progress through the connected GitHub app.
- Local `origin` attachment and push: pending because the required authenticated GitHub CLI is unavailable in this workspace.
- Feature implementation and feature-code publication: paused until explicitly restarted.
