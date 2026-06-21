import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/communities";
import { computeInsights, memoryBackend } from "@/lib/ai/memory";
import { Avatar, Badge, Card, SectionTitle } from "@/components/ui";
import { Sparkles, TrendingUp, ShieldAlert, Database } from "lucide-react";

export default async function InsightsPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;
  if (!community || !communityId) redirect("/");

  const insights = computeInsights(communityId);
  const maxAttendance = Math.max(1, ...insights.categoryPerformance.map((c) => c.avgAttendance));
  const maxTrend = Math.max(1, ...insights.attendanceTrend.map((t) => t.value));

  const members = db.membersOf(communityId);
  const flagged = members
    .map((m) => ({ m, failures: db.participationOf(m.id).filter((p) => p.outcome === "failed").length }))
    .filter((x) => x.failures > 0)
    .sort((a, b) => b.failures - a.failures);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Community insights</h1>
          <p className="text-[var(--muted)]">How the platform reasons about this community like a club manager.</p>
        </div>
        <Badge tone="blue">
          <Database size={12} /> Memory: {memoryBackend()}
        </Badge>
      </div>

      {/* recommendations */}
      <section>
        <SectionTitle subtitle="Derived from attendance, categories, recency and new joins.">
          <span className="inline-flex items-center gap-2">
            <Sparkles size={18} /> Manager recommendations
          </span>
        </SectionTitle>
        <div className="space-y-2.5">
          {insights.recommendations.map((r, i) => (
            <Card key={i} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full accent-gradient text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed">{r}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* category performance */}
        <Card className="p-5">
          <SectionTitle subtitle="Average turnout by event type.">What&apos;s working</SectionTitle>
          <div className="space-y-3">
            {insights.categoryPerformance.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{c.category}</span>
                  <span className="text-[var(--muted)]">
                    {c.avgAttendance} avg · {c.events} event{c.events === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full accent-gradient" style={{ width: `${(c.avgAttendance / maxAttendance) * 100}%` }} />
                </div>
              </div>
            ))}
            {insights.categoryPerformance.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No completed events yet to learn from.</p>
            )}
          </div>
        </Card>

        {/* attendance trend */}
        <Card className="p-5">
          <SectionTitle subtitle="Turnout over recent events.">
            <span className="inline-flex items-center gap-2">
              <TrendingUp size={16} /> Attendance trend
            </span>
          </SectionTitle>
          <div className="flex h-40 items-end gap-2">
            {insights.attendanceTrend.map((t, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md accent-gradient"
                    style={{ height: `${(t.value / maxTrend) * 100}%`, minHeight: 6 }}
                    title={`${t.value} attendees`}
                  />
                </div>
                <span className="text-[10px] text-[var(--muted)]">{t.label}</span>
              </div>
            ))}
            {insights.attendanceTrend.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No history yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* accountability */}
      <section>
        <SectionTitle subtitle="Three failures restrict a member from events for six months.">
          <span className="inline-flex items-center gap-2">
            <ShieldAlert size={18} /> Accountability
          </span>
        </SectionTitle>
        <Card className="divide-y divide-[var(--line)]">
          {flagged.map(({ m, failures }) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} color={m.avatarColor} size={38} />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {m.name}
                  {m.restrictedUntil && new Date(m.restrictedUntil) > new Date() ? (
                    <Badge tone="red">restricted 6mo</Badge>
                  ) : (
                    <Badge tone="amber">{failures}/3 strikes</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {failures} task failure{failures === 1 ? "" : "s"}. The platform deprioritizes
                  them for critical tasks until they rebuild reliability.
                </p>
              </div>
            </div>
          ))}
          {flagged.length === 0 && (
            <div className="px-4 py-6 text-sm text-[var(--muted)]">Everyone&apos;s in good standing. 🎉</div>
          )}
        </Card>
      </section>
    </div>
  );
}
