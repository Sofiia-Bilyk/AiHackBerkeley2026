import Link from "next/link";
import { db } from "@/lib/store";
import { COMMUNITIES, communityById } from "@/lib/communities";
import { loginAs } from "@/app/actions";
import { Avatar, Badge, Card } from "@/components/ui";
import { hasApiKey } from "@/lib/ai/client";
import { memoryBackend } from "@/lib/ai/memory";
import { Sparkles, CheckCircle2, CalendarCheck, Camera } from "lucide-react";

export default function Landing() {
  const personas = db.profiles().filter((p) => p.isDemoSeed);

  return (
    <div className="texture-weave min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10">
        {/* hero */}
        <header className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl accent-gradient text-xl font-bold text-white">
              C
            </span>
            <span className="font-display text-2xl font-semibold">Connect</span>
          </div>
          <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Cultural clubs that run themselves.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--muted)]">
            Connect keeps diaspora culture alive through real-world events — proposed,
            organized, and followed up on by an invisible AI layer. No human admin required.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <Badge tone={hasApiKey() ? "green" : "amber"}>
              {hasApiKey() ? "Claude live" : "Claude offline — using fallbacks"}
            </Badge>
            <Badge tone="blue">Memory: {memoryBackend()}</Badge>
            <Badge tone="neutral">Local demo build</Badge>
          </div>
        </header>

        {/* three pillars */}
        <div className="mb-10 grid gap-3 sm:grid-cols-3">
          <Pillar
            icon={<Sparkles size={18} />}
            title="It proposes events"
            body="Knows the cultural calendar, traditions and recipes for each nationality — and plans authentic events around them."
          />
          <Pillar
            icon={<CalendarCheck size={18} />}
            title="It coordinates them"
            body="Breaks events into tasks, assigns unclaimed work, and chases reminders until everything's covered."
          />
          <Pillar
            icon={<Camera size={18} />}
            title="It verifies the work"
            body="Members upload a photo as proof; Claude judges whether the task is actually done."
          />
        </div>

        {/* persona picker */}
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h2 className="font-display text-xl font-semibold">Step into the demo</h2>
          </div>
          <p className="mb-5 text-sm text-[var(--muted)]">
            Pick a verified member to explore their community. Or{" "}
            <span className="font-medium text-[var(--foreground)]">Sofia</span> — a brand-new
            member — to see how the platform welcomes newcomers.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {COMMUNITIES.map((c) => (
              <div key={c.id}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="text-lg">{c.flagEmoji}</span>
                  {c.demonym} club
                  <span className="text-xs font-normal text-[var(--muted)]">· {c.region.label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {personas
                    .filter((p) => communityById(c.id)?.nationality === p.primaryNationality)
                    .map((p) => (
                      <form key={p.id} action={loginAs.bind(null, p.id)}>
                        <button className="group flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left transition-colors hover:border-[var(--accent-from)] hover:bg-[var(--accent-soft)]">
                          <Avatar name={p.name} color={p.avatarColor} size={38} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {p.name}
                              {p.strikes >= 2 && <Badge tone="red">2 strikes</Badge>}
                              {Date.now() - +new Date(p.joinedAt) < 3 * 86400000 && (
                                <Badge tone="green">new</Badge>
                              )}
                            </div>
                            <div className="truncate text-xs text-[var(--muted)]">{p.city}</div>
                          </div>
                          <span className="text-xs text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100">
                            Enter →
                          </span>
                        </button>
                      </form>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Or try the real sign-up with AI ID verification —{" "}
          <Link href="/onboarding" className="font-medium text-[var(--accent-ink)] underline underline-offset-2">
            create an account
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg accent-gradient text-white">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </Card>
  );
}
