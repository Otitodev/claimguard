import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity02Icon,
  Alert02Icon,
  ArrowUpRight01Icon,
  DollarCircleIcon,
  Invoice03Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

import { DenialByPayerChart } from "@/components/charts/denial-by-payer";
import { RevenueByCategoryChart } from "@/components/charts/revenue-by-category";
import { EmailIntakeCard } from "@/components/email-intake-card";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { api, defaultPractice, safe } from "@/lib/api-server";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function HomePage() {
  const practice = await defaultPractice();
  if (!practice) return null; // layout renders the unreachable-backend alert

  const summary = await safe(api.summary(practice.id), null);
  if (!summary) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No analytics yet</EmptyTitle>
          <EmptyDescription>
            Could not load the analytics summary.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Denial overview for {practice.name}
        </p>
      </div>

      {/* Plan & ROI — what the subscription returns vs. what it costs */}
      <Card className="relative overflow-hidden border-primary/20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/10 blur-3xl"
        />
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <HugeiconsIcon icon={DollarCircleIcon} className="size-4 text-primary" />
            Your plan
          </CardDescription>
          <CardTitle className="text-xl">{summary.plan_label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">
                Recovered this month
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-status-recovered">
                {formatCurrency(summary.revenue_recovered_this_month)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Return on ClaimGuard
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                {summary.roi_multiple != null
                  ? `${summary.roi_multiple}×`
                  : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {summary.roi_multiple != null ? (
              <>
                ClaimGuard recovered{" "}
                <span className="font-medium text-foreground">
                  {summary.roi_multiple}×
                </span>{" "}
                its monthly cost for {practice.name} this month.
              </>
            ) : (
              <>Recover your first appeal this month to see your return.</>
            )}
          </p>
        </CardContent>
      </Card>

      {practice.email_intake_enabled ? (
        <EmailIntakeCard address={practice.agentmail_address} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Claims"
          value={summary.total_claims}
          icon={Invoice03Icon}
        />
        <MetricCard
          label="Denial Rate"
          value={formatPercent(summary.denial_rate)}
          icon={Activity02Icon}
        />
        <MetricCard
          label="Revenue at Risk"
          value={formatCurrency(summary.revenue_at_risk)}
          icon={Alert02Icon}
          valueClassName="text-status-denied"
        />
        <MetricCard
          label="Recovered this month"
          value={formatCurrency(summary.revenue_recovered_this_month)}
          icon={ArrowUpRight01Icon}
          valueClassName="text-status-recovered"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Appeals in Progress"
          value={summary.appeals_in_progress}
          icon={Mail01Icon}
        />
        <MetricCard
          label="Avg Days to Resolution"
          value={
            summary.avg_days_to_resolution != null
              ? `${summary.avg_days_to_resolution}d`
              : "—"
          }
          icon={Activity02Icon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Denial Rate by Payer</CardTitle>
            <CardDescription>
              Share of claims denied, per payer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DenialByPayerChart data={summary.denial_rate_by_payer} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue at Risk by Category</CardTitle>
            <CardDescription>
              Open denied dollars, by denial category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByCategoryChart
              data={summary.revenue_at_risk_by_category}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
