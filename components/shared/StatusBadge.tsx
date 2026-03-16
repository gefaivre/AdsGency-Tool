import { cn } from "@/lib/utils";

type Status = "ACTIVE" | "PAUSED" | "ENDED";

const config: Record<Status, { label: string; className: string; dotClass: string }> = {
  ACTIVE: {
    label: "Actif",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  PAUSED: {
    label: "En pause",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
    dotClass: "bg-amber-500",
  },
  ENDED: {
    label: "Terminé",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
    dotClass: "bg-gray-400",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, className, dotClass } = config[status] ?? config.ENDED;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", className)}>
      <span
        className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass, status === "ACTIVE" && "animate-pulse")}
        style={status === "ACTIVE" ? { animationDuration: "1.5s" } : undefined}
      />
      {label}
    </span>
  );
}
