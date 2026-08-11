// Expressive status signal: a frog face on a dashed "landing pad" ring, with
// three states (sad/neutral/happy). Traces the brand asset's reference
// illustration: one continuous tall-egg head/body silhouette, two big eyes
// that nearly touch at the top with a shared up-left gaze, and a smile set
// high on the face. Built at a larger local scale and scaled down into the
// 32x32 viewBox for crisper curves. Colors read from --accent (see
// globals.css), not a hardcoded hue. (The recovery-start hero uses the
// brand asset's actual artwork directly — see HeroLanding.tsx — rather
// than this geometry, so this file's shapes are local-only.)

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

// Local coordinate system: a tall narrow egg body from (48,58) to
// (152,212), with two large eyes that nearly touch at the top and share a
// gaze offset up-and-left, and a smile set high on the face.
const FROG_BODY_PATH =
  "M100 58C120 58 138 70 145 95C152 120 150 150 148 170C146 190 130 208 100 212C70 208 54 190 52 170C50 150 48 120 55 95C62 70 80 58 100 58Z";
const FROG_EYE_L = { cx: 76, cy: 45, r: 28 };
const FROG_EYE_R = { cx: 124, cy: 45, r: 28 };
const FROG_PUPIL_L = { cx: 68, cy: 36, r: 11 };
const FROG_PUPIL_R = { cx: 116, cy: 36, r: 11 };
const FROG_MOUTH_HAPPY = "M65 92Q100 108 135 92";
const FROG_MOUTH_SAD = "M65 100Q100 84 135 100";

export function FrogSignal(props: FrogSignalProps) {
  const { size = 24, className, state = "neutral" } = props;

  const ringColor = state === "neutral" ? "currentColor" : "var(--accent)";
  const bodyFill = state === "happy" ? "var(--teal)" : state === "sad" ? "var(--muted)" : "var(--paper)";
  const lineColor = state === "neutral" ? "currentColor" : "var(--accent)";
  const mouth = state === "happy" ? FROG_MOUTH_HAPPY : state === "sad" ? FROG_MOUTH_SAD : null;

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

      <g transform="translate(16 16) scale(0.125) translate(-100 -114.5)">
        <path d={FROG_BODY_PATH} fill={bodyFill} stroke={lineColor} strokeWidth={state === "neutral" ? 3 : 0} />
        <circle cx={FROG_EYE_L.cx} cy={FROG_EYE_L.cy} r={FROG_EYE_L.r} fill="var(--paper)" stroke={lineColor} strokeWidth="3" />
        <circle cx={FROG_EYE_R.cx} cy={FROG_EYE_R.cy} r={FROG_EYE_R.r} fill="var(--paper)" stroke={lineColor} strokeWidth="3" />
        <circle cx={FROG_PUPIL_L.cx} cy={FROG_PUPIL_L.cy} r={FROG_PUPIL_L.r} fill="var(--ink)" />
        <circle cx={FROG_PUPIL_R.cx} cy={FROG_PUPIL_R.cy} r={FROG_PUPIL_R.r} fill="var(--ink)" />
        {mouth && <path d={mouth} stroke="var(--paper)" strokeWidth="6" strokeLinecap="round" fill="none" />}
      </g>
    </svg>
  );
}
