import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

import { CodeStamp } from "@/components/code-stamp";
import { DeadlineChip } from "@/components/deadline-chip";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, defaultPractice, safe } from "@/lib/api-server";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NeedsActionItem } from "@/lib/types";

function NeedsActionTable({ items }: { items: NeedsActionItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>Denial</TableHead>
            <TableHead className="text-right">At Risk</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.appeal_id}>
              <TableCell className="font-medium">
                {item.patient_name}
              </TableCell>
              <TableCell>{item.payer_name}</TableCell>
              <TableCell>
                {item.denial_code ? (
                  <CodeStamp code={item.denial_code} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(item.denied_amount)}
              </TableCell>
              <TableCell>
                <DeadlineChip days={item.days_remaining} />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/claims/${item.claim_id}`}>
                    Review
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      data-icon="inline-end"
                    />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const ms = new Date().setHours(0, 0, 0, 0) - d.getTime();
  return Math.round(ms / 86_400_000);
}

function AgingChip({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground text-sm">—</span>;

  const urgent = days >= 60;
  const warn = days >= 30;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        urgent
          ? "bg-destructive/10 text-destructive"
          : warn
            ? "bg-status-pending/10 text-status-pending"
            : "bg-muted text-muted-foreground"
      }`}
    >
      <HugeiconsIcon
        icon={urgent ? Alert02Icon : Clock01Icon}
        className="size-3"
      />
      {days} days
    </span>
  );
}

function OverdueTable({ items }: { items: NeedsActionItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>Denial</TableHead>
            <TableHead className="text-right">At Risk</TableHead>
            <TableHead>Aging</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.appeal_id}>
              <TableCell className="font-medium">
                {item.patient_name}
              </TableCell>
              <TableCell>{item.payer_name}</TableCell>
              <TableCell>
                {item.denial_code ? (
                  <CodeStamp code={item.denial_code} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(item.denied_amount)}
              </TableCell>
              <TableCell>
                <AgingChip
                  days={
                    item.days_since_submission ??
                    daysSince(item.submitted_date)
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/claims/${item.claim_id}`}>
                    Review
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      data-icon="inline-end"
                    />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function NeedsActionPage() {
  const practice = await defaultPractice();
  if (!practice) return null;

  const items = await safe(api.needsAction(practice.id), []);

  const drafts = items.filter((i) => i.kind === "deadline");
  const overdue = items.filter((i) => i.kind === "overdue");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Needs Action</h1>
        <p className="text-sm text-muted-foreground">
          Drafted appeals nearing their filing deadline, and submitted appeals
          past the expected payer response window.
        </p>
      </div>

      {/* Drafts near deadline */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Drafts Near Deadline
          {drafts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({drafts.length})
            </span>
          )}
        </h2>
        {drafts.length === 0 ? (
          <Empty className="rounded-lg border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} />
              </EmptyMedia>
              <EmptyTitle>All clear</EmptyTitle>
              <EmptyDescription>
                No drafted appeals are approaching their deadline.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <NeedsActionTable items={drafts} />
        )}
      </div>

      {/* Submitted — past expected response */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Awaiting Payer Response
          {overdue.length > 0 && (
            <span className="ml-2 text-sm font-normal text-destructive">
              ({overdue.length} overdue)
            </span>
          )}
        </h2>
        {overdue.length === 0 ? (
          <Empty className="rounded-lg border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} />
              </EmptyMedia>
              <EmptyTitle>Nothing overdue</EmptyTitle>
              <EmptyDescription>
                All submitted appeals are within the expected payer response
                window.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <OverdueTable items={overdue} />
        )}
      </div>
    </div>
  );
}
