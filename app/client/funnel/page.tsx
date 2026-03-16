import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";

export default async function ClientFunnelPage() {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/login");

  const db = getDb();
  const campaigns = db
    .prepare("SELECT id, name, status, objective, impressions, reach, clicks, ctr FROM campaigns WHERE client_id = ?")
    .all(session.id) as Array<{
      id: number; name: string; status: string; objective: string;
      impressions: number; reach: number; clicks: number; ctr: number;
    }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Votre funnel marketing</h2>
        <p className="text-xs text-slate-400 mt-0.5">Vue d&apos;ensemble de votre entonnoir de conversion</p>
      </div>
      <FunnelFlow campaigns={campaigns} />
    </div>
  );
}
