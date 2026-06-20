"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { askCultureAction } from "@/app/actions";

export function CultureAsk({ communityId, demonym }: { communityId: string; demonym: string }) {
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const suggestions = [
    `What should I cook for a ${demonym} celebration?`,
    `Tell me about a ${demonym} wedding tradition`,
    `How do I greet elders respectfully?`,
  ];

  function ask(question: string) {
    if (!question.trim()) return;
    setAnswer(null);
    start(async () => {
      const res = await askCultureAction(communityId, question);
      setAnswer(res);
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Sparkles size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-ink)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Ask anything about ${demonym} culture…`}
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent-from)]"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !q.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full accent-gradient text-white transition-all active:scale-95 disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {!answer && !pending && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQ(s);
                ask(s);
              }}
              className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--accent-from)] hover:text-[var(--accent-ink)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(answer || pending) && (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm leading-relaxed">
          {pending ? (
            <span className="inline-flex items-center gap-2 text-[var(--muted)]">
              <Loader2 size={14} className="animate-spin" /> Consulting the cultural knowledge base…
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{answer}</p>
          )}
        </div>
      )}
    </div>
  );
}
