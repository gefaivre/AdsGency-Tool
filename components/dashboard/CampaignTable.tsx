import { formatNumber, formatEuro, formatPercent } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Campaign {
  id: number;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  objective: string;
  daily_budget: number;
  total_spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  start_date: string;
  end_date: string;
}

const objectiveLabels: Record<string, string> = {
  TRAFFIC: "Trafic",
  CONVERSIONS: "Conversions",
  BRAND_AWARENESS: "Notoriété",
  LEAD_GENERATION: "Leads",
};

interface CampaignTableProps {
  campaigns: Campaign[];
  showBudget?: boolean;
}

export function CampaignTable({ campaigns, showBudget = true }: CampaignTableProps) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm animate-fade-up overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Campagnes</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                Campagne
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                Objectif
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                Impressions
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                Reach
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                Clics
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                CTR
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                CPC
              </th>
              {showBudget && (
                <>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                    Budget/j
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                    Dépenses
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-foreground leading-tight">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-data">
                    {c.start_date} → {c.end_date}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {objectiveLabels[c.objective] ?? c.objective}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                  {formatNumber(c.impressions)}
                </td>
                <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                  {formatNumber(c.reach)}
                </td>
                <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                  {formatNumber(c.clicks)}
                </td>
                <td className="px-6 py-4 text-right font-data text-sm font-semibold text-primary tabular-nums">
                  {formatPercent(c.ctr)}
                </td>
                <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                  {formatEuro(c.cpc)}
                </td>
                {showBudget && (
                  <>
                    <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                      {formatEuro(c.daily_budget)}
                    </td>
                    <td className="px-6 py-4 text-right font-data text-sm font-semibold text-foreground tabular-nums">
                      {formatEuro(c.total_spend)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
