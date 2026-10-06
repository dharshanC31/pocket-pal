import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { getMonthlyAnalysis } from "@/lib/finance.functions";
import { currentMonth, dotColor, formatRupees, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Monthly analysis · Ledger" },
      { name: "description", content: "Where your money went this month, month over month." },
      { property: "og:title", content: "Monthly analysis · Ledger" },
      {
        property: "og:description",
        content: "Where your money went this month, month over month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analysis,
});

function Analysis() {
  const fetch = useServerFn(getMonthlyAnalysis);
  const [month, setMonth] = useState(currentMonth());
  const { data } = useQuery({
    queryKey: ["analysis", month],
    queryFn: () => fetch({ data: { month } }),
  });

  const change =
    data && data.previousExpenses > 0
      ? ((data.expenses - data.previousExpenses) / data.previousExpenses) * 100
      : null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">{monthLabel(month)}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || currentMonth())}
          className="num rounded-xl border border-line bg-white/70 px-3 py-2.5 text-sm outline-none"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Income" value={formatRupees(data?.income ?? 0)} />
        <Metric label="Expenses" value={formatRupees(data?.expenses ?? 0)} />
        <Metric label="Net balance" value={formatRupees(data?.net ?? 0)} />
        <Metric label="Average per active day" value={formatRupees(data?.avgDaily ?? 0)} />
        <Metric
          label="Highest category"
          value={data?.topCategory ? data.topCategory.name : "—"}
          hint={data?.topCategory ? formatRupees(data.topCategory.total) : undefined}
        />
        <Metric
          label="Entries"
          value={String(data?.transactionCount ?? 0)}
          hint={
            change === null
              ? "no previous month data"
              : `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs last month`
          }
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className="glass p-5">
          <p className="label-xs">By category</p>
          {(data?.categoryTotals ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No expenses this month.</p>
          ) : (
            <>
              <div className="mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data!.categoryTotals}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {data!.categoryTotals.map((row, index) => (
                        <Cell key={row.name} fill={dotColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatRupees(value)}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--line)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {data!.categoryTotals.slice(0, 6).map((row, index) => (
                  <li key={row.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: dotColor(index) }}
                      />
                      {row.name}
                    </span>
                    <span className="num">{formatRupees(row.total)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="space-y-3">
          <section className="glass p-5">
            <p className="label-xs">Day by day</p>
            <div className="mt-3 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.dailySeries ?? []}>
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatRupees(value)}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--line)" }}
                  />
                  <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass p-5">
            <p className="label-xs">Month comparison</p>
            <div className="mt-3 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.comparison ?? []}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value: string) => monthLabel(value)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatRupees(value)}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--line)" }}
                  />
                  <Bar dataKey="total" fill="var(--cat-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="glass p-5">
      <p className="label-xs">{label}</p>
      <p className="num mt-2 text-2xl">{value}</p>
      {hint ? <p className="label-xs mt-1">{hint}</p> : null}
    </div>
  );
}
