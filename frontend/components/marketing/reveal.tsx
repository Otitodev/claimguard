"use client";

import type { ReactNode } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Fades + slides its children up as they enter the viewport (once).
 * Honors prefers-reduced-motion: reduced-motion users see the final state
 * with no transition.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out will-change-[opacity,transform]",
        // Hidden start state only applies when JS is active;
        // no-JS visitors always see the content.
        // Only translate — keep opacity 1 so content is always readable
        !inView && "js:translate-y-4",
        "motion-reduce:translate-y-0 motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
