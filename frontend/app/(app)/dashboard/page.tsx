import {
  Activity02Icon,
  Alert02Icon,
  ArrowUpRight01Icon,
  Invoice03Icon,
} from "@hugeicons/core-free-icons";

import { DenialByPayerChart } from "@/components/charts/denial-by-payer";
import { RevenueByCategoryChart } from "@/components/charts/revenue-by-category";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { api, defaultPractice, safe } from "@/lib/api";
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
