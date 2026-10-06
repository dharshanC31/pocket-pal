import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { clearChat, listChatMessages, sendChatMessage } from "@/lib/finance.functions";
import { todayISO } from "@/lib/format";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant · Ledger" },
      { name: "description", content: "Ask questions about your own recorded spending." },
      { property: "og:title", content: "Assistant · Ledger" },
      { property: "og:description", content: "Ask questions about your own recorded spending." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assistant,
});

const PROMPTS = [
  "What did I spend most on this month?",
  "How does this month compare to last month?",
  "Anything unusual in my spending?",
];

function Assistant() {
  const fetchMessages = useServerFn(listChatMessages);
  const send = useServerFn(sendChatMessage);
  const clear = useServerFn(clearChat);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["chat"],
    queryFn: () => fetchMessages(),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => send({ data: { message, today: todayISO() } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });
  const clearMutation = useMutation({
    mutationFn: () => clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [messages, sendMutation.isPending]);

  function submit() {
    const text = draft.trim();
    if (text === "" || sendMutation.isPending) return;
    setDraft("");
    sendMutation.mutate(text);
  }

  const pending = sendMutation.isPending;

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers come only from what you've recorded.
          </p>
        </div>
        {(messages ?? []).length > 0 ? (
          <button
            onClick={() => clearMutation.mutate()}
            className="rounded-lg border border-line px-3 py-2 text-[13px] text-muted-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        {(messages ?? []).length === 0 ? (
          <div className="glass p-5">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMutation.mutate(prompt)}
                  className="rounded-full border border-line px-3.5 py-2 text-[13px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {(messages ?? []).map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl bg-ink px-4 py-3 text-sm text-paper">
                {message.content}
              </p>
            </div>
          ) : (
            <div
              key={message.id}
              className="prose prose-sm max-w-none text-[15px] leading-relaxed text-ink"
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ),
        )}

        {pending ? <p className="label-xs animate-pulse">Thinking…</p> : null}
        {sendMutation.isError ? (
          <p className="text-sm text-destructive">
            That didn't go through. Please try again in a moment.
          </p>
        ) : null}
      </div>

      <div className="glass sticky bottom-24 mt-6 flex items-end gap-2 p-3 md:bottom-4">
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about your spending"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </AppShell>
  );
}
