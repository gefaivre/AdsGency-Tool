import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const clientId = parseInt(req.nextUrl.searchParams.get("clientId") || "0");
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

  const messages = db
    .prepare(
      "SELECT id, sender_role, content, created_at FROM messages WHERE client_id = ? ORDER BY created_at ASC"
    )
    .all(clientId);

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { clientId, content } = body as { clientId: number; content: string };

  if (!clientId || !content?.trim()) {
    return NextResponse.json({ error: "clientId et content requis" }, { status: 400 });
  }

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

  const readByAgency = session.role === "agency" ? 1 : 0;
  const readByClient = session.role === "client" ? 1 : 0;

  const result = db
    .prepare(
      "INSERT INTO messages (client_id, sender_role, content, read_by_agency, read_by_client) VALUES (?, ?, ?, ?, ?)"
    )
    .run(clientId, session.role, content.trim(), readByAgency, readByClient);

  const message = db
    .prepare("SELECT id, sender_role, content, created_at FROM messages WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(message, { status: 201 });
}
