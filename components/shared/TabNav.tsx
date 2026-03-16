"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export function TabNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 px-1">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/" && pathname.endsWith(tab.href.split("/").pop()!));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg border-b-2 transition-colors",
              isActive
                ? "border-primary text-primary font-semibold bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {tab.icon && <span className="opacity-80">{tab.icon}</span>}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
