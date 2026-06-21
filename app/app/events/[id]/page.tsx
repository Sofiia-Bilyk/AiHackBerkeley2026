import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/community-registry";
import { attendance, isRestricted, taskProgress } from "@/lib/selectors";
import { commitEventAction } from "@/app/actions";
import { EventArt } from "@/components/EventArt";
import { RsvpControls } from "@/components/RsvpControls";
import { TaskList, type TaskView } from "@/components/TaskList";
import { AdvanceButton } from "@/components/AdvanceButton";
import { ChatBox, type ChatMessageView } from "@/components/ChatBox";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, Badge, Card, Progress, SectionTitle } from "@/components/ui";
import { formatEventDate } from "@/lib/utils";
import { ArrowLeft, MapPin, Sparkles, Package, Building2, BookOpen, Users } from "lucide-react";

function dueInDays(startsAt: string, dueOffsetDays: number): number {
  const due = new Date(startsAt);
  due.setDate(due.getDate() - dueOffsetDays);
  return Math.ceil((+due - Date.now()) / 86_400_000);
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const event = db.event(id);
  if (!event) notFound();
  const community = communityById(event.communityId);
  if (!community) notFound();

  const prog = taskProgress(event.id);
  const att = attendance(event.id);
  const myRsvp = db.rsvpFor(event.id, me.id)?.status;
  const restricted = isRestricted(me);

  const tasks: TaskView[] = db.tasksOf(event.id).map((t) => {
    const assignee = t.assigneeProfileId ? db.profile(t.assigneeProfileId) : undefined;
    return {
      id: t.id,
      title: t.title,
      detail: t.detail,
      status: t.status,
      critical: t.critical,
      dueInDays: dueInDays(event.startsAt, t.dueOffsetDays),
      assignee: assignee ? { id: assignee.id, name: assignee.name, color: assignee.avatarColor } : undefined,
    };
  });

  const messages: ChatMessageView[] = db.messagesOf(event.id).map((m) => {
    const author = m.authorProfileId ? db.profile(m.authorProfileId) : undefined;
    return {
      id: m.id,
      body: m.body,
      isSystem: m.isSystem,
      createdAt: m.createdAt,
      mine: m.authorProfileId === me.id,
      author: author ? { name: author.name, color: author.avatarColor } : undefined,
    };
  });

  const goingMembers = db
    .rsvpsOf(event.id)
    .filter((r) => r.status === "going")
    .map((r) => db.profile(r.profileId))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/app/events" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> All events
      </Link>

      {/* header */}
      <Card className="overflow-hidden">
        <EventArt seed={event.imageSeed} category={event.category} imageUrl={event.imageUrl} alt="" className="h-32 w-full" size={44} />
        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {event.source === "ai" ? (
              <Badge tone="accent">
                <Sparkles size={11} /> AI-organized
              </Badge>
            ) : (
              <Badge tone="neutral">Member idea</Badge>
            )}
            <Badge tone={event.status === "planned" ? "green" : event.status === "gauging" ? "amber" : "neutral"}>
              {event.status === "gauging" ? "Gauging interest" : event.status}
            </Badge>
            {event.holiday && <Badge tone="blue">{event.holiday}</Badge>}
            <span className="text-xs capitalize text-[var(--muted)]">{event.category}</span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1.5 text-[var(--muted)]">{event.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            <span>{formatEventDate(event.startsAt)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {event.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={14} /> {att.going} going · {att.interested} interested
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <RsvpControls eventId={event.id} current={myRsvp} restricted={restricted} />
            {event.status === "gauging" && (
              <form action={commitEventAction.bind(null, event.id)}>
                <SubmitButton variant="secondary" pendingText="Opening tasks…">
                  Confirm & open tasks
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* left: cultural + logistics */}
        <div className="space-y-6 lg:col-span-3">
          {/* significance */}
          <Card className="p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)]">
              <BookOpen size={15} /> Why this matters
            </div>
            <p className="text-sm leading-relaxed">{event.culturalSignificance}</p>
            {event.participantInstructions && (
              <p className="mt-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-sm leading-relaxed">
                <span className="font-medium">For participants: </span>
                {event.participantInstructions}
              </p>
            )}
          </Card>

          {/* tasks */}
          {event.status === "planned" && tasks.length > 0 ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Coordination tasks</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {prog.completed}/{prog.total} complete
                    {prog.open > 0 ? ` · ${prog.open} still unclaimed` : " · all claimed"}
                  </p>
                </div>
                <AdvanceButton eventId={event.id} />
              </div>
              <div className="px-4 pt-3">
                <Progress value={prog.ratio} />
              </div>
              <TaskList tasks={tasks} meId={me.id} restricted={restricted} />
              <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
                Unclaimed tasks are auto-assigned to attendees when you advance coordination. The
                platform sends reminders until each assignee marks their work complete.
              </p>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold">Tasks open once confirmed</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                This event is still gathering interest. Once it&apos;s confirmed, the platform will
                generate the task list and begin coordinating.
              </p>
            </Card>
          )}

          {/* materials */}
          {event.materials.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                <Package size={15} /> Materials &amp; supplies
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {event.materials.map((m, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <span>{m.item}</span>
                    <span className="font-medium text-[var(--accent-ink)]">{m.quantity}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* venues */}
          {event.suggestedVenues.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                <Building2 size={15} /> Suggested venues
              </div>
              <div className="space-y-2.5">
                {event.suggestedVenues.map((v, i) => (
                  <div key={i} className="rounded-xl border border-[var(--line)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {v.name}
                      <Badge tone="neutral">{v.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{v.why}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">The platform suggests venues; booking stays with the community.</p>
            </Card>
          )}
        </div>

        {/* right: attendees + chat */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-4">
            <SectionTitle>Who&apos;s coming</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {goingMembers.map(
                (m) =>
                  m && (
                    <div key={m.id} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] py-1 pl-1 pr-3">
                      <Avatar name={m.name} color={m.avatarColor} size={26} />
                      <span className="text-xs font-medium">{m.name.split(" ")[0]}</span>
                    </div>
                  ),
              )}
              {goingMembers.length === 0 && <p className="text-sm text-[var(--muted)]">Be the first to RSVP.</p>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="font-display text-lg font-semibold">Event chat</h2>
              <p className="text-xs text-[var(--muted)]">Coordination updates appear here automatically.</p>
            </div>
            <ChatBox
              messages={messages}
              channelId={event.id}
              kind="event"
              meColor={me.avatarColor}
              meName={me.name}
              height="h-[360px]"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
