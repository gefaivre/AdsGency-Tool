import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { CampaignCalendar } from "@/components/calendar/CampaignCalendar";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientCalendarPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const clientId = parseInt(id);
  const db = getDb();

  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?").get(clientId, session.id);
  if (!client) notFound();

  const campaigns = db
    .prepare("SELECT id, name, status, start_date, end_date FROM campaigns WHERE client_id = ? ORDER BY start_date")
    .all(clientId) as Array<{ id: number; name: string; status: "ACTIVE" | "PAUSED" | "ENDED"; start_date: string; end_date: string }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Planning des campagnes</h2>
        <p className="text-xs text-slate-400 mt-0.5">Vue Gantt de la durée des campagnes</p>
      </div>
      <CampaignCalendar campaigns={campaigns} />
    </div>
  );
}
