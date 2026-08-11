// Expressive status signal: a frog face on a dashed "landing pad" ring, with
// three states (sad/neutral/happy). Built as a plain, recognizable cartoon
// frog — a wide head with two big round eyes sitting up on top of it, the
// same construction as a classic cartoon-frog face — rather than a precise
// trace of any reference art, since that read as an abstract blob instead
// of a frog. Colors read from --accent (see globals.css), not a hardcoded
// hue, so this component doesn't need to change when the accent does.

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

export function FrogSignal(props: FrogSignalProps) {
  const { size = 24, className, state = "neutral" } = props;

  const ringColor = state === "neutral" ? "currentColor" : "var(--accent)";
  const headFill = state === "happy" ? "var(--accent)" : state === "sad" ? "var(--muted)" : "var(--paper)";
  const headStroke = state === "neutral" ? "currentColor" : "var(--accent)";
  const eyeFill = "var(--paper)";
  const pupilFill = "var(--ink)";
  const mouthPath =
    state === "happy" ? "M10.5 21Q16 25 21.5 21" : state === "sad" ? "M10.5 23.5Q16 20 21.5 23.5" : null;

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

      {/* wide head, sitting low so the eyes have room to bulge up above it */}
      <ellipse cx="16" cy="19.5" rx="10.5" ry="7.5" fill={headFill} stroke={headStroke} strokeWidth={state === "neutral" ? 1.4 : 0} />

      {/* two big round eyes on top, the signature of a cartoon frog face */}
      <circle cx="10.5" cy="11" r="4.6" fill={eyeFill} stroke={headStroke} strokeWidth={state === "neutral" ? 1.4 : 0} />
      <circle cx="21.5" cy="11" r="4.6" fill={eyeFill} stroke={headStroke} strokeWidth={state === "neutral" ? 1.4 : 0} />
      <circle cx="10.5" cy="11" r="1.9" fill={pupilFill} />
      <circle cx="21.5" cy="11" r="1.9" fill={pupilFill} />

      {mouthPath && <path d={mouthPath} stroke={pupilFill} strokeWidth="1.5" strokeLinecap="round" fill="none" />}
    </svg>
  );
}
