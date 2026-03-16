import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "agency") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = getDb();
  const clients = db
    .prepare(
      `SELECT c.id, c.name, c.email, c.industry, c.logo_color,
              COUNT(DISTINCT camp.id) as campaign_count,
              COALESCE(SUM(camp.total_spend), 0) as total_spend,
              COALESCE(SUM(camp.impressions), 0) as total_impressions,
              COALESCE(SUM(camp.clicks), 0) as total_clicks
       FROM clients c
       LEFT JOIN campaigns camp ON camp.client_id = c.id
       WHERE c.agency_id = ?
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all(session.id);

  return NextResponse.json(clients);
}
