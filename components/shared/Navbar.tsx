"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface NavbarProps {
  userName: string;
  role: "agency" | "client" | "admin";
}

export function Navbar({ userName, role }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="h-14 border-b border-border bg-white flex items-center px-6 gap-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-3 mr-auto">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Spark Media
        </span>
        {role === "admin" ? (
          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-medium">
            Directeur
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {role === "agency" ? "Agence" : "Client"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {userName}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
