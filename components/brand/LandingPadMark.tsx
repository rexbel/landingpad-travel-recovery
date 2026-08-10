// Primary combination mark: a leaping frog silhouette settling onto a lily
// pad, rendered as a single flat monochrome glyph so it stays legible at the
// header/favicon scale it's actually used at. Pairs with the "LandingPad"
// wordmark set separately in markup — this component is the glyph only.

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
      <path
        d="M16 8.2c3.5 0 6.35 2.28 7.34 5.46.37 1.2.27 2.53-.37 3.6C21.6 19.75 18.98 21.2 16 21.2s-5.6-1.45-6.97-3.94c-.64-1.07-.74-2.4-.37-3.6C9.65 10.48 12.5 8.2 16 8.2Z"
        fill="currentColor"
      />
      <path
        d="M9.3 12c-1.65-.75-2.75-2.25-3.05-4.05M7.5 15.3c-1.8.13-3.45-.66-4.45-2.15M22.7 12c1.65-.75 2.75-2.25 3.05-4.05M24.5 15.3c1.8.13 3.45-.66 4.45-2.15"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
