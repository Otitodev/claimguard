"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PayerRate } from "@/lib/types";

const config = {
  rate: { label: "Denial rate", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function DenialByPayerChart({ data }: { data: PayerRate[] }) {
  const rows = data.map((d) => ({
    payer: d.payer_name,
    rate: Number((d.denial_rate * 100).toFixed(1)),
    denied: d.denied_claims,
    total: d.total_claims,
  }));

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart accessibilityLayer data={rows} margin={{ left: -12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="payer"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="rate" fill="var(--color-rate)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
