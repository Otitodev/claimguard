/* eslint-disable @next/next/no-img-element */

/**
 * Blue stacked-wave backdrop for the hero. The artwork lives at
 * `public/wave-backdrop.svg` (a 1600×900 Haikei export) — to restyle it,
 * re-export at the same ratio and replace that one file, no code change.
 * `object-cover` scales it to fill the panel while preserving the wave shapes.
 */
export function WaveBackdrop({ className }: { className?: string }) {
  return (
    <img
      src="/wave-backdrop.svg"
      alt=""
      aria-hidden
      className={`${className ?? ""} object-cover`}
    />
  );
}
