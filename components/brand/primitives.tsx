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
 * Pure silhouette of a leaping amphibian — one solid fill, no stroke
 * linework, no eyes or face. Body plus four splayed legs (short reaching
 * front pair, longer trailing back pair) is what reads as "frog"; the
 * leap posture carries the meaning, not surface detail.
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
      <g fill={color}>
        <ellipse cx="16" cy="15" rx="7.4" ry="6.6" />
        <ellipse cx="10" cy="9" rx="4.6" ry="2.1" transform="rotate(-38 10 9)" />
        <ellipse cx="22" cy="9" rx="4.6" ry="2.1" transform="rotate(38 22 9)" />
        <ellipse cx="8.5" cy="21.5" rx="5.6" ry="2.3" transform="rotate(42 8.5 21.5)" />
        <ellipse cx="23.5" cy="21.5" rx="5.6" ry="2.3" transform="rotate(-42 23.5 21.5)" />
      </g>
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
