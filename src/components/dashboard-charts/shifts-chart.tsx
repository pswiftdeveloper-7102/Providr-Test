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

export type ShiftsChartDatum = {
  date: string; // ISO yyyy-mm-dd
  label: string; // pretty label for X axis, e.g. "Mon 12"
  scheduled: number;
  completed: number;
  cancelled: number;
};

const config = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  scheduled: { label: "Scheduled", color: "var(--chart-3)" },
  cancelled: { label: "Cancelled", color: "var(--destructive)" },
} satisfies ChartConfig;

export function ShiftsChart({ data }: { data: ShiftsChartDatum[] }) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart
        data={data}
        margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar
          dataKey="completed"
          stackId="s"
          fill="var(--color-completed)"
          radius={[0, 0, 0, 0]}
          name="Completed"
        />
        <Bar
          dataKey="scheduled"
          stackId="s"
          fill="var(--color-scheduled)"
          name="Scheduled"
        />
        <Bar
          dataKey="cancelled"
          stackId="s"
          fill="var(--color-cancelled)"
          radius={[4, 4, 0, 0]}
          name="Cancelled"
        />
      </BarChart>
    </ChartContainer>
  );
}