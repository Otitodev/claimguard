"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "@/hooks/use-in-view";

export function AnimatedStat({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView();
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      const duration = 1500;
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * value));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, value]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <p className="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
        {count}
        {suffix}
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
