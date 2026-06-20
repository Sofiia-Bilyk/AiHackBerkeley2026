import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/communities";
import { CultureAsk } from "@/components/CultureAsk";
import { Badge, Card, SectionTitle } from "@/components/ui";
import type { CulturalContentKind } from "@/lib/types";
import { Hand } from "lucide-react";

const KIND_LABEL: Record<CulturalContentKind, string> = {
  tradition: "Traditions",
  recipe: "Recipes",
  craft: "Crafts",
  holiday: "Holidays",
  history: "History",
  activity: "Solo activities",
};

export default async function LearnPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const content = db.contentOf(communityId);
  const solo = content.filter((c) => c.kind === "activity");
  const rest = content.filter((c) => c.kind !== "activity");

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {community.flagEmoji} {community.demonym} culture
        </h1>
        <p className="text-[var(--muted)]">A living knowledge base of traditions, recipes, crafts and history.</p>
      </div>

      {/* knowledge assistant */}
      <Card className="p-5">
        <SectionTitle subtitle="Powered by the cultural intelligence layer.">Ask about the culture</SectionTitle>
        <CultureAsk communityId={communityId} demonym={community.demonym} />
      </Card>

      {/* solo activities — the empty-state killer */}
      <section>
        <SectionTitle subtitle="Keep the culture alive even when no local event is on.">
          <span className="inline-flex items-center gap-2">
            <Hand size={18} /> Solo cultural activities
          </span>
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {solo.map((c) => (
            <Card key={c.id} className="p-4">
              <Badge tone="accent">{c.tag}</Badge>
              <h3 className="mt-2 font-display text-base font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* knowledge base */}
      <section>
        <SectionTitle>Cultural knowledge base</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((c) => (
            <Card key={c.id} className="p-4">
              <Badge tone="neutral">{KIND_LABEL[c.kind]}</Badge>
              <h3 className="mt-2 font-display text-base font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
