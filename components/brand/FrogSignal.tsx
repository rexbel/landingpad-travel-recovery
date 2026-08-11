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

// Rounder, wider silhouette than a plain oval — a flatter chin and slightly
// raised temple line reads closer to the reference frog-head construction
// (eyes sitting up and out) than a simple circle does.
const HEAD_PATH =
  "M16 8.6c4.9 0 8.8 3.5 8.8 8 0 1.7-.5 3.2-1.5 4.5-1.7 2.3-4.5 3.8-7.3 3.8s-5.6-1.5-7.3-3.8c-1-1.3-1.5-2.8-1.5-4.5 0-4.5 3.9-8 8.8-8Z";

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
    state === "happy" ? "M11.5 18Q16 21.5 20.5 18" : state === "sad" ? "M11.5 20.5Q16 17 20.5 20.5" : null;

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
      <circle cx="11.6" cy="14.6" r="1.9" fill={faceInk} />
      <circle cx="20.4" cy="14.6" r="1.9" fill={faceInk} />
      {mouthPath && <path d={mouthPath} stroke={faceInk} strokeWidth="1.5" strokeLinecap="round" fill="none" />}
    </svg>
  );
}
