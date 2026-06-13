import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { ActivityTimeline } from "@/components/activity-timeline";
import { AppealPanel } from "@/components/appeal-panel";
import { CodeStampRow } from "@/components/code-stamp";
import { DeadlineChip } from "@/components/deadline-chip";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClaimDetail } from "@/lib/types";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let claim: ClaimDetail;
  try {
    claim = await api.claim(id);
  } catch {
    notFound();
  }

  const denial = claim.denials[0];
  const appeal = claim.appeals[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/claims">
            <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
            Back to claims
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {claim.patient_name}
          </h1>
          <StatusBadge value={claim.status} kind="claim" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Claim</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetaItem label="Payer">{claim.payer_name}</MetaItem>
              <MetaItem label="Date of Service">
                {formatDate(claim.date_of_service)}
              </MetaItem>
              <MetaItem label="Billed">
                <span className="font-mono">
                  {formatCurrency(claim.billed_amount)}
                </span>
              </MetaItem>
              <MetaItem label="CPT">
                <CodeStampRow codes={claim.cpt_codes} max={6} />
              </MetaItem>
              <MetaItem label="ICD-10">
                <CodeStampRow codes={claim.icd_codes} max={6} />
              </MetaItem>
            </CardContent>
          </Card>

          {denial ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Denial</CardTitle>
                    <CardDescription>
                      AI assessment of why the claim was denied
                    </CardDescription>
                  </div>
                  {denial.ai_classification ? (
                    <StatusBadge
                      value={denial.ai_classification}
                      kind="classification"
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {denial.denial_code ? (
                    <CodeStampRow codes={[denial.denial_code]} />
                  ) : null}
                  <span className="font-mono text-sm">
                    {formatCurrency(denial.denied_amount)} denied
                  </span>
                  <DeadlineChip days={daysUntil(denial.appeal_deadline)} />
                </div>
                <Separator />
                <p className="text-sm leading-relaxed text-foreground/90">
                  {denial.ai_reason_summary ?? "No summary available."}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {appeal ? (
            <AppealPanel
              appeal={appeal}
              deniedAmount={denial?.denied_amount ?? null}
            />
          ) : null}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activity={claim.activity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
