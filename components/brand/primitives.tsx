// Reusable SVG primitives for the LandingPad frog-on-lily-pad identity.
// Shape language only — no photographic, cartoon-eyed, or mascot treatment.
// See docs/brand-guidelines.md for the rationale behind each shape.

export type BrandPrimitiveProps = {
  size?: number;
  className?: string;
  color?: string;
} & (
  | { decorative?: true; title?: never }
  | { decorative: false; title: string }
);

function svgA11yProps(props: BrandPrimitiveProps) {
  if (props.decorative === false) {
    return { role: "img" as const, "aria-label": props.title };
  }
  return { "aria-hidden": true as const };
}

/**
 * Abstracted leaping-amphibian silhouette — a single smooth body form with
 * tucked rear legs and reaching front legs. Deliberately has no eyes or face:
 * the leap posture alone reads as "frog" without tipping into mascot/clip-art
 * territory.
 */
export function FrogMark(props: BrandPrimitiveProps) {
  const { size = 24, className, color = "currentColor" } = props;
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
      <path
        d="M16 7.5c3.9 0 7.1 2.55 8.2 6.1.42 1.36.3 2.86-.42 4.08C22.3 20.1 19.4 21.7 16 21.7s-6.3-1.6-7.78-4.02c-.72-1.22-.84-2.72-.42-4.08 1.1-3.55 4.3-6.1 8.2-6.1Z"
        fill={color}
      />
      <path
        d="M8.4 11.6c-1.9-.85-3.15-2.55-3.5-4.6M6.3 15.4c-2.05.15-3.95-.75-5.1-2.45M23.6 11.6c1.9-.85 3.15-2.55 3.5-4.6M25.7 15.4c2.05.15 3.95-.75 5.1-2.45"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <ellipse cx="12.4" cy="14.6" rx="1.15" ry="1.35" fill="var(--paper, #f6f4ed)" />
      <ellipse cx="19.6" cy="14.6" rx="1.15" ry="1.35" fill="var(--paper, #f6f4ed)" />
    </svg>
  );
}

/** Circular leaf with a single notch — the classic lily-pad silhouette. */
export function LilyPad(props: BrandPrimitiveProps) {
  const { size = 24, className, color = "currentColor" } = props;
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
      <path
        d="M16 4a12 12 0 1 1-7.6 21.3L16 16Z"
        fill={color}
      />
    </svg>
  );
}

/** Concentric rings expanding from a landing point. */
export function RippleRing(props: BrandPrimitiveProps & { rings?: number }) {
  const { size = 24, className, color = "currentColor", rings = 3 } = props;
  const radii = Array.from({ length: rings }, (_, i) => 5 + i * (11 / Math.max(rings - 1, 1)));
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
      {radii.map((r, i) => (
        <circle key={r} cx="16" cy="16" r={r} stroke={color} strokeWidth={1.6} opacity={1 - i * (0.55 / rings)} />
      ))}
    </svg>
  );
}

/** A single arcing path with a terminal waypoint dot — a recovery route. */
export function RouteArc(props: BrandPrimitiveProps) {
  const { size = 24, className, color = "currentColor" } = props;
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
      <path d="M5 22c3-9 12-15 22-13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="1 5.5" />
      <circle cx="5" cy="22" r="2.1" fill={color} />
      <circle cx="27" cy="9" r="2.1" fill={color} />
    </svg>
  );
}

/** A pin-style marker — ringed dot — for airports and named locations. */
export function Waypoint(props: BrandPrimitiveProps) {
  const { size = 24, className, color = "currentColor" } = props;
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
      <circle cx="16" cy="16" r="10.5" stroke={color} strokeWidth={1.8} />
      <circle cx="16" cy="16" r="3.4" fill={color} />
    </svg>
  );
}

/** A single teardrop accent, used sparingly as a bullet or emphasis mark. */
export function WaterDrop(props: BrandPrimitiveProps) {
  const { size = 24, className, color = "currentColor" } = props;
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
      <path
        d="M16 4c4.5 6.1 8 10.9 8 15.2A8 8 0 1 1 8 19.2C8 14.9 11.5 10.1 16 4Z"
        fill={color}
      />
    </svg>
  );
}
