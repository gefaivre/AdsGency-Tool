"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  name: string;
  honoraires: number;
  budgetPub: number;
  marge: number;
}

interface Props {
  data: DataPoint[];
}

function euroFormatter(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${value}€`;
}

export function ProfitabilityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        barCategoryGap="28%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={euroFormatter}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              honoraires: "Honoraires cumulés",
              budgetPub: "Budget pub géré",
              marge: "Marge brute",
            };
            return [
              new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value),
              labels[name] ?? name,
            ];
          }}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: "#F8FAFC" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 12 }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              honoraires: "Honoraires cumulés",
              budgetPub: "Budget pub géré",
              marge: "Marge brute est.",
            };
            return labels[value] ?? value;
          }}
        />
        <Bar dataKey="honoraires" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="budgetPub"  fill="#C4B5FD" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="marge"      fill="#FCD34D" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
