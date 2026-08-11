// Hero illustration for the recovery-start screen: a frog mid-leap toward a
// lily pad, with a route arc behind it standing in for "the trip so far" and
// ripple rings standing in for "where you're about to land." Purely
// atmospheric — the surrounding heading/copy carries the actual meaning, so
// this is marked decorative (aria-hidden) rather than given alt text.
// Motion is opt-in via .lp-hero-animate and respects prefers-reduced-motion
// in app/globals.css. The head reuses FrogSignal's twin eye-bump silhouette
// (scaled up, same construction) with a matching pair of eyes so the hero
// reads as the same character as the header/status icon, not a separate one.

export function HeroLanding({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      className={className}
      role="presentation"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="160" cy="176" rx="150" ry="30" fill="var(--pond)" />

      <path
        d="M40 150c22-58 78-92 150-84"
        stroke="var(--pond-ring)"
        strokeWidth="1.6"
        strokeDasharray="1 7"
        strokeLinecap="round"
        fill="none"
        className="lp-hero-route"
      />
      <circle cx="40" cy="150" r="3.2" fill="var(--pond-ring)" />

      <g className="lp-hero-ripple">
        <circle cx="222" cy="150" r="16" stroke="var(--teal)" strokeWidth="1.4" opacity="0.5" fill="none" />
        <circle cx="222" cy="150" r="27" stroke="var(--teal)" strokeWidth="1.2" opacity="0.3" fill="none" />
        <circle cx="222" cy="150" r="38" stroke="var(--teal)" strokeWidth="1" opacity="0.16" fill="none" />
      </g>

      <path d="M222 150a46 15 0 1 1 0.01 0Z" fill="var(--lime)" />

      <g className="lp-hero-leap">
        <path
          d="M222 128c14-6 25-3 30 4-6 15-21 24-38 21l8-25Z"
          fill="var(--teal)"
          opacity="0.55"
        />
        <g fill="var(--teal)">
          <ellipse cx="211" cy="111" rx="7.2" ry="3.1" transform="rotate(-35 211 111)" />
          <ellipse cx="233" cy="111" rx="7.2" ry="3.1" transform="rotate(35 233 111)" />
          <ellipse cx="205.5" cy="126" rx="8.6" ry="3.5" transform="rotate(38 205.5 126)" />
          <ellipse cx="238.5" cy="126" rx="8.6" ry="3.5" transform="rotate(-38 238.5 126)" />
          <path d="M222 108C218.6 105 214.4 104 211 105.6 206.4 107.8 204 112.2 204 117 204 123.6 207.4 129.4 213 133 216 135 219 135.8 222 135.8 225 135.8 228 135 231 133 236.6 129.4 240 123.6 240 117 240 112.2 237.6 107.8 233 105.6 229.6 104 225.4 105 222 108Z" />
        </g>
        <circle cx="213" cy="112.6" r="4.6" fill="var(--paper)" />
        <circle cx="231" cy="112.6" r="4.6" fill="var(--paper)" />
      </g>
    </svg>
  );
}
