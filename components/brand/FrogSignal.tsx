// Expressive status signal: a frog face on a dashed "landing pad" ring,
// built from the brand asset usage guidelines (frog silhouette on circular
// landing-pad outline; eyes for expression; mouth changes — frown/none/smile
// — for sad/neutral/happy). This supersedes, for status-signal contexts
// only, the earlier no-face rule documented in docs/brand-guidelines.md —
// see that file's "Expressive states" section for the reasoning. All other
// brand primitives (FrogMark, LandingPadMark, HeroLanding) stay pure
// silhouette; this is the one deliberate exception, reserved for
// loading/error/success moments, never a recurring illustrated character.

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

const HEAD_PATH =
  "M16 9c4.5 0 8 3.1 8 7.4 0 1.6-.5 3-1.6 4.1C20.7 22 18.5 23 16 23s-4.7-1-6.4-2.5C8.5 19.4 8 18 8 16.4 8 12.1 11.5 9 16 9Z";

export function FrogSignal(props: FrogSignalProps) {
  const { size = 24, className, state = "neutral" } = props;

  const headFill = state === "happy" ? "var(--accent)" : state === "sad" ? "var(--paper)" : "none";
  const headStroke = state === "neutral" ? "currentColor" : "var(--accent)";
  const faceInk = state === "happy" ? "var(--accent-ink)" : "var(--accent)";
  const mouthPath =
    state === "happy" ? "M12 17.5Q16 20.5 20 17.5" : state === "sad" ? "M12 19.5Q16 16.5 20 19.5" : null;

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
      <circle cx="16" cy="16" r="14.5" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="3 3.4" />
      <path d={HEAD_PATH} fill={headFill} stroke={headStroke} strokeWidth={state === "neutral" ? 1.5 : 0} />
      <circle cx="12.3" cy="14.4" r="1.5" fill={state === "neutral" ? "currentColor" : faceInk} />
      <circle cx="19.7" cy="14.4" r="1.5" fill={state === "neutral" ? "currentColor" : faceInk} />
      {mouthPath && <path d={mouthPath} stroke={faceInk} strokeWidth="1.4" strokeLinecap="round" fill="none" />}
    </svg>
  );
}
