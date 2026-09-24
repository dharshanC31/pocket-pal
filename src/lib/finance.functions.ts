import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Daily Needs",
  "Transport",
  "Bills & Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Subscriptions",
  "Other",
];

export type Category = { id: string; name: string; is_default: boolean; sort_order: number };

export type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
  transaction_type: "expense" | "income";
  notes: string | null;
};

type Row = {
  id: string;
  amount: string | number;
  description: string;
  date: string;
  category_id: string | null;
  transaction_type: string;
  notes: string | null;
};

function normalise(rows: Row[] | null): Transaction[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    description: r.description,
    date: r.date,
    category_id: r.category_id,
    transaction_type: r.transaction_type === "income" ? "income" : "expense",
    notes: r.notes,
  }));
}

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const year = y ?? 1970;
  const mon = m ?? 1;
  const start = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${month}-${`${lastDay}`.padStart(2, "0")}`;
  return { start, end, days: lastDay };
}

function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 2, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

/* ------------------------------- categories ------------------------------- */

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("categories")
      .select("id, name, is_default, sort_order")
      .order("sort_order")
      .order("name");

    if (existing.error) throw new Error(existing.error.message);
    if ((existing.data ?? []).length === 0) {
      const seed = DEFAULT_CATEGORIES.map((name, index) => ({
        user_id: userId,
        name,
        is_default: true,
        sort_order: index,
      }));
      const inserted = await supabase
        .from("categories")
        .insert(seed)
        .select("id, name, is_default, sort_order");
      if (inserted.error) throw new Error(inserted.error.message);
      return (inserted.data ?? []).sort((a, b) => a.sort_order - b.sort_order) as Category[];
    }
    return (existing.data ?? []) as Category[];
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("categories")
        .update({ name: data.name.trim() })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("categories")
      .insert({ user_id: userId, name: data.name.trim(), sort_order: 200 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ transactions ------------------------------ */

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select("id, amount, description, date, category_id, transaction_type, notes")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return normalise(data as Row[] | null);
  });

const transactionInput = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive(),
  description: z.string().max(140),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().nullable(),
  transaction_type: z.enum(["expense", "income"]),
  notes: z.string().max(500).nullable(),
});

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transactionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      amount: data.amount,
      description: data.description.trim(),
      date: data.date,
      category_id: data.category_id,
      transaction_type: data.transaction_type,
      notes: data.notes && data.notes.trim() !== "" ? data.notes.trim() : null,
    };
    if (data.id) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("transactions")
      .insert({ ...payload, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("transactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    for (const table of ["transactions", "chat_messages", "insights"] as const) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* -------------------------------- analytics ------------------------------- */

type CategoryTotal = { categoryId: string | null; name: string; total: number };

function categoryTotals(
  transactions: Transaction[],
  categories: Category[],
  type: "expense" | "income" = "expense",
): CategoryTotal[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string, { name: string; total: number }>();
  for (const t of transactions) {
    if (t.transaction_type !== type) continue;
    const key = t.category_id ?? "none";
    const name = (t.category_id && names.get(t.category_id)) || "Uncategorised";
    const current = totals.get(key) ?? { name, total: 0 };
    current.total += t.amount;
    totals.set(key, current);
  }
  return [...totals.entries()]
    .map(([key, value]) => ({
      categoryId: key === "none" ? null : key,
      name: value.name,
      total: value.total,
    }))
    .sort((a, b) => b.total - a.total);
}

const sum = (rows: Transaction[], type: "expense" | "income") =>
  rows.filter((t) => t.transaction_type === type).reduce((acc, t) => acc + t.amount, 0);

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const month = data.today.slice(0, 7);
    const { start, end } = monthRange(month);

    const [monthRows, categoryRows, insightRow] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, description, date, category_id, transaction_type, notes")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, is_default, sort_order").order("sort_order"),
      supabase.from("insights").select("content, generated_at").maybeSingle(),
    ]);
    if (monthRows.error) throw new Error(monthRows.error.message);

    const transactions = normalise(monthRows.data as Row[] | null);
    const categories = (categoryRows.data ?? []) as Category[];
    const todays = transactions.filter((t) => t.date === data.today);
    const monthExpense = sum(transactions, "expense");
    const monthIncome = sum(transactions, "income");
    const dayNumber = Number(data.today.slice(8, 10));

    return {
      month,
      todayTotal: sum(todays, "expense"),
      todayCount: todays.length,
      monthTotal: monthExpense,
      monthIncome,
      net: monthIncome - monthExpense,
      avgPerDay: dayNumber > 0 ? monthExpense / dayNumber : 0,
      categories,
      categoryTotals: categoryTotals(transactions, categories).slice(0, 5),
      recent: transactions.slice(0, 6),
      dailySeries: buildDailySeries(transactions, month).slice(-7),
      insight: insightRow.data?.content ?? null,
      insightAt: insightRow.data?.generated_at ?? null,
    };
  });

function buildDailySeries(transactions: Transaction[], month: string) {
  const { days } = monthRange(month);
  const series: { day: string; total: number }[] = [];
  for (let d = 1; d <= days; d += 1) {
    const iso = `${month}-${`${d}`.padStart(2, "0")}`;
    const total = transactions
      .filter((t) => t.date === iso && t.transaction_type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    series.push({ day: `${d}`, total });
  }
  return series;
}

export const getMonthlyAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const prev = previousMonth(data.month);
    const current = monthRange(data.month);
    const before = monthRange(prev);

    const [rows, categoryRows] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, description, date, category_id, transaction_type, notes")
        .gte("date", before.start)
        .lte("date", current.end),
      supabase.from("categories").select("id, name, is_default, sort_order").order("sort_order"),
    ]);
    if (rows.error) throw new Error(rows.error.message);

    const all = normalise(rows.data as Row[] | null);
    const categories = (categoryRows.data ?? []) as Category[];
    const currentRows = all.filter((t) => t.date.slice(0, 7) === data.month);
    const prevRows = all.filter((t) => t.date.slice(0, 7) === prev);

    const expenses = sum(currentRows, "expense");
    const income = sum(currentRows, "income");
    const totals = categoryTotals(currentRows, categories);
    const activeDays = new Set(
      currentRows.filter((t) => t.transaction_type === "expense").map((t) => t.date),
    ).size;

    return {
      month: data.month,
      previousMonth: prev,
      income,
      expenses,
      net: income - expenses,
      transactionCount: currentRows.length,
      avgDaily: activeDays > 0 ? expenses / activeDays : 0,
      topCategory: totals[0] ?? null,
      categoryTotals: totals,
      dailySeries: buildDailySeries(currentRows, data.month),
      previousExpenses: sum(prevRows, "expense"),
      comparison: [
        { month: prev, total: sum(prevRows, "expense") },
        { month: data.month, total: expenses },
      ],
    };
  });

/* ----------------------------------- AI ----------------------------------- */

export const suggestCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ description: z.string().min(1).max(140) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: categoryRows } = await context.supabase
      .from("categories")
      .select("id, name")
      .order("sort_order");
    const categories = categoryRows ?? [];
    if (categories.length === 0) return { categoryId: null, name: null };

    const { askAI } = await import("./ai.server");
    const names = categories.map((c) => c.name).join(", ");
    const answer = await askAI(
      "You categorise personal expense entries. Reply with exactly one category name from the provided list and nothing else.",
      `Categories: ${names}\nEntry: "${data.description}"\nCategory:`,
    );
    const cleaned = answer.replace(/[^a-zA-Z& ]/g, "").trim().toLowerCase();
    const match =
      categories.find((c) => c.name.toLowerCase() === cleaned) ??
      categories.find((c) => cleaned.includes(c.name.toLowerCase()));
    return match ? { categoryId: match.id, name: match.name } : { categoryId: null, name: null };
  });

type Stats = Record<string, unknown>;

async function buildStats(
  supabase: { from: (t: string) => any },
  today: string,
): Promise<{ stats: Stats }> {
  const month = today.slice(0, 7);
  const prev = previousMonth(month);
  const start = monthRange(prev).start;
  const end = monthRange(month).end;

  const [rows, categoryRows] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, description, date, category_id, transaction_type, notes")
      .gte("date", start)
      .lte("date", end),
    supabase.from("categories").select("id, name, is_default, sort_order"),
  ]);

  const all = normalise(rows.data as Row[] | null);
  const categories = (categoryRows.data ?? []) as Category[];
  const currentRows = all.filter((t) => t.date.slice(0, 7) === month);
  const prevRows = all.filter((t) => t.date.slice(0, 7) === prev);
  const dayNumber = Number(today.slice(8, 10));

  return {
    stats: {
      today,
      currentMonth: month,
      previousMonth: prev,
      todayExpense: sum(currentRows.filter((t) => t.date === today), "expense"),
      monthExpense: sum(currentRows, "expense"),
      monthIncome: sum(currentRows, "income"),
      monthTransactionCount: currentRows.length,
      averageDailyThisMonth: dayNumber > 0 ? sum(currentRows, "expense") / dayNumber : 0,
      categoryTotalsThisMonth: categoryTotals(currentRows, categories),
      categoryTotalsPreviousMonth: categoryTotals(prevRows, categories),
      previousMonthExpense: sum(prevRows, "expense"),
      last14Entries: currentRows
        .slice(-14)
        .map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.transaction_type,
          category: categories.find((c) => c.id === t.category_id)?.name ?? "Uncategorised",
        })),
    },
  };
}

const AI_RULES = [
  "You are the assistant inside a personal expense notebook app. Amounts are Indian rupees (₹).",
  "Use ONLY the JSON figures given to you. Never invent transactions, amounts or dates.",
  "If the data does not answer the question, say so plainly.",
  "Be factual, transparent and non-judgemental. Never shame the user for spending.",
  "Never give investment or financial-product recommendations.",
  "Keep answers short and concrete.",
].join(" ");

export const refreshInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { stats } = await buildStats(supabase as never, data.today);
    if ((stats["monthTransactionCount"] as number) === 0) {
      return { content: "Add a few entries and I'll start pointing out patterns." };
    }

    const { askAI } = await import("./ai.server");
    const content = await askAI(
      `${AI_RULES} Write exactly one short factual sentence (max 25 words) about a notable pattern in this month's spending.`,
      JSON.stringify(stats),
    );

    const { error } = await supabase
      .from("insights")
      .upsert({ user_id: userId, content, generated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { content };
  });

export const listChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        message: z.string().min(1).max(1000),
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const inserted = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "user", content: data.message })
      .select("id");
    if (inserted.error) throw new Error(inserted.error.message);

    const [{ data: history }, { stats }] = await Promise.all([
      supabase.from("chat_messages").select("role, content").order("created_at").limit(40),
      buildStats(supabase as never, data.today),
    ]);

    const transcript = (history ?? [])
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const { askAI } = await import("./ai.server");
    const reply = await askAI(
      AI_RULES,
      `Here is the user's own calculated spending data as JSON:\n${JSON.stringify(stats)}\n\nConversation so far:\n${transcript}\n\nAssistant:`,
    );

    const saved = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "assistant", content: reply })
      .select("id, role, content, created_at")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    return saved.data;
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
