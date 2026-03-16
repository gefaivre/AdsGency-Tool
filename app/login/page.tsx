"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur de connexion");
      setLoading(false);
      return;
    }

    if (data.role === "admin") {
      router.push("/admin");
    } else if (data.role === "agency") {
      router.push("/agency");
    } else {
      router.push("/client");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Spark Media</h1>
          <p className="text-muted-foreground mt-1.5">Tableau de bord Meta Ads</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 px-4 transition-colors mt-2 shadow-sm"
            >
              {loading ? "Vérification…" : "Accéder au tableau de bord"}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Comptes de démonstration
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2.5 px-4 bg-slate-900 rounded-xl border border-slate-700">
              <span className="text-sm font-medium text-white">Directeur</span>
              <span className="font-data text-xs text-slate-400">
                admin@sparkmedia.com · admin2024
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-sm font-medium text-blue-700">Agence</span>
              <span className="font-data text-xs text-muted-foreground">
                agence@demo.com · agence123
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 px-4 bg-violet-50 rounded-xl border border-violet-100">
              <span className="text-sm font-medium text-violet-700">Client</span>
              <span className="font-data text-xs text-muted-foreground">
                techstart@demo.com · client123
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
