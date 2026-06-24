import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity02Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  DocumentValidationIcon,
  FileEditIcon,
  Mail01Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { ActivityOut } from "@/lib/types";

type IconType = Parameters<typeof HugeiconsIcon>[0]["icon"];

const META: Record<string, { icon: IconType; label: string }> = {
  uploaded: { icon: CloudUploadIcon, label: "Document uploaded" },
  received_email: { icon: Mail01Icon, label: "Received via email" },
  parsed: { icon: DocumentValidationIcon, label: "EOB parsed" },
  classified: { icon: Activity02Icon, label: "Denial classified" },
  appeal_drafted: { icon: FileEditIcon, label: "Appeal drafted" },
  appeal_submitted: { icon: Sent02Icon, label: "Appeal submitted" },
  appeal_won: { icon: CheckmarkCircle02Icon, label: "Appeal won" },
  appeal_lost: { icon: CheckmarkCircle02Icon, label: "Appeal lost" },
  status_changed: { icon: Activity02Icon, label: "Status changed" },
};

function timestamp(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return formatDate(s);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ activity }: { activity: ActivityOut[] }) {
  if (!activity.length) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {activity.map((a, i) => {
        const meta = META[a.action_type] ?? {
          icon: Activity02Icon,
          label: a.action_type,
        };
        const last = i === activity.length - 1;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-7 items-center justify-center rounded-full border bg-card text-muted-foreground">
                <HugeiconsIcon icon={meta.icon} className="size-3.5" />
              </div>
              {!last ? <div className="w-px flex-1 bg-border" /> : null}
            </div>
            <div className={cn("flex flex-col pb-5", last && "pb-0")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{meta.label}</span>
                <span
                  className={cn(
                    "rounded border px-1 py-px text-[10px] font-medium uppercase tracking-wide",
                    a.actor === "ai"
                      ? "border-status-appealed/30 bg-status-appealed/10 text-status-appealed"
                      : a.actor === "agentmail"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {a.actor === "agentmail" ? "email" : a.actor}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {timestamp(a.created_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
