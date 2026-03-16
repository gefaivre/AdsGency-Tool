"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface Campaign {
  name: string;
  impressions: number;
  clicks: number;
  total_spend?: number;
}

interface CampaignBreakdownProps {
  campaigns: Campaign[];
  showSpend?: boolean;
}

const COLORS = {
  impressions: "#93C5FD",
  clicks: "#86EFAC",
  spend: "#C4B5FD",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3 text-xs shadow-lg">
      <p className="text-muted-foreground font-medium mb-2 max-w-[160px] truncate">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-3 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.dataKey}</span>
          <span className="font-data font-semibold text-foreground ml-auto pl-4">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function CampaignBreakdown({ campaigns, showSpend = true }: CampaignBreakdownProps) {
  const data = campaigns.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    Impressions: c.impressions,
    Clics: c.clicks,
    ...(showSpend && c.total_spend !== undefined ? { Dépenses: Math.round(c.total_spend) } : {}),
  }));

  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">
          Par campagne
        </h3>
        <div className="flex items-center gap-4">
          {[
            { key: "Impressions", color: COLORS.impressions },
            { key: "Clics", color: COLORS.clicks },
            ...(showSpend ? [{ key: "Dépenses", color: COLORS.spend }] : []),
          ].map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: item.color }} />
              {item.key}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 94%)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(215 16% 57%)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215 16% 57%)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNumber}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Impressions" fill={COLORS.impressions} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Clics" fill={COLORS.clicks} radius={[4, 4, 0, 0]} maxBarSize={28} />
          {showSpend && <Bar dataKey="Dépenses" fill={COLORS.spend} radius={[4, 4, 0, 0]} maxBarSize={28} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
