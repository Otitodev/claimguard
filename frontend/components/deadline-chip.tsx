import { HugeiconsIcon } from "@hugeicons/react";
import { Clock05Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

/**
 * Deadline chip (TRD §10) — escalates muted -> amber -> red as the appeal
 * deadline approaches.
 */
export function DeadlineChip({
  days,
  className,
}: {
  days: number | null;
  className?: string;
}) {
  if (days === null || days === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const tone =
    days <= 2
      ? "border-status-denied/30 bg-status-denied/10 text-status-denied"
      : days <= 7
        ? "border-status-pending/30 bg-status-pending/10 text-status-pending"
        : "border-border bg-muted text-muted-foreground";

  const label =
    days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <HugeiconsIcon icon={Clock05Icon} className="size-3" />
      {label}
    </span>
  );
}
