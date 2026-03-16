import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientKanbanPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const clientId = parseInt(id);
  const db = getDb();

  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND agency_id = ?").get(clientId, session.id);
  if (!client) notFound();

  const creatives = db
    .prepare(
      `SELECT cr.*, c.name as campaign_name
       FROM creatives cr
       LEFT JOIN campaigns c ON c.id = cr.campaign_id
       WHERE cr.client_id = ?
       ORDER BY cr.id`
    )
    .all(clientId) as Array<{
      id: number; title: string; format: "VIDEO" | "IMAGE" | "CAROUSEL" | "STORY";
      status: "BRIEF" | "EN_PROD" | "REVIEW" | "VALIDE" | "LIVE";
      assigned_to: string | null; due_date: string | null; campaign_name: string | null; client_id: number;
    }>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">Production créative</h2>
        <p className="text-xs text-slate-400 mt-0.5">Glissez les cartes pour mettre à jour le statut</p>
      </div>
      <KanbanBoard creatives={creatives} clientId={clientId} readOnly={false} />
    </div>
  );
}
