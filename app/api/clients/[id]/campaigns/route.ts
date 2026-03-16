import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const clientId = parseInt(id);
  const db = getDb();

  // Verify access
  if (session.role === "client" && session.id !== clientId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (session.role === "agency") {
    const client = db.prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?").get(clientId, session.id);
    if (!client) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const campaigns = db
    .prepare("SELECT * FROM campaigns WHERE client_id = ? ORDER BY start_date DESC")
    .all(clientId);

  // Get daily metrics for each campaign (last 30 days)
  const campaignsWithMetrics = (campaigns as Record<string, unknown>[]).map((c) => {
    const daily = db
      .prepare(
        `SELECT date, impressions, reach, clicks, spend
         FROM campaign_metrics_daily
         WHERE campaign_id = ?
         ORDER BY date ASC
         LIMIT 30`
      )
      .all(c.id as number);
    return { ...c, daily_metrics: daily };
  });

  return NextResponse.json(campaignsWithMetrics);
}
