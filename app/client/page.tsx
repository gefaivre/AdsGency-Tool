import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { CampaignBreakdown } from "@/components/dashboard/CampaignBreakdown";
import { CampaignTable } from "@/components/dashboard/CampaignTable";

export default async function ClientDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/login");

  const db = getDb();

  const campaigns = db
    .prepare("SELECT * FROM campaigns WHERE client_id = ? ORDER BY start_date DESC")
    .all(session.id) as Array<{
      id: number; name: string; status: "ACTIVE" | "PAUSED" | "ENDED"; objective: string;
      daily_budget: number; total_spend: number; impressions: number; reach: number;
      clicks: number; ctr: number; cpc: number; start_date: string; end_date: string;
    }>;

  const allDaily = db
    .prepare(
      `SELECT date, SUM(impressions) as impressions, SUM(reach) as reach,
              SUM(clicks) as clicks, SUM(spend) as spend
       FROM campaign_metrics_daily
       WHERE campaign_id IN (SELECT id FROM campaigns WHERE client_id = ?)
       GROUP BY date
       ORDER BY date ASC
       LIMIT 30`
    )
    .all(session.id) as Array<{ date: string; impressions: number; reach: number; clicks: number; spend: number }>;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* showBudget=false : client ne voit pas les prix */}
      <KpiCards campaigns={campaigns} showBudget={false} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformanceChart dailyMetrics={allDaily} />
        <CampaignBreakdown campaigns={campaigns} showSpend={false} />
      </div>
      <CampaignTable campaigns={campaigns} showBudget={false} />
    </div>
  );
}
