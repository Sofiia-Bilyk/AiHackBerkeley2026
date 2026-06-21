import Link from "next/link";
import { COMMUNITIES } from "@/lib/communities";
import { Card } from "@/components/ui";
import { ArrowRight, MapPin, Plus } from "lucide-react";

export default function Landing() {
  return (
    <main className="texture-weave min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl accent-gradient text-2xl font-bold text-white">C</span>
            <span className="font-display text-3xl font-semibold">Connect</span>
          </div>
          <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Find your cultural community.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--muted)]">
            Join a local community centered on shared culture, traditions, and real-world events.
          </p>
        </header>

        <section aria-labelledby="communities-heading">
          <div className="mb-5 text-center">
            <h2 id="communities-heading" className="font-display text-2xl font-semibold">Available communities</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Choose the cultural group you want to join.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COMMUNITIES.map((community) => (
              <Card key={community.id} className="flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden="true">{community.flagEmoji}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold">{community.demonym} community</h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
                      <MapPin size={14} /> {community.region.label}
                    </p>
                  </div>
                </div>
                <Link
                  href={{ pathname: "/onboarding", query: { community: community.nationality } }}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-ink)] transition-all hover:brightness-110"
                >
                  Join community <ArrowRight size={15} />
                </Link>
              </Card>
            ))}
            <Card className="flex min-h-48 flex-col items-center justify-center border-dashed p-6 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent-ink)]">
                <Plus size={24} />
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold">Add new community</h3>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                More cultural communities are coming soon.
              </p>
              <span className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--muted)]" aria-disabled="true">
                Coming soon
              </span>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
