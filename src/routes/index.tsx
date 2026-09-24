import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getDashboard, refreshInsight } from "@/lib/finance.functions";
import { dotColor, dayLabel, formatRupees, monthLabel, todayISO } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today · Ledger" },
      {
        name: "description",
        content: "Today's spending, this month's total and one quiet insight.",
      },
      { property: "og:title", content: "Today · Ledger" },
      {
        property: "og:description",
        content: "Today's spending, this month's total and one quiet insight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const refresh = useServerFn(refreshInsight);
  const queryClient = useQueryClient();
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => fetchDashboard({ data: { today } }),
  });

  const insightMutation = useMutation({
    mutationFn: () => refresh({ data: { today } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  return (
    <AppShell insight={data?.insight ?? null}>
      <h1 className="text-3xl font-bold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data ? monthLabel(data.month) : ""}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spent today" value={formatRupees(data?.todayTotal ?? 0)} big />
        <Stat label="This month" value={formatRupees(data?.monthTotal ?? 0)} />
        <Stat label="Entries this month" value={String(data?.recent ? data.todayCount : 0)} hint="today" />
        <Stat label="Net this month" value={formatRupees(data?.net ?? 0)} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass p-5">
          <div className="flex items-baseline justify-between">
            <p className="label-xs">Where it went</p>
            <Link to="/analysis" className="label-xs" style={{ color: "var(--accent)" }}>
              Full analysis
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(data?.categoryTotals ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : "Nothing recorded this month yet."}
              </p>
            ) : (
              data!.categoryTotals.map((row, index) => {
                const share = data!.monthTotal > 0 ? (row.total / data!.monthTotal) * 100 : 0;
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: dotColor(index) }}
                        />
                        {row.name}
                      </span>
                      <span className="num">{formatRupees(row.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-line/70">
                      <div
                        className="h-1 rounded-full"
                        style={{ width: `${share}%`, backgroundColor: dotColor(index) }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="glass flex flex-col p-5">
          <p className="label-xs">AI insight</p>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed">
            {data?.insight ?? "No insight yet."}
          </p>
          <button
            onClick={() => insightMutation.mutate()}
            disabled={insightMutation.isPending}
            className="mt-4 self-start rounded-lg border border-line px-3 py-2 text-[13px] disabled:opacity-60"
          >
            {insightMutation.isPending ? "Thinking…" : "Refresh insight"}
          </button>
        </section>
      </div>

      <section className="glass mt-3 p-5">
        <div className="flex items-baseline justify-between">
          <p className="label-xs">Recent entries</p>
          <Link to="/transactions" className="label-xs" style={{ color: "var(--accent)" }}>
            See all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {(data?.recent ?? []).length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">No entries yet.</li>
          ) : (
            data!.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="label-xs mt-0.5">{dayLabel(t.date)}</p>
                </div>
                <span
                  className="num text-sm"
                  style={t.transaction_type === "income" ? { color: "var(--accent)" } : undefined}
                >
                  {t.transaction_type === "income" ? "+" : "−"}
                  {formatRupees(t.amount)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="glass p-5">
      <p className="label-xs">{label}</p>
      <p className={`num mt-2 ${big ? "text-3xl" : "text-2xl"}`}>{value}</p>
      {hint ? <p className="label-xs mt-1">{hint}</p> : null}
    </div>
  );
}
