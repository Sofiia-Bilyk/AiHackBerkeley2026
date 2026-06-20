"use client";

import { useTransition } from "react";
import { FastForward, Loader2 } from "lucide-react";
import { advanceCoordinatorAction } from "@/app/actions";

/** Demo control: fires one autonomous coordinator pass (assigns unclaimed tasks,
 *  posts reminders) so judges can watch the AI manage execution live. */
export function AdvanceButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => advanceCoordinatorAction(eventId))}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-ink)] shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <FastForward size={16} />}
      {pending ? "Coordinating…" : "Advance coordination"}
    </button>
  );
}
