import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default async function ClientKanbanPage() {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/login");

  const db = getDb();
  const creatives = db
    .prepare(
      `SELECT cr.*, c.name as campaign_name
       FROM creatives cr
       LEFT JOIN campaigns c ON c.id = cr.campaign_id
       WHERE cr.client_id = ?
       ORDER BY cr.id`
    )
    .all(session.id) as Array<{
      id: number; title: string; format: "VIDEO" | "IMAGE" | "CAROUSEL" | "STORY";
      status: "BRIEF" | "EN_PROD" | "REVIEW" | "VALIDE" | "LIVE";
      assigned_to: string | null; due_date: string | null; campaign_name: string | null; client_id: number;
    }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Vos créatifs en production</h2>
        <p className="text-xs text-slate-400 mt-0.5">Suivi de l&apos;avancement de vos visuels</p>
      </div>
      {/* readOnly=true : client ne peut pas drag & drop */}
      <KanbanBoard creatives={creatives} clientId={session.id} readOnly={true} />
    </div>
  );
}
