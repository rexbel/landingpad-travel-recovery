// Primary combination mark: a leaping frog silhouette settling onto a lily
// pad, rendered as a single flat monochrome glyph so it stays legible at the
// header/favicon scale it's actually used at. Pairs with the "LandingPad"
// wordmark set separately in markup — this component is the glyph only.
// Pure silhouette: one solid fill, no stroke linework, no face — the leap
// posture (body + four splayed legs) is what reads as "frog," same as
// FrogMark in primitives.tsx.

export function LandingPadMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16 15c6-2.4 10.5-1.2 12.5 1.3-2.7 6.8-8.9 10.4-16 8.9L16 15Z" fill="currentColor" opacity="0.55" />
      <g fill="currentColor">
        <path d="M16 8.2c3.5 0 6.35 2.28 7.34 5.46.37 1.2.27 2.53-.37 3.6C21.6 19.75 18.98 21.2 16 21.2s-5.6-1.45-6.97-3.94c-.64-1.07-.74-2.4-.37-3.6C9.65 10.48 12.5 8.2 16 8.2Z" />
        <ellipse cx="10" cy="8.6" rx="3.7" ry="1.65" transform="rotate(-35 10 8.6)" />
        <ellipse cx="22" cy="8.6" rx="3.7" ry="1.65" transform="rotate(35 22 8.6)" />
        <ellipse cx="8.6" cy="19.2" rx="4.3" ry="1.75" transform="rotate(38 8.6 19.2)" />
        <ellipse cx="23.4" cy="19.2" rx="4.3" ry="1.75" transform="rotate(-38 23.4 19.2)" />
      </g>
    </svg>
  );
}
