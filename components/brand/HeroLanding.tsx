// Hero illustration for the recovery-start screen: a frog mid-leap toward a
// lily pad, with a route arc behind it standing in for "the trip so far" and
// ripple rings standing in for "where you're about to land." Purely
// atmospheric — the surrounding heading/copy carries the actual meaning, so
// this is marked decorative (aria-hidden) rather than given alt text.
// Motion is opt-in via .lp-hero-animate and respects prefers-reduced-motion
// in app/globals.css.

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
        <path
          d="M222 108c8.5 0 15.4 5.5 17.8 13.2.9 2.9.65 6.1-.9 8.7-3.2 5.6-9.7 9.2-16.9 9.2s-13.7-3.6-16.9-9.2c-1.55-2.6-1.8-5.8-.9-8.7 2.4-7.7 9.3-13.2 17.8-13.2Z"
          fill="var(--teal)"
        />
        <path
          d="M206 116.5c-4.3-2-7.2-5.9-8-10.6M201.5 125c-4.7.3-9-1.7-11.6-5.4M238 116.5c4.3-2 7.2-5.9 8-10.6M242.5 125c4.7.3 9-1.7 11.6-5.4"
          stroke="var(--teal)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
