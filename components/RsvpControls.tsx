"use client";

import { useTransition } from "react";
import { Check, Star, Loader2 } from "lucide-react";
import { rsvpAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function RsvpControls({
  eventId,
  current,
  restricted,
}: {
  eventId: string;
  current?: "going" | "interested" | "declined";
  restricted?: boolean;
}) {
  const [pending, start] = useTransition();

  function set(status: "going" | "interested") {
    start(() => rsvpAction(eventId, status));
  }

  if (restricted) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        You&apos;re restricted from joining events right now.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => set("going")}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
          current === "going"
            ? "accent-gradient text-white shadow-sm"
            : "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
        )}
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        I&apos;m going
      </button>
      <button
        onClick={() => set("interested")}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
          current === "interested"
            ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] border border-[var(--accent-from)]/40"
            : "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
        )}
      >
        <Star size={15} /> Interested
      </button>
    </div>
  );
}
