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

  if (session.role === "client" && session.id !== clientId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const creatives = db
    .prepare(
      `SELECT cr.*, c.name as campaign_name
       FROM creatives cr
       LEFT JOIN campaigns c ON c.id = cr.campaign_id
       WHERE cr.client_id = ?
       ORDER BY cr.id`
    )
    .all(clientId);

  return NextResponse.json(creatives);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "agency") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const clientId = parseInt(id);
  const db = getDb();

  // Verify agency owns this client
  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?").get(clientId, session.id);
  if (!client) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { creativeId, status } = await req.json();
  const validStatuses = ["BRIEF", "EN_PROD", "REVIEW", "VALIDE", "LIVE"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  db.prepare("UPDATE creatives SET status = ? WHERE id = ? AND client_id = ?").run(status, creativeId, clientId);

  return NextResponse.json({ ok: true });
}
