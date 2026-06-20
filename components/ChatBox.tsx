"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui";
import { postMessageAction, sendDmAction } from "@/app/actions";
import { cn, relativeTime } from "@/lib/utils";

export interface ChatMessageView {
  id: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  mine: boolean;
  author?: { name: string; color: string };
}

export function ChatBox({
  messages,
  channelId,
  kind,
  meColor,
  meName,
  dmTo,
  placeholder = "Message the group…",
  height = "h-[420px]",
}: {
  messages: ChatMessageView[];
  channelId: string;
  kind: "event" | "dm";
  meColor: string;
  meName: string;
  dmTo?: string;
  placeholder?: string;
  height?: string;
}) {
  const [pending, start] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(messages, (state, body: string) => [
    ...state,
    { id: `tmp-${Date.now()}`, body, isSystem: false, createdAt: new Date().toISOString(), mine: true, author: { name: meName, color: meColor } },
  ]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [optimistic.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    start(async () => {
      addOptimistic(body);
      if (kind === "dm" && dmTo) await sendDmAction(dmTo, body);
      else await postMessageAction(channelId, kind, body);
    });
  }

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className={cn("scrollbar-thin space-y-2.5 overflow-y-auto px-4 py-4", height)}>
        {optimistic.map((m) =>
          m.isSystem ? (
            <SystemBubble key={m.id} body={m.body} time={m.createdAt} />
          ) : (
            <MessageBubble key={m.id} message={m} />
          ),
        )}
        {optimistic.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No messages yet. Say hello 👋</p>
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-[var(--line)] p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent-from)]"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full accent-gradient text-white transition-all active:scale-95 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessageView }) {
  return (
    <div className={cn("flex items-end gap-2", message.mine && "flex-row-reverse")}>
      {message.author && <Avatar name={message.author.name} color={message.author.color} size={26} />}
      <div className={cn("max-w-[78%]", message.mine && "text-right")}>
        {!message.mine && message.author && (
          <div className="mb-0.5 px-1 text-xs font-medium text-[var(--muted)]">{message.author.name.split(" ")[0]}</div>
        )}
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2 text-sm",
            message.mine ? "accent-gradient text-white" : "bg-[var(--surface-2)] text-[var(--foreground)]",
          )}
        >
          {message.body}
        </div>
        <div className="mt-0.5 px-1 text-[10px] text-[var(--muted)]">{relativeTime(message.createdAt)}</div>
      </div>
    </div>
  );
}

function SystemBubble({ body, time }: { body: string; time: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-[var(--accent-from)]/30 bg-[var(--accent-soft)]/60 px-3.5 py-2 text-sm text-[var(--accent-ink)]">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full accent-gradient text-[9px] font-bold text-white">
        C
      </span>
      <div className="leading-snug">
        {body}
        <div className="mt-0.5 text-[10px] opacity-70">{relativeTime(time)}</div>
      </div>
    </div>
  );
}
