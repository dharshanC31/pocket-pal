import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import {
  deleteAllData,
  deleteCategory,
  listCategories,
  saveCategory,
} from "@/lib/finance.functions";
import { dotColor } from "@/lib/format";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories · Ledger" },
      { name: "description", content: "Rename, add or remove the labels you file entries under." },
      { property: "og:title", content: "Categories · Ledger" },
      {
        property: "og:description",
        content: "Rename, add or remove the labels you file entries under.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const fetchCategories = useServerFn(listCategories);
  const save = useServerFn(saveCategory);
  const remove = useServerFn(deleteCategory);
  const wipe = useServerFn(deleteAllData);
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: { id?: string; name: string }) => save({ data: input }),
    onSuccess: () => {
      setName("");
      setEditingId(null);
      queryClient.invalidateQueries();
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const wipeMutation = useMutation({
    mutationFn: () => wipe(),
    onSuccess: () => {
      setConfirmWipe(false);
      queryClient.invalidateQueries();
    },
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {(categories ?? []).length} labels
      </p>

      <div className="glass mt-6 flex gap-2 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-xl border border-line bg-white/70 px-4 py-3 text-base outline-none"
        />
        <button
          onClick={() => name.trim() && saveMutation.mutate({ name: name.trim() })}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper"
        >
          Add
        </button>
      </div>

      <ul className="glass mt-3 divide-y divide-line px-4">
        {(categories ?? []).map((category, index) => (
          <li key={category.id} className="flex items-center gap-3 py-3.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor(index) }}
            />
            {editingId === category.id ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-white/70 px-3 py-2 text-sm outline-none"
              />
            ) : (
              <span className="flex-1 text-sm font-medium">{category.name}</span>
            )}
            {editingId === category.id ? (
              <button
                onClick={() =>
                  editingName.trim() &&
                  saveMutation.mutate({ id: category.id, name: editingName.trim() })
                }
                className="px-2 py-2 text-[13px]"
                style={{ color: "var(--accent)" }}
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                }}
                className="px-2 py-2 text-[13px] text-muted-foreground hover:text-ink"
              >
                Rename
              </button>
            )}
            <button
              onClick={() => removeMutation.mutate(category.id)}
              className="px-2 py-2 text-[13px] text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <section className="glass mt-6 p-5">
        <p className="label-xs">Your data</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Deleting removes every entry, chat message and insight from this account. Categories stay.
        </p>
        {confirmWipe ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => wipeMutation.mutate()}
              className="rounded-lg bg-destructive px-4 py-2.5 text-sm text-destructive-foreground"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmWipe(false)}
              className="rounded-lg border border-line px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmWipe(true)}
            className="mt-3 rounded-lg border border-line px-4 py-2.5 text-sm"
          >
            Delete my data
          </button>
        )}
      </section>
    </AppShell>
  );
}
