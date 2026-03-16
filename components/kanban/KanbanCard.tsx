"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Creative } from "./KanbanBoard";
import { cn } from "@/lib/utils";

const formatConfig: Record<string, { label: string; className: string }> = {
  VIDEO:    { label: "Vidéo",    className: "bg-amber-100 text-amber-700" },
  IMAGE:    { label: "Image",    className: "bg-blue-100 text-blue-700" },
  CAROUSEL: { label: "Carousel", className: "bg-violet-100 text-violet-700" },
  STORY:    { label: "Story",    className: "bg-green-100 text-green-700" },
};

interface KanbanCardProps {
  creative: Creative;
  readOnly: boolean;
  isDragging?: boolean;
}

export function KanbanCard({ creative, readOnly, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: creative.id, disabled: readOnly });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const fmt = formatConfig[creative.format];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white border border-border rounded-xl p-3 shadow-sm select-none transition-all",
        !readOnly && "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200",
        (isDragging || isSortableDragging) && "opacity-40",
        readOnly && "cursor-default"
      )}
    >
      {/* Format tag + date */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", fmt.className)}>
          {fmt.label}
        </span>
        {creative.due_date && (
          <span className="text-[10px] text-muted-foreground font-data">
            {new Date(creative.due_date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug mb-2">{creative.title}</p>

      {/* Campaign */}
      {creative.campaign_name && (
        <p className="text-xs text-muted-foreground truncate mb-2">
          ↳ {creative.campaign_name}
        </p>
      )}

      {/* Assigned */}
      {creative.assigned_to && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">
            {creative.assigned_to.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground">
            {creative.assigned_to.split(" ")[0]}
          </span>
        </div>
      )}
    </div>
  );
}
