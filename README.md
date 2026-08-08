# LandingPad Travel Recovery

LandingPad is the approved concept for the Checkout Travel Hack NYC: a voice-first travel disruption advisor that turns a cancelled flight into three ranked, bookable recovery plans.

The primary demo begins with a cancelled flight at JFK. ElevenLabs voice intake is required for the target experience, with text as the guaranteed fallback. Stay22 supplies live accommodation data and booking links, Tavily supplies current local context, and OpenAI supports structured extraction and ranking. EventStay remains the no-rewrite fallback concept.

## Current phase

Pre-hackathon setup only. Product implementation and feature-code publication are paused.

The active work is limited to:

- GitHub repository configuration
- Provider account creation
- Local and deployment credential setup
- Minimal secret-safe connection checks
- Build-plan and agent-instruction maintenance

## Project documents

- [LandingPad build plan](docs/landingpad_build_plan.md)
- [Pre-hackathon readiness checklist](docs/preflight-checklist.md)
- [Claude Code instructions](CLAUDE.md)
- [Environment variable template](.env.example)

## Security

Never commit `.env.local`, API keys, tokens, signed URLs, credentials, or provider response bodies that may contain account data. Copy `.env.example` to `.env.local` only after the local checkout is ready.

## Implementation gate

Do not begin feature implementation until the project owner explicitly authorizes the build. Repository initialization and minimal provider authentication tests do not count as feature development.
