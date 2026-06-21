import Link from "next/link";
import { onboardingCommunities } from "@/lib/community-registry";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Badge, Card, SystemNotice } from "@/components/ui";
import { ArrowLeft, BookOpen, EyeOff, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ community?: string; create?: string }> }) {
  const { community, create } = await searchParams;
  const available = onboardingCommunities(create === "true");
  const nationalities = available.map((c) => ({ nationality: c.nationality, flagEmoji: c.flagEmoji }));
  const initialNationality = nationalities.some((item) => item.nationality === community)
    ? community
    : nationalities[0]?.nationality;
  const isCreating = create === "true";
  return (
    <main id="main-content" className="texture-weave min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="my-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl accent-gradient text-lg font-bold text-white">C</span>
            <span className="font-display text-xl font-semibold">Connect</span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{isCreating ? "Create a private AI community draft" : "Join your cultural club"}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-[var(--muted)]">
            {isCreating
              ? "Connect prepares the first version with verified sources, privacy defaults, and organizer review before publication."
              : "Tell us where you are and where you're from. Connect places you in a nearby community and starts organizing."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <OnboardingFlow nationalities={nationalities} initialNationality={initialNationality} creating={isCreating} />

          <aside className="space-y-4" aria-label="AI creation safeguards">
            <Card className="p-5">
              <Badge tone={isCreating ? "amber" : "green"}>{isCreating ? "Draft mode" : "Member privacy"}</Badge>
              <h2 className="mt-3 font-display text-2xl font-semibold">What Connect prepares</h2>
              <div className="mt-5 space-y-4 text-sm text-[var(--muted)]">
                <p className="flex gap-3"><BookOpen size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" /> Source-backed cultural calendar with citations before recommendations.</p>
                <p className="flex gap-3"><MapPinned size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" /> Venue and permit checklist for local gatherings.</p>
                <p className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" /> Organizer approval for AI event proposals and cultural context.</p>
                <p className="flex gap-3"><EyeOff size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" /> Public pages avoid usernames unless members opt in.</p>
              </div>
            </Card>

            <SystemNotice>
              AI drafts are intentionally restrained: facts stay cited, community notes stay editable, and reminders use reliability signals instead of identity documents or photos.
            </SystemNotice>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={18} className="text-[var(--primary)]" /> First event proposal</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">After setup, Connect suggests one culturally relevant gathering with workload, sponsor, supply, and readiness states.</p>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
