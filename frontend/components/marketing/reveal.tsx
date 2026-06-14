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
        // Visible by default; the hidden start state only applies when JS is
        // active (.js on <html>), so no-JS visitors always see the content.
        !inView && "js:translate-y-4 js:opacity-0",
        "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
