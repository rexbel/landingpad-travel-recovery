# LandingPad visual identity

## The metaphor

A traveler's plan just fell through mid-air. LandingPad's job is to get them to a calm, confirmed landing — not to entertain them on the way down. The brand metaphor is a frog leaping toward a lily pad: mid-air disruption, a deliberate arc, and a stable, circular landing spot that ripples outward once you're on it.

Three product moments map directly onto the metaphor:

- **Disrupted** — mid-leap, no landing point yet (start screen).
- **Recovering** — the arc toward a chosen pad (search/compare screens).
- **Landed** — settled, ripple resolving outward (handoff screen).

## What this identity deliberately avoids

Clip art, emoji, photorealistic textures, cartoon eyes or any other mascot-style face, jungle/pond scenery as literal background art, decorative AI-gradient blobs, and mascot overload (the frog appears as a mark or a single hero moment — never as a recurring cartoon character narrating the UI). The tone is mature editorial illustration: flat shapes, confident line work, restrained color, no anthropomorphizing.

## Palette

Extends the existing tokens in `app/globals.css` — nothing was replaced:

| Token | Value | Use |
|---|---|---|
| `--teal` | `#0d5d52` | Primary brand color — frog silhouette, primary actions (unchanged, pre-existing). |
| `--lime` / `--lime-dark` | `#d9f36a` / `#b9d848` | Accent — lily pad surface, recommended badges (unchanged, pre-existing). |
| `--coral` | `#ec725f` | Soft fills only (unchanged, pre-existing — not new). |
| `--coral-dark` | `#c94f3d` *(new)* | AA-safe icon-stroke variant of `--coral` (≈3:1 against `--paper`/`--white`). Reserved for urgency accents, e.g. the "fastest recovery" plan icon. |
| `--pond` | `#e3f1ec` *(new)* | Background wash for water motifs (hero illustration base). Background/decoration only — never text. |
| `--pond-ring` | `#9fc9bd` *(new)* | Ripple-ring and route-arc linework, and quiet decorative icon accents. Background/decoration only — never text. |

**Compliance boundary, stated plainly:** every *text* color pairing in the app (existing and new) targets WCAG AA (4.5:1). `--pond`/`--pond-ring` are decorative-only tokens — they never carry text and are never the sole source of meaning, so they sit outside the 1.4.11 non-text-contrast requirement, the same way the existing `--muted`/`#a0aaa6` decorative tones already do (see `.lp-plan-index`). Anywhere an icon is the *only* signal (none exist in this app — every icon here is paired with a text label), it should use `--coral-dark` or `--teal`, not `--pond-ring`.

## Shape language

- **Lily-pad circles** — rounded containers throughout the app (`.lp-panel`, `.lp-plan-card`, `.lp-flight-card`) already use this language; the brand system extends it rather than introducing a new container shape.
- **Ripple rings** — concentric circles (`RippleRing` primitive), used for "arrival" moments (hero illustration, recovery-completed icon).
- **Arc paths** — a single dashed arc with a start/end waypoint dot (`RouteArc` primitive), standing in for "the route so far," used in the hero illustration and the advisor-handoff icon.
- **Waypoint** — a ringed dot, for airports and named locations.
- **Water-drop** — a single teardrop accent, used sparingly (never as a repeated pattern/texture).

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
  LandingPadMark.tsx   Primary combination mark (header glyph)
  HeroLanding.tsx      Recovery-start hero illustration
components/icons/
  index.tsx            ProductIcon — the 13-name product icon family
app/icon.svg            App icon / favicon (Next.js icon file convention)
```

`components/brand/primitives.tsx` exports raw shape building blocks used to compose `LandingPadMark` and `HeroLanding`. `components/icons/index.tsx` exports a single `ProductIcon` component keyed by name — the same pattern the app's existing local `Icon` component (UI chrome: mic, arrow, check, copy) already follows, so the two icon sets sit side by side without competing conventions. `ProductIcon` names: `flight-disruption`, `airport`, `hotel`, `ground-transport`, `budget`, `travelers`, `room`, `time-pressure`, `advisor-handoff`, `evidence-source`, `user-confirmed`, `historical-aviation-data`, `recovery-completed`.

`historical-aviation-data` is the AeroXplorer-specific treatment — a plane silhouette inside a dashed orbit ring (evoking "circling back through history"), visually distinct from the plain `flight-disruption` glyph used for the broken original flight.

## Where it's applied

| Screen | Application |
|---|---|
| All screens (header) | `LandingPadMark` replaces the previous generic plane/spark glyph in `.lp-brand-mark`. |
| Start | `HeroLanding` illustration above the eyebrow line. |
| Confirm | `user-confirmed` icon on the "Confirmed by you" badge. |
| Search | Each of the 5 progress rows gets a vendor-matched `ProductIcon` (hotel, evidence-source, user-confirmed, historical-aviation-data, flight-disruption). |
| Compare | `historical-aviation-data` icon on the AeroXplorer badge and the flight-recovery historical-context line; `time-pressure`/`budget`/`room` icons distinguish the three plan cards (fastest/best-value/best-rest). |
| Handoff | `recovery-completed` icon (lily pad + check) replaces the generic checkmark in the success mark. |

## Accessibility

- Every brand/icon component defaults to `aria-hidden="true"` (or `role="presentation"` for the hero) because every use in this app pairs the graphic with a real text label — the icon is never the sole carrier of meaning. `ProductIcon` and the raw primitives accept an explicit `decorative={false}` + `title` pair for the rare case a future caller needs an accessible name instead.
- No new interactive elements were introduced — all new graphics sit inside existing buttons/badges/headings, so keyboard focus order and existing `:focus-visible` styling are untouched.
- Motion is gated behind `prefers-reduced-motion: no-preference`; the reduced-motion default is a fully static illustration.
- All new SVGs use relative viewBox scaling with fixed CSS pixel display sizes consistent with the app's existing icon sizing convention, so they scale correctly under browser/OS zoom the same way the pre-existing icon set already does.

## What's intentionally out of scope

Per-currency or per-locale icon variants, a second color theme, and animated icon states beyond the single hero illustration were not built — none were requested, and adding them now would be speculative. If a future request needs them, extend `components/icons/index.tsx` and this document together so they stay in sync.
