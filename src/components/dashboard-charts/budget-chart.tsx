"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type BudgetChartDatum = {
  participant: string;
  Core: number;       // % spent 0-100
  Capacity: number;
  Capital: number;
};

const config = {
  Core: { label: "Core", color: "var(--chart-1)" },
  Capacity: { label: "Capacity", color: "var(--chart-2)" },
  Capital: { label: "Capital", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function BudgetChart({ data }: { data: BudgetChartDatum[] }) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="participant"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {typeof value === "number"
                      ? `${Math.round(value)}%`
                      : value}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="Core"
          fill="var(--color-Core)"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="Capacity"
          fill="var(--color-Capacity)"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="Capital"
          fill="var(--color-Capital)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}