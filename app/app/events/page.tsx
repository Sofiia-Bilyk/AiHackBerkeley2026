import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/communities";
import { pastEvents, upcomingEvents } from "@/lib/selectors";
import { generateEventAction, proposeEventAction } from "@/app/actions";
import { EventCard } from "@/components/EventCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionTitle } from "@/components/ui";
import { Sparkles, Lightbulb } from "lucide-react";

export default async function EventsPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const upcoming = upcomingEvents(communityId);
  const past = pastEvents(communityId);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-[var(--muted)]">AI-organized and member-proposed gatherings for the {community.demonym} club.</p>
      </div>

      {/* create row */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg accent-gradient text-white">
              <Sparkles size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold">Let the platform plan one</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              It checks the cultural calendar, community size and past attendance, then proposes an
              authentic event with materials, venues and tasks.
            </p>
          </div>
          <form action={generateEventAction.bind(null, communityId)} className="mt-4">
            <SubmitButton variant="accent" pendingText="Planning event…">
              <Sparkles size={16} /> Generate an event
            </SubmitButton>
          </form>
        </Card>

        <Card className="p-5">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent-ink)]">
            <Lightbulb size={18} />
          </div>
          <h2 className="font-display text-lg font-semibold">Propose your own idea</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">The platform takes over organizing approved ideas.</p>
          <form action={proposeEventAction} className="mt-3 space-y-2">
            <input type="hidden" name="communityId" value={communityId} />
            <input
              name="title"
              required
              maxLength={80}
              placeholder="Event title (e.g. Movie night)"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-from)]"
            />
            <textarea
              name="idea"
              rows={2}
              placeholder="What's the idea?"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-from)]"
            />
            <SubmitButton variant="secondary" size="sm" pendingText="Submitting…">
              Propose event
            </SubmitButton>
          </form>
        </Card>
      </div>

      <section>
        <SectionTitle>Upcoming</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {upcoming.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing scheduled — generate one above.</p>}
      </section>

      {past.length > 0 && (
        <section>
          <SectionTitle subtitle="Attendance history feeds the platform's recommendations.">Past events</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
