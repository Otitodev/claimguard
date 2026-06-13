import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
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
import { api, defaultPractice, safe } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default async function NeedsActionPage() {
  const practice = await defaultPractice();
  if (!practice) return null;

  const items = await safe(api.needsAction(practice.id), []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Needs Action</h1>
        <p className="text-sm text-muted-foreground">
          Drafted appeals with a deadline within 7 days — review and submit
          before they lapse.
        </p>
      </div>

      {items.length === 0 ? (
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
      )}
    </div>
  );
}
