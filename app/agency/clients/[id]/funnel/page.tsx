import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientFunnelPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const clientId = parseInt(id);
  const db = getDb();

  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?").get(clientId, session.id);
  if (!client) notFound();

  const campaigns = db
    .prepare("SELECT id, name, status, objective, impressions, reach, clicks, ctr FROM campaigns WHERE client_id = ?")
    .all(clientId) as Array<{
      id: number; name: string; status: string; objective: string;
      impressions: number; reach: number; clicks: number; ctr: number;
    }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Funnel Marketing</h2>
        <p className="text-xs text-slate-400 mt-0.5">Visualisation de l&apos;entonnoir Awareness → Consideration → Conversion</p>
      </div>
      <FunnelFlow campaigns={campaigns} />
    </div>
  );
}
