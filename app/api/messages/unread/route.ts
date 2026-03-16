import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = getDb();

  if (session.role === "agency") {
    const rows = db
      .prepare(
        `SELECT m.client_id, COUNT(*) as unread_count,
                (SELECT content FROM messages WHERE client_id = m.client_id ORDER BY created_at DESC LIMIT 1) as last_message,
                MAX(m.created_at) as last_at
         FROM messages m
         JOIN clients c ON c.id = m.client_id
         WHERE c.agency_id = ? AND m.read_by_agency = 0
         GROUP BY m.client_id`
      )
      .all(session.id) as Array<{
        client_id: number;
        unread_count: number;
        last_message: string;
        last_at: string;
      }>;
    return NextResponse.json(rows);
  } else {
    const row = db
      .prepare(
        "SELECT COUNT(*) as unread_count FROM messages WHERE client_id = ? AND read_by_client = 0"
      )
      .get(session.id) as { unread_count: number };
    return NextResponse.json(row);
  }
}
