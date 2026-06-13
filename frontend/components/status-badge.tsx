import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";
import type {
  AppealStatus,
  ClaimStatus,
  Classification,
} from "@/lib/types";

/**
 * Status badge primitive (TRD §10) — each state a distinct semantic color,
 * layered on the preset theme via the --status-* tokens in globals.css.
 */
const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        paid: "border-status-paid/30 bg-status-paid/10 text-status-paid",
        denied: "border-status-denied/30 bg-status-denied/10 text-status-denied",
        appealed:
          "border-status-appealed/30 bg-status-appealed/10 text-status-appealed",
        pending:
          "border-status-pending/30 bg-status-pending/10 text-status-pending",
        recovered:
          "border-status-recovered/30 bg-status-recovered/10 text-status-recovered",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Tone = NonNullable<VariantProps<typeof statusBadge>["tone"]>;

const CLAIM_TONE: Record<ClaimStatus, Tone> = {
  submitted: "neutral",
  paid: "paid",
  partially_paid: "paid",
  denied: "denied",
  appealed: "appealed",
  resolved: "recovered",
  written_off: "neutral",
};

const APPEAL_TONE: Record<AppealStatus, Tone> = {
  drafted: "pending",
  submitted: "appealed",
  won: "recovered",
  lost: "denied",
  pending: "pending",
};

const CLASSIFICATION_TONE: Record<Classification, Tone> = {
  appeal: "appealed",
  resubmit: "pending",
  write_off: "neutral",
};

export function StatusBadge({
  value,
  kind,
  className,
}: {
  value: string;
  kind: "claim" | "appeal" | "classification";
  className?: string;
}) {
  let tone: Tone = "neutral";
  if (kind === "claim") tone = CLAIM_TONE[value as ClaimStatus] ?? "neutral";
  else if (kind === "appeal")
    tone = APPEAL_TONE[value as AppealStatus] ?? "neutral";
  else tone = CLASSIFICATION_TONE[value as Classification] ?? "neutral";

  return (
    <span className={cn(statusBadge({ tone }), className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {titleCase(value)}
    </span>
  );
}
