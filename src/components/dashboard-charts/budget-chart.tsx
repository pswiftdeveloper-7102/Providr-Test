"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BudgetChartDatum = {
  participant: string;
  Core: number;       // % spent 0-100
  Capacity: number;
  Capital: number;
};

export function BudgetChart({ data }: { data: BudgetChartDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="category"
            dataKey="participant"
            tickLine={false}
            axisLine={false}
            width={110}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
              backgroundColor: "hsl(var(--background))",
            }}
            formatter={(value) =>
              typeof value === "number" ? `${Math.round(value)}%` : String(value)
            }
          />
          <Bar
            dataKey="Core"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="Capacity"
            fill="hsl(var(--primary) / 0.55)"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="Capital"
            fill="hsl(var(--primary) / 0.25)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}