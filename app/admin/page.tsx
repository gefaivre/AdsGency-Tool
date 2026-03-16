import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatEuro, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Users, Euro, BarChart3, Percent } from "lucide-react";
import { ProfitabilityChart } from "@/components/admin/ProfitabilityChart";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const db = getDb();

  // Per-client profitability data
  const clients = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.industry,
      c.logo_color,
      c.email,
      cc.monthly_retainer,
      cc.contract_start,
      COALESCE(SUM(camp.total_spend), 0)    AS total_spend,
      COALESCE(SUM(camp.impressions), 0)    AS total_impressions,
      COALESCE(SUM(camp.clicks), 0)         AS total_clicks,
      COUNT(DISTINCT camp.id)               AS campaign_count,
      COUNT(DISTINCT CASE WHEN camp.status = 'ACTIVE' THEN camp.id END) AS active_campaigns
    FROM clients c
    LEFT JOIN client_contracts cc ON cc.client_id = c.id
    LEFT JOIN campaigns camp ON camp.client_id = c.id
    GROUP BY c.id
    ORDER BY cc.monthly_retainer DESC
  `).all() as Array<{
    id: number;
    name: string;
    industry: string;
    logo_color: string;
    email: string;
    monthly_retainer: number | null;
    contract_start: string | null;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    campaign_count: number;
    active_campaigns: number;
  }>;

  // Compute months active from contract_start to today
  const today = new Date();
  const enriched = clients.map((c) => {
    const retainer = c.monthly_retainer ?? 0;
    const monthsActive = c.contract_start
      ? Math.max(1, Math.round(
          (today.getTime() - new Date(c.contract_start).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ))
      : 1;
    const revenue = retainer * monthsActive;            // cumulative management fees billed
    const adSpendManaged = c.total_spend;               // ad budget managed on their behalf
    const totalBilled = revenue + adSpendManaged;       // total invoiced to client
    // Estimated gross margin: retainer minus ~40% ops cost (staff, tools, overhead)
    const grossMargin = revenue * 0.6;
    const marginPct = totalBilled > 0 ? (grossMargin / totalBilled) * 100 : 0;

    return { ...c, retainer, monthsActive, revenue, adSpendManaged, totalBilled, grossMargin, marginPct };
  });

  // Global KPIs
  const totalMRR     = enriched.reduce((s, c) => s + c.retainer, 0);
  const totalRevenue = enriched.reduce((s, c) => s + c.revenue, 0);
  const totalSpend   = enriched.reduce((s, c) => s + c.adSpendManaged, 0);
  const totalMargin  = enriched.reduce((s, c) => s + c.grossMargin, 0);
  const totalBilled  = enriched.reduce((s, c) => s + c.totalBilled, 0);
  const avgMarginPct = totalBilled > 0 ? (totalMargin / totalBilled) * 100 : 0;
  const activeClients = enriched.filter((c) => c.active_campaigns > 0).length;

  function marginBadge(pct: number) {
    if (pct >= 20) return { label: "Bon", cls: "bg-emerald-100 text-emerald-700" };
    if (pct >= 12) return { label: "Correct", cls: "bg-amber-100 text-amber-700" };
    return { label: "Faible", cls: "bg-red-100 text-red-700" };
  }

  function marginIcon(pct: number) {
    if (pct >= 20) return <TrendingUp className="w-3.5 h-3.5" />;
    if (pct >= 12) return <Minus className="w-3.5 h-3.5" />;
    return <TrendingDown className="w-3.5 h-3.5" />;
  }

  const kpis = [
    {
      label: "MRR",
      sublabel: "Revenus mensuels récurrents",
      value: formatEuro(totalMRR),
      icon: <Euro className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-100",
      valueColor: "text-emerald-700",
    },
    {
      label: "Revenus cumulés",
      sublabel: "Honoraires facturés (cumul)",
      value: formatEuro(totalRevenue),
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-100",
      valueColor: "text-blue-700",
    },
    {
      label: "Budget pub géré",
      sublabel: "Dépenses Meta Ads totales",
      value: formatEuro(totalSpend),
      icon: <BarChart3 className="w-5 h-5 text-violet-600" />,
      bg: "bg-violet-50 border-violet-100",
      valueColor: "text-violet-700",
    },
    {
      label: "Marge brute estimée",
      sublabel: "Après coûts opérationnels (≈40%)",
      value: formatEuro(totalMargin),
      icon: <Percent className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      valueColor: "text-amber-700",
    },
    {
      label: "Taux de marge moy.",
      sublabel: `Sur ${activeClients} clients actifs`,
      value: `${avgMarginPct.toFixed(1)}%`,
      icon: <Users className="w-5 h-5 text-slate-600" />,
      bg: "bg-slate-50 border-slate-200",
      valueColor: "text-slate-800",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-up">

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tableau de bord — Direction
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rentabilité et revenus par client · {today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <span className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-full tracking-wide">
          Accès Directeur
        </span>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 stagger">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border px-5 py-4 shadow-sm animate-fade-up ${kpi.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shadow-sm">
                {kpi.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${kpi.valueColor}`}>{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">{kpi.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{kpi.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden animate-fade-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Rentabilité par client</h2>
            <p className="text-xs text-slate-400 mt-0.5">Honoraires cumulés vs budget publicitaire géré</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Honoraires
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-violet-300 inline-block" /> Budget pub
            </span>
          </div>
        </div>
        <div className="p-4">
          <ProfitabilityChart
            data={enriched.map((c) => ({
              name: c.name.split(" ").slice(0, 2).join(" "),
              honoraires: Math.round(c.revenue),
              budgetPub: Math.round(c.adSpendManaged),
              marge: Math.round(c.grossMargin),
            }))}
          />
        </div>
      </div>

      {/* Per-client table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Détail par client</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {enriched.length} clients
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Secteur</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Retainer / mois</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Honoraires cumulés</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget pub géré</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total facturé</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Marge brute</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map((client) => {
                const badge = marginBadge(client.marginPct);
                return (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Client */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: client.logo_color }}
                        >
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Depuis {client.contract_start
                              ? new Date(client.contract_start).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Secteur */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {client.industry}
                      </span>
                    </td>

                    {/* Retainer */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {client.retainer > 0 ? formatEuro(client.retainer) : "—"}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{client.monthsActive} mois</p>
                    </td>

                    {/* Honoraires cumulés */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                        {formatEuro(client.revenue)}
                      </span>
                    </td>

                    {/* Budget pub */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-slate-700 tabular-nums">
                        {formatEuro(client.adSpendManaged)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {client.campaign_count} camp.
                        {client.active_campaigns > 0 && (
                          <span className="ml-1 text-emerald-600 font-medium">
                            · {client.active_campaigns} actif{client.active_campaigns > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Total facturé */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatEuro(client.totalBilled)}
                      </span>
                    </td>

                    {/* Marge brute */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {formatEuro(client.grossMargin)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                        {client.marginPct.toFixed(1)}% du total facturé
                      </p>
                    </td>

                    {/* Profil marge */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                          {marginIcon(client.marginPct)}
                          {badge.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-6 py-4 text-sm font-bold text-slate-900" colSpan={2}>
                  Total
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-slate-900">{formatEuro(totalMRR)}<span className="text-slate-400 font-normal">/mois</span></span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-emerald-600">{formatEuro(totalRevenue)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-slate-700">{formatEuro(totalSpend)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-slate-900">{formatEuro(totalBilled)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-slate-900">{formatEuro(totalMargin)}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">{avgMarginPct.toFixed(1)}% moy.</p>
                </td>
                <td className="px-6 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-[11px] text-slate-400 text-center">
        Marge brute estimée sur la base d&apos;un taux de coûts opérationnels de 40% des honoraires.
        Les dépenses publicitaires sont refacturées au client et ne constituent pas un coût pour l&apos;agence.
      </p>
    </div>
  );
}
