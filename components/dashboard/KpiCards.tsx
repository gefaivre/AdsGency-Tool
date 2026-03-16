import { formatNumber, formatEuro, formatPercent } from "@/lib/utils";

interface Campaign {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  total_spend: number;
  daily_budget: number;
  status: string;
}

interface KpiCardsProps {
  campaigns: Campaign[];
  showBudget?: boolean;
}

const cardColors = [
  "bg-blue-50 border-blue-100",
  "bg-violet-50 border-violet-100",
  "bg-pink-50 border-pink-100",
  "bg-emerald-50 border-emerald-100",
  "bg-amber-50 border-amber-100",
  "bg-cyan-50 border-cyan-100",
  "bg-indigo-50 border-indigo-100",
];

export function KpiCards({ campaigns, showBudget = true }: KpiCardsProps) {
  const totals = campaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      reach: acc.reach + c.reach,
      clicks: acc.clicks + c.clicks,
      spend: acc.spend + c.total_spend,
      budget: acc.budget + c.daily_budget,
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, budget: 0 }
  );

  const avgCtr = campaigns.length > 0 ? campaigns.reduce((acc, c) => acc + c.ctr, 0) / campaigns.length : 0;
  const avgCpc = campaigns.length > 0 ? campaigns.reduce((acc, c) => acc + c.cpc, 0) / campaigns.length : 0;

  const metrics = [
    { label: "Impressions", value: formatNumber(totals.impressions) },
    { label: "Reach", value: formatNumber(totals.reach) },
    { label: "Clics", value: formatNumber(totals.clicks) },
    { label: "CTR moyen", value: formatPercent(avgCtr) },
    { label: "CPC moyen", value: formatEuro(avgCpc) },
    ...(showBudget
      ? [
          { label: "Budget / jour", value: formatEuro(totals.budget) },
          { label: "Dépenses tot.", value: formatEuro(totals.spend) },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 animate-fade-up stagger">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`rounded-xl border px-4 py-4 shadow-sm animate-fade-up ${cardColors[i % cardColors.length]}`}
        >
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
            {m.value}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  );
}
