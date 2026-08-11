// Hero illustration for the recovery-start screen: a frog mid-leap, with a
// trail of small planes advancing toward it standing in for "the trip so
// far" and a gentle ripple on the pond itself standing in for "where you're
// about to land." Purely atmospheric — the surrounding heading/copy carries
// the actual meaning, so this is marked decorative (aria-hidden) rather than
// given alt text. Motion is opt-in via .lp-hero-animate and respects
// prefers-reduced-motion in app/globals.css. The head reuses FrogSignal's
// exact face construction (wide head, two big round eyes on top) scaled up,
// so the hero reads as the same character as the header/status icon.

// A single small paper-plane dart, drawn pointing along +x; each instance
// below translates it onto the route arc and rotates it to the arc's
// tangent there, so the trail reads as planes banking through the climb
// toward the frog.
const PLANE_PATH = "M-3 0 2.6 -2 1 0 2.6 2Z";

export function HeroLanding({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      className={className}
      role="presentation"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="160" cy="176" rx="150" ry="30" fill="var(--pond)" className="lp-hero-pond" />

      <g className="lp-hero-route" fill="var(--pond-ring)">
        <g transform="translate(47.6 133.3) rotate(-61.6)" opacity="0.35"><path d={PLANE_PATH} /></g>
        <g transform="translate(68.5 104.8) rotate(-45.8)" opacity="0.5"><path d={PLANE_PATH} /></g>
        <g transform="translate(96.3 83.3) rotate(-29.8)" opacity="0.65"><path d={PLANE_PATH} /></g>
        <g transform="translate(130 69.7) rotate(-14.4)" opacity="0.8"><path d={PLANE_PATH} /></g>
        <g transform="translate(168.9 64.8) rotate(-0.2)"><path d={PLANE_PATH} /></g>
      </g>

      <g className="lp-hero-leap">
        {/* back legs (haunches) — drawn first, kicked out well past the
            body's silhouette so they read clearly */}
        <g fill="var(--teal)">
          <ellipse cx="193" cy="148" rx="15" ry="9" transform="rotate(-20 193 148)" />
          <ellipse cx="251" cy="148" rx="15" ry="9" transform="rotate(20 251 148)" />
        </g>

        {/* body */}
        <ellipse cx="222" cy="140" rx="23" ry="17" fill="var(--teal)" />

        {/* front legs, tucked near the head/body join */}
        <g fill="var(--teal)">
          <ellipse cx="201" cy="123" rx="9" ry="4" transform="rotate(-35 201 123)" />
          <ellipse cx="243" cy="123" rx="9" ry="4" transform="rotate(35 243 123)" />
        </g>

        {/* face — identical construction to FrogSignal (wide head, two big
            eyes on top), scaled up, so the two read as one character */}
        <g transform="translate(222 110) scale(1.55) translate(-16 -16)">
          <ellipse cx="16" cy="19.5" rx="10.5" ry="7.5" fill="var(--teal)" />
          <circle cx="10.5" cy="11" r="4.6" fill="var(--paper)" />
          <circle cx="21.5" cy="11" r="4.6" fill="var(--paper)" />
          <circle cx="10.5" cy="11" r="1.9" fill="var(--ink)" />
          <circle cx="21.5" cy="11" r="1.9" fill="var(--ink)" />
          <path d="M10.5 21Q16 25 21.5 21" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </svg>
  );
}
