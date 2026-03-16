import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { CampaignCalendar } from "@/components/calendar/CampaignCalendar";

export default async function ClientCalendarPage() {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/login");

  const db = getDb();
  const campaigns = db
    .prepare("SELECT id, name, status, start_date, end_date FROM campaigns WHERE client_id = ? ORDER BY start_date")
    .all(session.id) as Array<{ id: number; name: string; status: "ACTIVE" | "PAUSED" | "ENDED"; start_date: string; end_date: string }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Planning de vos campagnes</h2>
        <p className="text-xs text-slate-400 mt-0.5">Vue Gantt de vos campagnes Meta Ads</p>
      </div>
      <CampaignCalendar campaigns={campaigns} />
    </div>
  );
}
