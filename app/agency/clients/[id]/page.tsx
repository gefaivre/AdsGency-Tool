import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { CampaignBreakdown } from "@/components/dashboard/CampaignBreakdown";
import { CampaignTable } from "@/components/dashboard/CampaignTable";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDashboardPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const clientId = parseInt(id);
  const db = getDb();

  const client = db
    .prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?")
    .get(clientId, session.id);
  if (!client) notFound();

  const campaigns = db
    .prepare("SELECT * FROM campaigns WHERE client_id = ? ORDER BY start_date DESC")
    .all(clientId) as Array<{
      id: number; name: string; status: "ACTIVE" | "PAUSED" | "ENDED"; objective: string;
      daily_budget: number; total_spend: number; impressions: number; reach: number;
      clicks: number; ctr: number; cpc: number; start_date: string; end_date: string;
    }>;

  // Aggregate daily metrics across all campaigns
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
    .all(clientId) as Array<{ date: string; impressions: number; reach: number; clicks: number; spend: number }>;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <KpiCards campaigns={campaigns} showBudget={true} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformanceChart dailyMetrics={allDaily} />
        <CampaignBreakdown campaigns={campaigns} showSpend={true} />
      </div>
      <CampaignTable campaigns={campaigns} showBudget={true} />
    </div>
  );
}
