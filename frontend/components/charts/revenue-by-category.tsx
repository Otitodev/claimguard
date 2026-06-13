"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { titleCase } from "@/lib/format";
import type { CategoryRisk } from "@/lib/types";

const config = {
  amount: { label: "Revenue at risk", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RevenueByCategoryChart({ data }: { data: CategoryRisk[] }) {
  const rows = data.map((d) => ({
    category: titleCase(d.category ?? "uncategorized"),
    amount: Number.parseFloat(d.revenue_at_risk),
  }));

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={rows}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          width={130}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                `$${Number(value).toLocaleString("en-US")}`
              }
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
