"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

export type KanbanStatus = "BRIEF" | "EN_PROD" | "REVIEW" | "VALIDE" | "LIVE";

export interface Creative {
  id: number;
  title: string;
  format: "VIDEO" | "IMAGE" | "CAROUSEL" | "STORY";
  status: KanbanStatus;
  assigned_to: string | null;
  due_date: string | null;
  campaign_name: string | null;
  client_id: number;
}

export const COLUMNS: { id: KanbanStatus; label: string; accent: string; bg: string }[] = [
  { id: "BRIEF",   label: "Brief",    accent: "#94A3B8", bg: "#F8FAFC" },
  { id: "EN_PROD", label: "En prod",  accent: "#60A5FA", bg: "#EFF6FF" },
  { id: "REVIEW",  label: "Review",   accent: "#FBBF24", bg: "#FFFBEB" },
  { id: "VALIDE",  label: "Validé",   accent: "#A78BFA", bg: "#F5F3FF" },
  { id: "LIVE",    label: "Live",     accent: "#34D399", bg: "#ECFDF5" },
];

interface KanbanBoardProps {
  creatives: Creative[];
  clientId: number;
  readOnly?: boolean;
}

export function KanbanBoard({ creatives: initial, clientId, readOnly = false }: KanbanBoardProps) {
  const [creatives, setCreatives] = useState<Creative[]>(initial);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeCreative = activeId !== null ? creatives.find((c) => c.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const creative = creatives.find((c) => c.id === active.id);
    if (!creative) return;

    const newStatus =
      COLUMNS.find((col) => col.id === over.id)?.id ??
      creatives.find((c) => c.id === over.id)?.status;

    if (!newStatus || newStatus === creative.status) return;

    setCreatives((prev) =>
      prev.map((c) => (c.id === creative.id ? { ...c, status: newStatus } : c))
    );

    await fetch(`/api/clients/${clientId}/creatives`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creativeId: creative.id, status: newStatus }),
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            accent={col.accent}
            bg={col.bg}
            creatives={creatives.filter((c) => c.status === col.id)}
            readOnly={readOnly}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCreative && <KanbanCard creative={activeCreative} readOnly={readOnly} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
