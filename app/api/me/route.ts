import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = getDb();

  if (session.role === "client") {
    const client = db
      .prepare("SELECT id, name, email, industry, logo_color FROM clients WHERE id = ?")
      .get(session.id) as Record<string, unknown> | undefined;
    return NextResponse.json({ ...(client ?? {}), role: "client" });
  }

  if (session.role === "agency") {
    const agency = db
      .prepare("SELECT id, name, email FROM agencies WHERE id = ?")
      .get(session.id) as Record<string, unknown> | undefined;
    return NextResponse.json({ ...(agency ?? {}), role: "agency" });
  }

  return NextResponse.json({ error: "Rôle inconnu" }, { status: 400 });
}
