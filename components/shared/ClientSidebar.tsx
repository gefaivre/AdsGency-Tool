"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  industry: string;
  logo_color: string;
  total_impressions: number;
  campaign_count: number;
}

interface UnreadInfo {
  client_id: number;
  unread_count: number;
}

interface ClientSidebarProps {
  clients: Client[];
}

export function ClientSidebar({ clients }: ClientSidebarProps) {
  const pathname = usePathname();
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (!res.ok) return;
      const rows: UnreadInfo[] = await res.json();
      const map: Record<number, number> = {};
      rows.forEach((r) => { map[r.client_id] = r.unread_count; });
      setUnreadMap(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <aside className="w-60 border-r border-border bg-white flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Clients <span className="font-normal ml-1">({clients.length})</span>
        </p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {clients.map((client) => {
          const isActive = pathname.includes(`/agency/clients/${client.id}`);
          const hasUnread = !!unreadMap[client.id];
          return (
            <Link
              key={client.id}
              href={`/agency/clients/${client.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className="relative shrink-0">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: client.logo_color }}
                >
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">{client.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {client.industry}
                </p>
              </div>
              {hasUnread && (
                <span className="bg-primary text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0">
                  {unreadMap[client.id] > 9 ? "9+" : unreadMap[client.id]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
