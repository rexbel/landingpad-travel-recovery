// Expressive status signal: a frog face on a dashed "landing pad" ring,
// built from the brand asset usage guidelines (frog silhouette on circular
// landing-pad outline; eyes for expression; mouth changes — frown/none/smile
// — for sad/neutral/happy). See docs/brand-guidelines.md's "Expressive
// states" section. Colors read from --accent (see globals.css for the
// current accent value/reasoning), not a hardcoded hue, so this component
// doesn't need to change when the accent does. FrogMark/LandingPadMark/
// HeroLanding stay pure silhouette by choice, not because faces are
// disallowed elsewhere.

export type FrogSignalState = "sad" | "neutral" | "happy";

export type FrogSignalProps = {
  size?: number;
  className?: string;
  state?: FrogSignalState;
} & (
  | { decorative?: true; title?: never }
  | { decorative: false; title: string }
);

function svgA11yProps(props: FrogSignalProps) {
  if (props.decorative === false) {
    return { role: "img" as const, "aria-label": props.title };
  }
  return { "aria-hidden": true as const };
}

// Traces the reference construction directly: two rounded eye-bumps at the
// top (with a shallow dip between them, not a smooth dome) widening into a
// single rounded body/chin below — one merged path, so it reads as one
// silhouette with no seam whether it's filled or stroked-only (neutral).
const HEAD_PATH =
  "M16 9.5C14.3 8 12.2 7.5 10.5 8.3 8.2 9.4 7 11.6 7 14c0 3.3 1.7 6.2 4.5 8 1.5 1 3 1.4 4.5 1.4s3-.4 4.5-1.4c2.8-1.8 4.5-4.7 4.5-8 0-2.4-1.2-4.6-3.5-5.7-1.7-.8-3.8-.3-5.5 1.2Z";

export function FrogSignal(props: FrogSignalProps) {
  const { size = 24, className, state = "neutral" } = props;

  // Neutral uses a white/currentColor ring and outline (unresolved, waiting);
  // sad and happy both use the accent green ring per the reference — only
  // the fill and mouth curve change between them.
  const ringColor = state === "neutral" ? "currentColor" : "var(--accent)";
  const headFill = state === "happy" ? "var(--accent)" : state === "sad" ? "var(--paper)" : "none";
  const headStroke = state === "neutral" ? "currentColor" : "var(--accent)";
  const faceInk = state === "happy" ? "var(--accent-ink)" : state === "neutral" ? "currentColor" : "var(--accent)";
  const mouthPath =
    state === "happy" ? "M11.5 18.5Q16 22 20.5 18.5" : state === "sad" ? "M11.5 21Q16 17.5 20.5 21" : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...svgA11yProps(props)}
    >
      <circle cx="16" cy="16" r="14.5" stroke={ringColor} strokeWidth="1.6" strokeDasharray="3 3.4" />
      <path d={HEAD_PATH} fill={headFill} stroke={headStroke} strokeWidth={state === "neutral" ? 1.5 : 0} />
      <circle cx="11.5" cy="11.8" r="2.3" fill={faceInk} />
      <circle cx="20.5" cy="11.8" r="2.3" fill={faceInk} />
      {mouthPath && <path d={mouthPath} stroke={faceInk} strokeWidth="1.5" strokeLinecap="round" fill="none" />}
    </svg>
  );
}
