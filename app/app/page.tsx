import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById, upcomingOccasions } from "@/lib/communities";
import { computeInsights } from "@/lib/ai/memory";
import { nearbyMembers, upcomingEvents } from "@/lib/selectors";
import { generateEventAction } from "@/app/actions";
import { EventCard } from "@/components/EventCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, Badge, Card, SectionTitle, SystemNotice } from "@/components/ui";
import { redirect } from "next/navigation";
import { CalendarClock, Sparkles, MapPin, ArrowRight } from "lucide-react";

export default async function Dashboard() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const events = upcomingEvents(communityId);
  const near = nearbyMembers(me, communityId).slice(0, 5);
  const occasions = upcomingOccasions(community.nationality, new Date(), 150);
  const nextOccasion = occasions[0];
  const insights = computeInsights(communityId);
  const content = db.contentOf(communityId);
  // eslint-disable-next-line react-hooks/purity -- server-rendered freshness check
  const isNewcomer = Date.now() - +new Date(me.joinedAt) < 4 * 86400000;

  return (
    <div className="space-y-7">
      {/* hero */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)]">
        <div className="accent-gradient texture-weave px-6 py-7 text-white">
          <p className="text-sm/none opacity-90">
            {community.flagEmoji} {community.demonym} club · {community.region.label}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {isNewcomer ? `Welcome, ${me.name.split(" ")[0]}.` : `Welcome back, ${me.name.split(" ")[0]}.`}
          </h1>
          <p className="mt-1 max-w-xl text-sm opacity-90">
            {db.membersOf(communityId).length} members nearby ·{" "}
            {events.length} upcoming {events.length === 1 ? "activity" : "activities"} · culture
            kept alive together.
          </p>
        </div>

        {/* AI next-up strip */}
        <div className="flex flex-col gap-3 bg-[var(--surface)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg accent-gradient text-white">
              <Sparkles size={18} />
            </span>
            <div>
              <div className="text-sm font-semibold">
                {nextOccasion
                  ? `${nextOccasion.occasion.name} is ${nextOccasion.daysAway} days away`
                  : "Keep the culture active"}
              </div>
              <p className="text-sm text-[var(--muted)]">
                {nextOccasion
                  ? `${nextOccasion.occasion.significance} Let the platform plan an event for it.`
                  : "Generate a fresh cultural activity for the community."}
              </p>
            </div>
          </div>
          <form action={generateEventAction.bind(null, communityId)}>
            <SubmitButton variant="accent" pendingText="Planning event…">
              <Sparkles size={16} /> Generate an event
            </SubmitButton>
          </form>
        </div>
      </section>

      {/* upcoming events */}
      <section>
        <SectionTitle
          subtitle="Proposed and organized by the platform's AI layer."
          action={
            <Link href="/app/events" className="text-sm font-medium text-[var(--accent-ink)] hover:underline">
              All events →
            </Link>
          }
        >
          Upcoming activities
        </SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {events.length === 0 && (
          <SystemNotice>
            No events scheduled yet — generate one above, or explore solo cultural activities in
            the Culture tab. A community of one still gets value here.
          </SystemNotice>
        )}
      </section>

      <div className="grid gap-7 lg:grid-cols-3">
        {/* nearby members */}
        <section className="lg:col-span-2">
          <SectionTitle
            subtitle={`Within ${community.region.radiusMiles} miles of ${me.city.split(",")[0]}.`}
            action={
              <Link href="/app/members" className="text-sm font-medium text-[var(--accent-ink)] hover:underline">
                See all →
              </Link>
            }
          >
            Members near you
          </SectionTitle>
          <Card className="divide-y divide-[var(--line)]">
            {near.map(({ member, miles }) => (
              <Link
                key={member.id}
                href={`/app/messages/${member.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar name={member.name} color={member.avatarColor} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {member.name}
                    {/* eslint-disable-next-line react-hooks/purity -- server-rendered freshness check */}
                    {Date.now() - +new Date(member.joinedAt) < 7 * 86400000 && <Badge tone="green">new</Badge>}
                  </div>
                  <div className="truncate text-xs text-[var(--muted)]">{member.bio ?? member.city}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                  <MapPin size={12} /> {miles < 1 ? "<1" : Math.round(miles)} mi
                </span>
              </Link>
            ))}
            {near.length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--muted)]">
                You&apos;re the first one here — the platform will keep the culture alive with solo
                activities and welcome others as they join.
              </div>
            )}
          </Card>
        </section>

        {/* insight teaser */}
        <section>
          <SectionTitle subtitle="What the platform has learned.">Community insight</SectionTitle>
          <Card className="p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-ink)]">
              <CalendarClock size={14} /> Manager note
            </div>
            <p className="text-sm leading-relaxed">{insights.recommendations[0]}</p>
            <Link
              href="/app/insights"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-ink)] hover:underline"
            >
              See all insights <ArrowRight size={14} />
            </Link>
          </Card>
        </section>
      </div>

      {/* cultural content */}
      <section>
        <SectionTitle
          subtitle="From the community's living cultural knowledge base."
          action={
            <Link href="/app/learn" className="text-sm font-medium text-[var(--accent-ink)] hover:underline">
              Explore culture →
            </Link>
          }
        >
          Learn & keep traditions
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {content.slice(0, 3).map((c) => (
            <Card key={c.id} className="p-4">
              <Badge tone="accent">{c.tag}</Badge>
              <h3 className="mt-2 font-display text-base font-semibold">{c.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
