import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import {
  deleteTransaction,
  listCategories,
  listTransactions,
  type Transaction,
} from "@/lib/finance.functions";
import { dayLabel, formatRupees } from "@/lib/format";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "History · Ledger" },
      { name: "description", content: "Every entry you've recorded, grouped by day." },
      { property: "og:title", content: "History · Ledger" },
      { property: "og:description", content: "Every entry you've recorded, grouped by day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const fetchTransactions = useServerFn(listTransactions);
  const fetchCategories = useServerFn(listCategories);
  const remove = useServerFn(deleteTransaction);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTransactions(),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const names = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.name])),
    [categories],
  );

  const filtered = (transactions ?? []).filter((t) => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "all" && t.category_id !== category) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });

  const groups = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">{filtered.length} entries</p>

      <div className="glass mt-6 space-y-3 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search descriptions"
          className="w-full rounded-xl border border-line bg-white/70 px-4 py-3 text-base outline-none"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-line bg-white/70 px-3 py-3 text-sm outline-none"
          >
            <option value="all">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="num rounded-xl border border-line bg-white/70 px-3 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="num rounded-xl border border-line bg-white/70 px-3 py-3 text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {Object.keys(groups).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
        ) : (
          Object.entries(groups).map(([date, rows]) => (
            <section key={date}>
              <div className="flex items-baseline justify-between">
                <p className="label-xs">{dayLabel(date)}</p>
                <p className="num text-[13px] text-muted-foreground">
                  {formatRupees(
                    rows
                      .filter((r) => r.transaction_type === "expense")
                      .reduce((acc, r) => acc + r.amount, 0),
                  )}
                </p>
              </div>
              <ul className="glass mt-2 divide-y divide-line px-4">
                {rows.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="label-xs mt-0.5">
                        {(t.category_id && names.get(t.category_id)) || "Uncategorised"}
                        {t.notes ? ` · ${t.notes}` : ""}
                      </p>
                    </div>
                    <span
                      className="num text-sm"
                      style={
                        t.transaction_type === "income" ? { color: "var(--accent)" } : undefined
                      }
                    >
                      {t.transaction_type === "income" ? "+" : "−"}
                      {formatRupees(t.amount)}
                    </span>
                    <button
                      onClick={() => setEditing(t)}
                      className="rounded-lg px-2 py-2 text-[13px] text-muted-foreground hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeMutation.mutate(t.id)}
                      className="rounded-lg px-2 py-2 text-[13px] text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <AddTransactionSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        editing={editing}
      />
    </AppShell>
  );
}
