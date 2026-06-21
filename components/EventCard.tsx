import Link from "next/link";
import { Badge, Progress } from "@/components/ui";
import { EventArt } from "@/components/EventArt";
import { attendance, taskProgress } from "@/lib/selectors";
import { formatEventDate } from "@/lib/utils";
import type { CulturalEvent } from "@/lib/types";
import { Sparkles, MapPin, Users } from "lucide-react";

const statusTone: Record<string, "green" | "amber" | "neutral" | "blue"> = {
  planned: "green",
  gauging: "amber",
  completed: "neutral",
  proposed: "blue",
  cancelled: "neutral",
};

export function EventCard({ event }: { event: CulturalEvent }) {
  const prog = taskProgress(event.id);
  const att = attendance(event.id);

  return (
    <Link
      href={`/app/events/${event.id}`}
      className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] transition-shadow hover:shadow-md"
    >
      <div className="flex">
        <EventArt seed={event.imageSeed} category={event.category} className="w-20 shrink-0" size={26} />
        <div className="min-w-0 flex-1 p-3.5">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={statusTone[event.status]}>{labelFor(event.status)}</Badge>
            {event.source === "ai" ? (
              <Badge tone="accent">
                <Sparkles size={11} /> AI-organized
              </Badge>
            ) : (
              <Badge tone="neutral">Member idea</Badge>
            )}
            <span className="ml-auto text-xs text-[var(--muted)] capitalize">{event.category}</span>
          </div>

          <h3 className="font-display text-base font-semibold leading-snug group-hover:text-[var(--accent-ink)]">
            {event.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            <span>{formatEventDate(event.startsAt)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {event.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {att.going} going{att.interested ? ` · ${att.interested} interested` : ""}
            </span>
          </div>

          {event.status === "planned" && prog.total > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Coordination</span>
                <span>
                  {prog.completed}/{prog.total} done
                  {prog.open > 0 && ` · ${prog.open} unclaimed`}
                </span>
              </div>
              <Progress value={prog.ratio} />
            </div>
          )}

          {event.status === "gauging" && (
            <p className="mt-2 text-xs text-[var(--accent-ink)]">
              Gathering interest — {event.interestCount} interested so far.
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function labelFor(status: string): string {
  if (status === "gauging") return "Gauging interest";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
