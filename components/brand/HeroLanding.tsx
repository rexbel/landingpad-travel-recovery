// Hero illustration for the recovery-start screen: the brand asset's actual
// frog artwork (public/brand/frog-hero.png), used directly rather than
// redrawn as SVG. A plain <img>, not next/image, so this file stays free of
// non-React/non-@/components imports per tests/brand-assets-safety.test.ts.
// Purely atmospheric — the surrounding heading/copy carries the actual
// meaning, so it's decorative (empty alt) rather than given real alt text.

export function HeroLanding({ className }: { className?: string }) {
  return (
    <img
      src="/brand/frog-hero.png"
      alt=""
      width={759}
      height={425}
      className={className}
    />
  );
}
