"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { Creative, KanbanStatus } from "./KanbanBoard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: KanbanStatus;
  label: string;
  accent: string;
  bg: string;
  creatives: Creative[];
  readOnly: boolean;
}

export function KanbanColumn({ id, label, accent, bg, creatives, readOnly }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[220px] w-[220px]">
      {/* Column header */}
      <div
        className="px-3 py-3 rounded-t-xl flex items-center justify-between border border-b-0"
        style={{
          borderColor: accent + "40",
          borderTopWidth: 3,
          borderTopColor: accent,
          backgroundColor: bg,
        }}
      >
        <span className="text-sm font-semibold" style={{ color: accent }}>
          {label}
        </span>
        <span
          className="text-xs font-bold rounded-full px-2 py-0.5"
          style={{ backgroundColor: accent + "25", color: accent }}
        >
          {creatives.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[420px] rounded-b-xl border border-t-0 p-2 flex flex-col gap-2 transition-colors",
          isOver ? "bg-blue-50/60" : "bg-white"
        )}
        style={{ borderColor: accent + "30" }}
      >
        <SortableContext items={creatives.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {creatives.map((creative) => (
            <KanbanCard key={creative.id} creative={creative} readOnly={readOnly} />
          ))}
        </SortableContext>
        {creatives.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Vide</p>
          </div>
        )}
      </div>
    </div>
  );
}
