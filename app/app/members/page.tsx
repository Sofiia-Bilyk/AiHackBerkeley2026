import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/community-registry";
import { computeInsights } from "@/lib/ai/memory";
import { nearbyMembers } from "@/lib/selectors";
import { Avatar, Badge, Card, SectionTitle, SystemNotice } from "@/components/ui";
import { MapPin, MessageSquare, Sparkles } from "lucide-react";

export default async function MembersPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const near = nearbyMembers(me, communityId);
  const matches = computeInsights(communityId).memberMatches;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Members near you</h1>
        <p className="text-[var(--muted)]">
          {community.demonym} club within {community.region.radiusMiles} miles of {me.city.split(",")[0]}.
        </p>
      </div>

      {/* AI matchmaking */}
      <section>
        <SectionTitle subtitle="The platform proactively suggests ways to connect.">Suggested connections</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m, i) => (
            <Card key={i} className="p-4">
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)]">
                <Sparkles size={14} /> {m.kind}
              </div>
              <p className="text-sm text-[var(--muted)]">{m.rationale}</p>
              <div className="mt-2.5 flex -space-x-2">
                {m.memberIds.map((pid) => {
                  const p = db.profile(pid);
                  return p ? (
                    <Avatar key={pid} name={p.name} color={p.avatarColor} size={28} className="ring-2 ring-[var(--surface)]" />
                  ) : null;
                })}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* roster */}
      <section>
        <SectionTitle>All members</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {near.map(({ member, miles }) => (
            <Card key={member.id} className="flex items-center gap-3 p-3.5">
              <Avatar name={member.name} color={member.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {member.name}
                  {/* eslint-disable-next-line react-hooks/purity -- server-rendered freshness check */}
                  {Date.now() - +new Date(member.joinedAt) < 7 * 86400000 && <Badge tone="green">new</Badge>}
                  {member.restrictedUntil && new Date(member.restrictedUntil) > new Date() && <Badge tone="red">restricted</Badge>}
                </div>
                <div className="truncate text-xs text-[var(--muted)]">{member.bio ?? member.city}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                  <MapPin size={11} /> {member.city.split(",")[0]} · {miles < 1 ? "<1" : Math.round(miles)} mi
                </div>
              </div>
              <Link
                href={`/app/messages/${member.id}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent-ink)] hover:brightness-95"
                title="Message"
              >
                <MessageSquare size={16} />
              </Link>
            </Card>
          ))}
        </div>
        {near.length === 0 && (
          <SystemNotice>
            You&apos;re the first {community.demonym} member in the area. The platform will welcome others
            as they verify and join — and keep the culture active with solo activities meanwhile.
          </SystemNotice>
        )}
      </section>
    </div>
  );
}
