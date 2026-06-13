import type { ComponentProps, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IconType = ComponentProps<typeof HugeiconsIcon>["icon"];

/**
 * Metric card (TRD §10) — label + large number, for the 2x2 dashboard grid.
 */
export function MetricCard({
  label,
  value,
  icon,
  hint,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  icon?: IconType;
  hint?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="relative gap-2 overflow-hidden">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            valueClassName,
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <div className="px-6 text-sm text-muted-foreground">{hint}</div>
      ) : null}
      {icon ? (
        <div className="absolute right-5 top-5 text-muted-foreground/60">
          <HugeiconsIcon icon={icon} className="size-5" />
        </div>
      ) : null}
    </Card>
  );
}
