# LandingPad visual identity

## The metaphor

A traveler's plan just fell through mid-air. LandingPad's job is to get them to a calm, confirmed landing — not to entertain them on the way down. The brand metaphor is a frog leaping toward a lily pad: mid-air disruption, a deliberate arc, and a stable, circular landing spot that ripples outward once you're on it.

Three product moments map directly onto the metaphor:

- **Disrupted** — mid-leap, no landing point yet (start screen).
- **Recovering** — the arc toward a chosen pad (search/compare screens).
- **Landed** — settled, ripple resolving outward (handoff screen).

## What this identity deliberately avoids

Clip art, emoji, photorealistic textures, jungle/pond scenery as literal background art, decorative AI-gradient blobs, and mascot overload (the frog appears as a mark or a single hero moment — never as a recurring cartoon character narrating the UI). The tone is mature editorial illustration: flat shapes, confident line work, restrained color, no anthropomorphizing.

**The earlier "no facial detail" rule has been dropped.** The second-generation brand asset set is built entirely around an expressive frog face (eyes + mouth, sad/neutral/happy) — see "Expressive states" below — and that face is now a first-class part of the system, not a narrow exception confined to isolated status moments.

## Expressive states — `FrogSignal`

`components/brand/FrogSignal.tsx` is a frog face on a dashed circular "landing pad" ring, with three states:

| State | Construction | Meaning |
|---|---|---|
| `sad` | Head fill matches `--paper` (reads as a dark silhouette), accent-colored outline/eyes/frown | Disrupted — no landing point yet. |
| `neutral` | Unfilled head, `currentColor` outline/eyes, no mouth | Recovering — in progress, arcing toward a landing. |
| `happy` | Solid `--accent` fill, dark (`--accent-ink`) eyes and smile | Landed — settled, confirmed. |

**Primary use — the header mark progresses with the journey.** `.lp-brand-mark` isn't fixed to one state: it reads `sad` on Tell Us, `neutral` on Confirm, and `happy` from Search onward — the same disrupted → recovering → landed arc the metaphor already describes (see "The metaphor" above), now visible continuously as the one frog icon that's on screen the whole time. Additional contextual uses layer on top of that: `neutral` while voice is connecting or a search is in progress, `sad` next to a voice failure/mic-denied notice, `happy` on the handoff success mark.

## Palette

Rule 16 (default to grayscale, apply the 60-30-10 method, deviate only where it conflicts with brand-asset recommendations) governs the whole system. The one deviation is Frog Green `#A6E673`, which the brand asset usage guidelines mandate directly ("Primary color: Frog Green `#A6E673`," "use on dark or muted backgrounds for best contrast") — everything else stays neutral. In 60-30-10 terms: **60%** page/surface grayscale, **30%** ink/border grayscale, **10%** the single accent green (plus a second, smaller semantic exception for caution/error, in line with how even mostly-monochrome systems like shadcn keep one distinct "destructive" hue).

Token *names* are unchanged from the original palette (so `HeroLanding.tsx` and every consuming CSS rule needed no edits) — only their values changed, plus `--teal`/`--lime`/`--lime-dark` now alias the new accent tokens directly:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#141c17` | Page background (60%) — dark neutral with a faint green-black cast per the usage guideline. |
| `--white` | `#1f2b23` | Raised surface (60% family) — cards, panels, inputs. Deliberately separated from `--paper` rather than nearly matching it, so elevation reads clearly instead of flattening into one tone. |
| `--ink` | `#eef4ec` | Primary text (30%). |
| `--muted` | `#94a89a` | Secondary text (30% family). |
| `--line` / `--line-strong` | `#33453a` / `#46594c` | Hairline borders (30% family), stepped further from the surfaces than the first pass so panels visibly separate from their background. |
| `--accent` | `#a6e673` | Frog Green — the system's one primary/accent color (10%). Primary buttons, active/confirmed/live states, the frog mark. |
| `--accent-dark` | `#8bc95a` | Hover/pressed variant of `--accent`. |
| `--accent-ink` | `#0b140c` | Dark foreground for content sitting on an `--accent` fill (the accent itself is light). |
| `--accent-wash` | `#1c2a1a` | Low-opacity accent tint for badge/ring backgrounds. |
| `--teal` / `--lime` / `--lime-dark` | alias `--accent` / `--accent` / `--accent-dark` | Kept as aliases so pre-existing files that reference them by name (`HeroLanding.tsx`) render correctly under the new single-accent system without modification. |
| `--coral` / `--coral-dark` / `--caution-wash` | `#f0876f` / `#ffb49e` / `#2a1712` | The system's one semantic exception besides the accent — every caution/unverified/error surface uses this single pair (source badges for mere provider attribution stay neutral gray; only genuine warning states get color). |
| `--pond` / `--pond-ring` | `#16211a` / `#4c6b57` | Dark-surface wash and ripple/route linework for the hero illustration. Background/decoration only — never text. |

**Compliance boundary, stated plainly:** every *text* color pairing in the app targets WCAG AA (4.5:1) against the dark backgrounds. `--pond`/`--pond-ring` remain decorative-only tokens — never text, never the sole source of meaning — so they sit outside the 1.4.11 non-text-contrast requirement, same as before.

## Component conventions (shadcn/ui)

Buttons, cards, badges, inputs, and focus states follow [shadcn/ui](https://ui.shadcn.com/)'s conventions rather than the previous large-radius, heavily-shadowed "editorial" treatment:

- **Radius** — a consistent two-step scale, `--radius` (12px, cards/panels/primary buttons) and `--radius-sm` (8px, compact buttons/inputs/small badges), replacing the previous per-component values (16–28px).
- **Shadow** — `--shadow-sm`/`--shadow-md`, subtle near-black elevation shadows, replacing the previous large soft colored shadows (e.g. `0 24px 70px rgba(34,53,47,.08)`).
- **Buttons** — `.lp-primary` (solid accent, dark foreground) and `.lp-secondary` (bordered, transparent) mirror shadcn's `default`/`outline` variants.
- **Focus rings** — every interactive element gets a crisp 2px accent-colored `outline` with `outline-offset`, replacing the previous soft `rgba` glow.
- **Badges** — `.lp-source-badge` defaults to a neutral gray-on-dark pairing (per rule 16); only the two states that actually mean something — a confirmed/live signal — use the accent, matching shadcn's muted-background badge pattern.

## Shape language

- **Lily-pad circles** — rounded containers throughout the app (`.lp-panel`, `.lp-plan-card`, `.lp-flight-card`) already use this language; the brand system extends it rather than introducing a new container shape.
- **Ripple rings** — concentric circles (`RippleRing` primitive), used for "arrival" moments (hero illustration, recovery-completed icon).
- **Arc paths** — a single dashed arc with a start/end waypoint dot (`RouteArc` primitive), standing in for "the route so far," used in the hero illustration and the advisor-handoff icon.
- **Waypoint** — a ringed dot, for airports and named locations.
- **Water-drop** — a single teardrop accent, used sparingly (never as a repeated pattern/texture).
- **Frog silhouette** — `FrogMark`, `LandingPadMark`, and the hero illustration stay pure solid-fill silhouettes (body plus four splayed leg lobes, no facial detail) simply because that's the right shape language for a leaping-body pose, not because faces are disallowed. `FrogSignal` (see "Expressive states" below) is the face-forward counterpart, used wherever the frog is standing still and expressing a state rather than mid-leap.

## Motion language

Five named motions, implemented as CSS keyframes in `app/globals.css`, all scoped under `@media (prefers-reduced-motion: no-preference)` so the default experience for anyone who has requested reduced motion is completely static:

- **Leap** (`lp-leap`) — a brief arc-and-settle transform, used once on the hero frog.
- **Glide** — implicit in the leap's easing curve; not a separate keyframe.
- **Settle** — the tail end of `lp-leap` returning to rest.
- **Ripple** (`lp-ripple`) — concentric rings scaling outward and fading, staggered per ring.
- **Resolve** (`lp-resolve`) — the route arc's dash offset animating in, standing in for "the path becoming clear."

Nothing in the product UI (buttons, forms, plan cards) animates as part of this system — motion is confined to the decorative hero illustration on the start screen.

## Component architecture

```
components/brand/
  primitives.tsx      FrogMark, LilyPad, RippleRing, RouteArc, Waypoint, WaterDrop
  LandingPadMark.tsx   Primary combination mark (unused in-app since FrogSignal
                       replaced it in the header; kept for any external reference)
  HeroLanding.tsx      Recovery-start hero illustration
  FrogSignal.tsx       Expressive status signal — sad/neutral/happy face on a ring
components/icons/
  index.tsx            ProductIcon — the 13-name product icon family
app/icon.svg            App icon / favicon (Next.js icon file convention)
```

`components/brand/primitives.tsx` exports raw shape building blocks used to compose `LandingPadMark` and `HeroLanding`. `components/icons/index.tsx` exports a single `ProductIcon` component keyed by name — the same pattern the app's existing local `Icon` component (UI chrome: mic, arrow, check, copy) already follows, so the two icon sets sit side by side without competing conventions. `ProductIcon` names: `flight-disruption`, `airport`, `hotel`, `ground-transport`, `budget`, `travelers`, `room`, `time-pressure`, `advisor-handoff`, `evidence-source`, `user-confirmed`, `historical-aviation-data`, `recovery-completed`.

`historical-aviation-data` is the AeroXplorer-specific treatment — a plane silhouette inside a dashed orbit ring (evoking "circling back through history"), visually distinct from the plain `flight-disruption` glyph used for the broken original flight.

## Where it's applied

| Screen | Application |
|---|---|
| All screens (header) | `FrogSignal` in `.lp-brand-mark`, state derived from step progress: `sad` on Tell Us, `neutral` on Confirm, `happy` from Search through Handoff. |
| Start | `HeroLanding` illustration above the eyebrow line; `FrogSignal state="neutral"` on the voice button while connecting; `FrogSignal state="sad"` next to the notice on voice failure/mic-denied. |
| Confirm | `user-confirmed` icon on the "Confirmed by you" badge. |
| Search | `FrogSignal state="neutral"` in the loading orbit; each of the 5 progress rows keeps its vendor-matched `ProductIcon` (hotel, evidence-source, user-confirmed, historical-aviation-data, flight-disruption). |
| Compare | `historical-aviation-data` icon on the AeroXplorer badge and the flight-recovery historical-context line; `time-pressure`/`budget`/`room` icons distinguish the three plan cards (fastest/best-value/best-rest). |
| Handoff | `FrogSignal state="happy"` replaces the previous `recovery-completed` glyph in the success mark. |

## Accessibility

- Every brand/icon component defaults to `aria-hidden="true"` (or `role="presentation"` for the hero) because every use in this app pairs the graphic with a real text label — the icon is never the sole carrier of meaning. `ProductIcon` and the raw primitives accept an explicit `decorative={false}` + `title` pair for the rare case a future caller needs an accessible name instead.
- No new interactive elements were introduced — all new graphics sit inside existing buttons/badges/headings, so keyboard focus order and existing `:focus-visible` styling are untouched.
- Motion is gated behind `prefers-reduced-motion: no-preference`; the reduced-motion default is a fully static illustration.
- All new SVGs use relative viewBox scaling with fixed CSS pixel display sizes consistent with the app's existing icon sizing convention, so they scale correctly under browser/OS zoom the same way the pre-existing icon set already does.

## What's intentionally out of scope

Per-currency or per-locale icon variants, a light theme (the system is now single-theme, dark-only, matching the brand asset usage guideline), and animated icon states beyond the single hero illustration were not built — none were requested, and adding them now would be speculative. If a future request needs them, extend `components/icons/index.tsx` and this document together so they stay in sync.

The `HeroLanding` illustration and the 13-name `ProductIcon` family were **not** rebuilt around the expressive-face treatment — they stay pure silhouette (now re-colored via the token aliases described above, but structurally unchanged), since a leaping-body pose and a small product glyph aren't the contexts a face reads well in. `FrogSignal` covers every place the frog is standing still and signaling a state. Giving the hero illustration or individual `ProductIcon`s a face too would be a separate, larger follow-up if wanted.
