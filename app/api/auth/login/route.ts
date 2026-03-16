import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken, cookieOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const db = getDb();

  // Try agency first
  const agency = db
    .prepare("SELECT id, name, email, password_hash FROM agencies WHERE email = ?")
    .get(email) as { id: number; name: string; email: string; password_hash: string } | undefined;

  if (agency && bcrypt.compareSync(password, agency.password_hash)) {
    const token = await signToken({ id: agency.id, role: "agency", name: agency.name, email: agency.email });
    const res = NextResponse.json({ role: "agency" });
    res.cookies.set(cookieOptions().name, token, cookieOptions());
    return res;
  }

  // Try client
  const client = db
    .prepare("SELECT id, name, email, password_hash FROM clients WHERE email = ?")
    .get(email) as { id: number; name: string; email: string; password_hash: string } | undefined;

  if (client && bcrypt.compareSync(password, client.password_hash)) {
    const token = await signToken({ id: client.id, role: "client", name: client.name, email: client.email });
    const res = NextResponse.json({ role: "client" });
    res.cookies.set(cookieOptions().name, token, cookieOptions());
    return res;
  }

  // Try admin
  const admin = db
    .prepare("SELECT id, name, email, password_hash FROM admins WHERE email = ?")
    .get(email) as { id: number; name: string; email: string; password_hash: string } | undefined;

  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    const token = await signToken({ id: admin.id, role: "admin", name: admin.name, email: admin.email });
    const res = NextResponse.json({ role: "admin" });
    res.cookies.set(cookieOptions().name, token, cookieOptions());
    return res;
  }

  return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
}
