"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = Record<string, string | number>;

export function MetricChart({
  data,
  kind = "area",
  x = "date",
  y,
  color = "#2dd4bf",
}: {
  data: Point[];
  kind?: "area" | "bar" | "line";
  x?: string;
  y: string;
  color?: string;
}) {
  const Chart = kind === "bar" ? BarChart : kind === "line" ? LineChart : AreaChart;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {kind === "bar" ? (
            <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} />
          ) : kind === "line" ? (
            <Line type="monotone" dataKey={y} stroke={color} strokeWidth={2} dot={false} />
          ) : (
            <Area type="monotone" dataKey={y} stroke={color} fill={color} fillOpacity={0.18} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
