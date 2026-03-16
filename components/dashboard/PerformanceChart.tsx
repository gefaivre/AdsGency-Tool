"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface DailyMetric {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
}

interface PerformanceChartProps {
  dailyMetrics: DailyMetric[];
}

const COLORS = {
  impressions: "#93C5FD",
  reach: "#86EFAC",
  clicks: "#F9A8D4",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3 text-xs shadow-lg">
      <p className="text-muted-foreground font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-3 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">
            {p.dataKey === "impressions" ? "Impressions" : p.dataKey === "reach" ? "Reach" : "Clics"}
          </span>
          <span className="font-data font-semibold text-foreground ml-auto pl-4">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function PerformanceChart({ dailyMetrics }: PerformanceChartProps) {
  const data = dailyMetrics.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }));

  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">
          Évolution sur 30 jours
        </h3>
        <div className="flex items-center gap-4">
          {[
            { key: "impressions", label: "Impressions", color: COLORS.impressions },
            { key: "reach", label: "Reach", color: COLORS.reach },
            { key: "clicks", label: "Clics", color: COLORS.clicks },
          ].map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 94%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(215 16% 57%)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215 16% 57%)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNumber}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="impressions" stroke={COLORS.impressions} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="reach" stroke={COLORS.reach} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="clicks" stroke={COLORS.clicks} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
