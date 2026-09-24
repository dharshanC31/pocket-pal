import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCategories,
  saveTransaction,
  suggestCategory,
  type Transaction,
} from "@/lib/finance.functions";
import { todayISO } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Transaction | null;
};

export function AddTransactionSheet({ open, onOpenChange, editing }: Props) {
  const queryClient = useQueryClient();
  const fetchCategories = useServerFn(listCategories);
  const save = useServerFn(saveTransaction);
  const suggest = useServerFn(suggestCategory);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
    enabled: open,
  });

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [touchedCategory, setTouchedCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuggested(null);
    setTouchedCategory(false);
    if (editing) {
      setType(editing.transaction_type);
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setDate(editing.date);
      setCategoryId(editing.category_id);
      setNotes(editing.notes ?? "");
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setCategoryId(null);
      setNotes("");
    }
  }, [open, editing]);

  // Auto-suggest a category once the user pauses typing the description.
  useEffect(() => {
    if (!open || touchedCategory || description.trim().length < 3) return;
    const handle = setTimeout(async () => {
      try {
        const result = await suggest({ data: { description: description.trim() } });
        if (result.categoryId && !touchedCategory) {
          setCategoryId(result.categoryId);
          setSuggested(result.name ?? null);
        }
      } catch {
        /* suggestion is optional */
      }
    }, 700);
    return () => clearTimeout(handle);
  }, [description, open, touchedCategory, suggest]);

  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount");
      if (description.trim() === "") throw new Error("Add a short description");
      return save({
        data: {
          ...(editing ? { id: editing.id } : {}),
          amount: value,
          description,
          date,
          category_id: categoryId,
          transaction_type: type,
          notes: notes === "" ? null : notes,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/20 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-line bg-white/85 p-6 backdrop-blur-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {editing ? "Edit entry" : "New entry"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-line p-1">
          {(["expense", "income"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setType(option)}
              className={`rounded-lg py-3 text-sm font-medium capitalize transition-colors ${
                type === option ? "bg-ink text-paper" : "text-muted-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mt-5 block label-xs">Amount</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-white/70 px-4">
          <span className="num text-xl text-muted-foreground">₹</span>
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="num w-full bg-transparent py-4 text-2xl outline-none"
          />
        </div>

        <label className="mt-4 block label-xs">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Milk, bus fare, rent…"
          className="mt-2 w-full rounded-xl border border-line bg-white/70 px-4 py-3.5 text-base outline-none"
        />

        <label className="mt-4 block label-xs">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="num mt-2 w-full rounded-xl border border-line bg-white/70 px-4 py-3.5 text-base outline-none"
        />

        <div className="mt-4 flex items-baseline justify-between">
          <label className="label-xs">Category</label>
          {suggested && !touchedCategory ? (
            <span className="label-xs" style={{ color: "var(--accent)" }}>
              suggested · {suggested}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(categories ?? []).map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setTouchedCategory(true);
                setCategoryId(category.id);
              }}
              className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
                categoryId === category.id
                  ? "border-transparent bg-ink text-paper"
                  : "border-line text-muted-foreground"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <label className="mt-4 block label-xs">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-xl border border-line bg-white/70 px-4 py-3 text-sm outline-none"
        />

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-5 w-full rounded-xl bg-accent py-4 text-base font-medium text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Add entry"}
        </button>
      </div>
    </div>
  );
}
