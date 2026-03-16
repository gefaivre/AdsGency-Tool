import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { clientId } = body as { clientId: number };

  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const db = getDb();

  if (session.role === "client" && session.id !== clientId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (session.role === "agency") {
    const client = db
      .prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?")
      .get(clientId, session.id);
    if (!client) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (session.role === "agency") {
    db.prepare(
      "UPDATE messages SET read_by_agency = 1 WHERE client_id = ? AND read_by_agency = 0"
    ).run(clientId);
  } else {
    db.prepare(
      "UPDATE messages SET read_by_client = 1 WHERE client_id = ? AND read_by_client = 0"
    ).run(clientId);
  }

  return NextResponse.json({ ok: true });
}
