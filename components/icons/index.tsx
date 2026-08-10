import type { ReactNode } from "react";

// Product icon family for LandingPad. Stroke-based pictograms (matching the
// weight of the existing header/UI icon set) that lean on the same shape
// vocabulary as the brand marks — rounded containers, ring/orbit accents,
// arc paths, a water-drop for urgency — without literally reusing the frog
// silhouette outside brand contexts.
//
// Usage: <ProductIcon name="hotel" /> is decorative by default (aria-hidden).
// Pass title (and decorative={false} is implied) when the icon is the only
// label for a control and needs an accessible name.

export type ProductIconName =
  | "flight-disruption"
  | "airport"
  | "hotel"
  | "ground-transport"
  | "budget"
  | "travelers"
  | "room"
  | "time-pressure"
  | "advisor-handoff"
  | "evidence-source"
  | "user-confirmed"
  | "historical-aviation-data"
  | "recovery-completed";

const PATHS: Record<ProductIconName, ReactNode> = {
  "flight-disruption": (
    <>
      <path d="M21 3 9.8 14.2M21 3l-7.3 18-4-6.8L3 10.8 21 3Z" />
      <path d="m14.5 14.5 2 2M17 12l2 2M12 17l2 2" strokeDasharray="0.1 3.2" />
    </>
  ),
  airport: (
    <>
      <circle cx="12" cy="9.5" r="6.5" />
      <circle cx="12" cy="9.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M5 20h14" />
    </>
  ),
  hotel: (
    <>
      <rect x="3" y="10.5" width="18" height="8" rx="2.5" />
      <path d="M3 14.5h18M7 10.5V8a2 2 0 0 1 2-2h1.5" />
      <circle cx="8.6" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  "ground-transport": (
    <>
      <path d="M4 16V12l2.2-4.4A2 2 0 0 1 8 6.5h8a2 2 0 0 1 1.8 1.1L20 12v4" />
      <path d="M4 16h16M4 16a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 0 0-3.2 0Zm12.8 0a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 0 0-3.2 0Z" />
    </>
  ),
  budget: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M8.6 12h6.8" />
    </>
  ),
  travelers: (
    <>
      <circle cx="8.6" cy="8" r="3" />
      <path d="M3 19c.6-3.4 2.8-5.2 5.6-5.2s5 1.8 5.6 5.2" />
      <circle cx="16.3" cy="7.2" r="2.3" opacity="0.6" />
      <path d="M14.6 13.1c2.4.2 4 1.9 4.5 4.9" opacity="0.6" />
    </>
  ),
  room: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <circle cx="14.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  "time-pressure": (
    <>
      <circle cx="11.5" cy="12.5" r="7.5" />
      <path d="M11.5 8.2V12.5l3.4 2" />
      <path d="M17.5 4.5c1.7 1 2.9 2.6 3.3 4.5a4.6 4.6 0 0 1-.4 3" fill="none" />
    </>
  ),
  "advisor-handoff": (
    <>
      <path d="M4 17c2-7 8-11 16-9.5" strokeDasharray="0.1 3.4" />
      <circle cx="4" cy="17" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="7.5" r="2" />
    </>
  ),
  "evidence-source": (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </>
  ),
  "user-confirmed": (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.3 12.3 2.6 2.6 4.8-5.2" />
    </>
  ),
  "historical-aviation-data": (
    <>
      <circle cx="12" cy="12" r="8.4" strokeDasharray="1 3.6" opacity="0.7" />
      <path d="M20 6.5 10.8 15.7M20 6.5l-5.6 12.8-2.7-4.6L7 12l13-5.5Z" />
    </>
  ),
  "recovery-completed": (
    <>
      <path d="M12 4.5a9 9 0 1 1-5.7 16Z" />
      <path d="m8.7 12.6 2.3 2.3 4.3-4.6" />
    </>
  ),
};

export function ProductIcon(
  props: { name: ProductIconName; size?: number; className?: string } & (
    | { decorative?: true; title?: never }
    | { decorative: false; title: string }
  ),
) {
  const { name, size = 20, className } = props;
  const a11y = props.decorative === false ? { role: "img" as const, "aria-label": props.title } : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...a11y}
    >
      {PATHS[name]}
    </svg>
  );
}
