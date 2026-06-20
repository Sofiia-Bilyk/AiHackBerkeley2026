import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { ChatBox, type ChatMessageView } from "@/components/ChatBox";
import { Avatar, Card } from "@/components/ui";
import { dmChannelId } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function DmThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const other = db.profile(id);
  if (!other) notFound();

  const channelId = dmChannelId(me.id, other.id);
  const messages: ChatMessageView[] = db.messagesOf(channelId).map((m) => ({
    id: m.id,
    body: m.body,
    isSystem: false,
    createdAt: m.createdAt,
    mine: m.authorProfileId === me.id,
    author: m.authorProfileId === me.id ? { name: me.name, color: me.avatarColor } : { name: other.name, color: other.avatarColor },
  }));

  return (
    <div className="space-y-4">
      <Link href="/app/messages" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Messages
      </Link>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <Avatar name={other.name} color={other.avatarColor} size={40} />
          <div>
            <div className="text-sm font-medium">{other.name}</div>
            <div className="text-xs text-[var(--muted)]">{other.city}</div>
          </div>
        </div>
        <ChatBox
          messages={messages}
          channelId={channelId}
          kind="dm"
          dmTo={other.id}
          meColor={me.avatarColor}
          meName={me.name}
          placeholder={`Message ${other.name.split(" ")[0]}…`}
          height="h-[440px]"
        />
      </Card>
    </div>
  );
}
