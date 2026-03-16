"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  start_date: string;
  end_date: string;
}

interface CampaignCalendarProps {
  campaigns: Campaign[];
}

const statusConfig: Record<string, { bar: string; bg: string; text: string; label: string }> = {
  ACTIVE: { bar: "#34D399", bg: "#ECFDF5", text: "#059669", label: "Active" },
  PAUSED: { bar: "#FBBF24", bg: "#FFFBEB", text: "#D97706", label: "En pause" },
  ENDED:  { bar: "#94A3B8", bg: "#F1F5F9", text: "#64748B", label: "Terminée" },
};

const MONTHS_FR = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juill.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const MONTHS_FULL_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const VISIBLE_MONTHS = 6;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 48;
const LABEL_WIDTH = 200;

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function CampaignCalendar({ campaigns }: CampaignCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultStart = (() => {
    if (campaigns.length === 0) return startOfMonth(addMonths(today, -1));
    const dates = campaigns.map((c) => new Date(c.start_date));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    return startOfMonth(addMonths(earliest, -1));
  })();

  const [viewStart, setViewStart] = useState<Date>(startOfMonth(defaultStart));
  const viewEnd = endOfMonth(addMonths(viewStart, VISIBLE_MONTHS - 1));
  const totalDays = daysBetween(viewStart, viewEnd) + 1;

  function toPercent(date: Date): number {
    const clamped = Math.max(viewStart.getTime(), Math.min(viewEnd.getTime(), date.getTime()));
    return (daysBetween(viewStart, new Date(clamped)) / totalDays) * 100;
  }

  function prevPeriod() { setViewStart((d) => startOfMonth(addMonths(d, -VISIBLE_MONTHS))); }
  function nextPeriod() { setViewStart((d) => startOfMonth(addMonths(d, VISIBLE_MONTHS))); }
  function goToToday() { setViewStart(startOfMonth(addMonths(today, -1))); }

  const monthSegments = Array.from({ length: VISIBLE_MONTHS }, (_, i) => {
    const ms = startOfMonth(addMonths(viewStart, i));
    const me = endOfMonth(ms);
    const segStart = Math.max(viewStart.getTime(), ms.getTime());
    const segEnd = Math.min(viewEnd.getTime(), me.getTime());
    return {
      label: MONTHS_FR[ms.getMonth()],
      year: ms.getFullYear(),
      startPct: (daysBetween(viewStart, new Date(segStart)) / totalDays) * 100,
      widthPct: ((daysBetween(new Date(segStart), new Date(segEnd)) + 1) / totalDays) * 100,
    };
  });

  const todayInView = today >= viewStart && today <= viewEnd;
  const todayPct = todayInView ? toPercent(today) : null;
  const sorted = [...campaigns].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {MONTHS_FULL_FR[viewStart.getMonth()]} {viewStart.getFullYear()}
            <span className="text-muted-foreground font-normal"> — </span>
            {MONTHS_FULL_FR[viewEnd.getMonth()]} {viewEnd.getFullYear()}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevPeriod}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={nextPeriod}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-2.5 border-b border-border flex gap-5 bg-muted/30">
        {(["ACTIVE", "PAUSED", "ENDED"] as const).map((s) => (
          <span key={s} className="flex items-center gap-2 text-xs font-medium" style={{ color: statusConfig[s].text }}>
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusConfig[s].bar }} />
            {statusConfig[s].label}
          </span>
        ))}
      </div>

      {/* Gantt */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          {/* Month header row */}
          <div className="flex border-b border-border bg-muted/20" style={{ height: HEADER_HEIGHT }}>
            <div className="shrink-0 border-r border-border" style={{ width: LABEL_WIDTH }} />
            <div className="relative flex-1">
              {monthSegments.map((seg, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col items-start justify-center px-3 border-r border-border/50"
                  style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
                >
                  <span className="text-xs font-semibold text-foreground">
                    {seg.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {seg.year}
                  </span>
                </div>
              ))}
              {todayPct !== null && (
                <div
                  className="absolute bottom-1 pointer-events-none"
                  style={{ left: `${todayPct}%`, transform: "translateX(-50%)" }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Aucune campagne</p>
            </div>
          ) : (
            sorted.map((campaign, rowIdx) => {
              const start = new Date(campaign.start_date);
              const end = new Date(campaign.end_date);
              start.setHours(0, 0, 0, 0);
              end.setHours(23, 59, 59, 999);

              const visible = start <= viewEnd && end >= viewStart;
              const barStart = toPercent(start);
              const barEnd = toPercent(end);
              const barWidth = Math.max(barEnd - barStart, 0.5);
              const cfg = statusConfig[campaign.status];

              return (
                <div
                  key={campaign.id}
                  className={cn(
                    "flex border-b border-border/40 last:border-b-0",
                    rowIdx % 2 === 1 && "bg-muted/20"
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Label */}
                  <div
                    className="shrink-0 border-r border-border flex items-center px-4 gap-2.5"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cfg.bar }} />
                    <span
                      className="text-sm text-foreground truncate font-medium"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="relative flex-1 flex items-center">
                    {monthSegments.map((seg, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-border/20"
                        style={{ left: `${seg.startPct + seg.widthPct}%` }}
                      />
                    ))}

                    {todayPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px pointer-events-none z-10 bg-primary/20"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}

                    {visible && (
                      <div
                        className="absolute flex items-center px-2.5 overflow-hidden rounded-md"
                        style={{
                          left: `${barStart}%`,
                          width: `${barWidth}%`,
                          top: "50%",
                          height: 26,
                          transform: "translateY(-50%)",
                          backgroundColor: cfg.bar,
                        }}
                        title={`${campaign.name}\n${campaign.start_date} → ${campaign.end_date}`}
                      >
                        <span className="text-[10px] text-white font-semibold truncate leading-none select-none drop-shadow-sm">
                          {campaign.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
