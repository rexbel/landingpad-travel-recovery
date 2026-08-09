# Pre-hackathon integration checklist

Run `npm run preflight` after adding server credentials to `.env.local`. The command reports only provider name, readiness, HTTP status, and elapsed time. It does not print keys, headers, or response bodies.

## Current status — August 8, 2026

| Provider | Account created | Credential stored locally | Connection verified | Current state |
|---|---:|---:|---:|---|
| Stay22 | Complete; email verified | Complete (`STAY22_API_KEY` in ignored `.env.local`) | Complete; authenticated dated JFK search returned HTTP 200 | Ready |
| ElevenLabs | Complete | Complete (`ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in ignored `.env.local`) | Complete; user endpoint and private signed conversation URL returned HTTP 200 | Ready |
| Tavily | Complete | Complete (`TAVILY_API_KEY` in ignored `.env.local`) | Complete; narrow JFK search returned HTTP 200 | Ready; dedicated development key capped at 500 credits/month |
| OpenAI API | Complete; dedicated `LandingPad` project | Complete (`OPENAI_API_KEY` in ignored `.env.local`) | Complete; model listing and Responses API returned HTTP 200 | Ready; $10 enforced monthly limit, 50%/80%/100% alerts, and auto-reload disabled |
| AeroXplorer | Complete | Complete (`AEROXPLORER_API_KEY` and `AEROXPLORER_API_SECRET` stored as GitHub repository secrets, not locally) | Pending — verified only through the manually triggered `provider: aeroxplorer` GitHub Actions run | Preflight-only; no product adapter built yet |

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

- Private `LandingPad` agent exists, requires authentication, and the configured agent ID matches it.
- Restricted `landingpad-hackathon-2026` key expires September 7, 2026 and grants only ElevenAgents write plus user-access verification.
- Private signed conversation URL request returned HTTP 200.
- Browser receives no API key.
- Denied microphone permission and provider failure preserve the typed request.

### Tavily

- Dedicated `landingpad-hackathon-2026` development key exists with a 500-credit monthly cap.
- A single narrow JFK local-context query succeeds.
- Every displayed claim retains a source URL.
- Missing key, timeout, or empty results do not block stay ranking.

### OpenAI

- Dedicated `LandingPad` API project exists with separate billing and spend controls.
- The project has a $10 enforced monthly spend limit with alerts at 50%, 80%, and 100%; auto-reload is disabled.
- Restricted `landingpad-hackathon-2026` project key remains active until manually revoked and grants model listing plus model-capability requests only.
- The key is stored as `OPENAI_API_KEY` in ignored `.env.local` with `0600` permissions.
- Model listing and a `gpt-5.6` Responses API request returned HTTP 200.
- The configured model can return a validated `TripRequest`.
- Invalid structured output retries once, then opens the deterministic editable form.
- No model output can change a hard eligibility decision without explicit user approval.

### AeroXplorer

AeroXplorer is a **preflight-only** credential check for now — there is no product-facing AeroXplorer adapter yet, and none is authorized until explicitly built.

- Credentials are server-only: `AEROXPLORER_API_KEY` and `AEROXPLORER_API_SECRET`. Never prefix either with `NEXT_PUBLIC_`.
- **GitHub repository secrets are the expected storage location** for these two values, not `.env.local`. They were added directly as repo secrets so the manual, credential-gated GitHub Actions run can use them without ever touching a local machine.
- The AeroXplorer dashboard password, team number, and any generated bearer token must never be stored anywhere in this repository — not in `.env.local`, not in a commit, not in a workflow log, not as a GitHub Actions artifact or step summary.
- **Local preflight is offline by default.** `npm run preflight` never contacts AeroXplorer (or any provider) unless `--live` is explicitly passed.
- Exact explicit live command (AeroXplorer only, local): `npm run preflight:live:aeroxplorer`. This reads `AEROXPLORER_API_KEY`/`AEROXPLORER_API_SECRET` from your local environment only if you've deliberately set them — running it makes one real request to AeroXplorer.
- Exact manual GitHub Actions procedure: open the **Provider credential preflight** workflow under the repo's Actions tab, click **Run workflow**, select the branch, choose `provider: aeroxplorer`, and run. This path never contacts Stay22, ElevenLabs, Tavily, or OpenAI.
- AeroXplorer issues short-lived bearer tokens (expiration is a Unix timestamp in the token response). **Generating a new token may invalidate a previous one** — avoid running the live check from two places at once. The GitHub Actions workflow enforces this with a concurrency group so simultaneous AeroXplorer runs can't invalidate each other's tokens.
- Run the AeroXplorer preflight **deliberately**, not as part of routine CI — normal pull-request and push CI (`.github/workflows/ci.yml`) never touches any provider credential.
- Output is intentionally redacted: provider name, pass/fail, HTTP status *class* (not the raw code where avoidable), latency, schema-valid/invalid, and which authenticated-request header form succeeded. The token, API key, API secret, full headers, and response bodies are never printed, logged, or stored.

## GitHub

- Local repository initialized: complete.
- Canonical local checkout: complete (`/workspace/scratch/6a27ac251a74/landingpad`).
- Shared contract commit on `main`: complete (`fa72763`).
- Remote repository created and verified: complete (`rexbel/landingpad-travel-recovery`).
- Connected GitHub app access: complete (admin and push permission confirmed).
- Pre-hackathon planning/configuration initialization: complete through the connected GitHub app.
- Local `origin` attachment and push: pending because the required authenticated GitHub CLI is unavailable in this workspace.
- Feature implementation and feature-code publication: paused until explicitly restarted.
