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

export type ShiftsChartDatum = {
  date: string; // ISO yyyy-mm-dd
  label: string; // pretty label for X axis, e.g. "Mon 12"
  scheduled: number;
  completed: number;
  cancelled: number;
};

export function ShiftsChart({ data }: { data: ShiftsChartDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
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
            labelStyle={{ fontWeight: 500 }}
          />
          <Bar
            dataKey="completed"
            stackId="s"
            fill="hsl(var(--primary))"
            radius={[0, 0, 0, 0]}
            name="Completed"
          />
          <Bar
            dataKey="scheduled"
            stackId="s"
            fill="hsl(var(--primary) / 0.4)"
            name="Scheduled"
          />
          <Bar
            dataKey="cancelled"
            stackId="s"
            fill="hsl(var(--destructive) / 0.7)"
            radius={[4, 4, 0, 0]}
            name="Cancelled"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}