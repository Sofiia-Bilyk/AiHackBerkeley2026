import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/communities";
import { nearbyMembers } from "@/lib/selectors";
import { Avatar, Card, SectionTitle } from "@/components/ui";
import { dmChannelId, relativeTime } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";

export default async function MessagesPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const members = nearbyMembers(me, communityId).map((x) => x.member);

  // existing DM threads
  const threads = members
    .map((m) => {
      const channel = dmChannelId(me.id, m.id);
      const msgs = db.messagesOf(channel);
      return { m, last: msgs[msgs.length - 1] };
    })
    .filter((t) => t.last)
    .sort((a, b) => +new Date(b.last!.createdAt) - +new Date(a.last!.createdAt));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-[var(--muted)]">Direct messages with members of your community.</p>
      </div>

      {threads.length > 0 && (
        <section>
          <SectionTitle>Conversations</SectionTitle>
          <Card className="divide-y divide-[var(--line)]">
            {threads.map(({ m, last }) => (
              <Link key={m.id} href={`/app/messages/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                <Avatar name={m.name} color={m.avatarColor} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{last!.body}</div>
                </div>
                <span className="text-xs text-[var(--muted)]">{relativeTime(last!.createdAt)}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle subtitle="Start a conversation with anyone in your community.">
          <span className="inline-flex items-center gap-2">
            <MessageSquarePlus size={18} /> Start a chat
          </span>
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <Link key={m.id} href={`/app/messages/${m.id}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 hover:border-[var(--accent-from)]">
              <Avatar name={m.name} color={m.avatarColor} size={40} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-[var(--muted)]">{m.city}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
