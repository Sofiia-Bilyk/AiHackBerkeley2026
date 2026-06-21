import Link from "next/link";
import { COMMUNITIES } from "@/lib/communities";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ArrowLeft } from "lucide-react";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ community?: string }> }) {
  const { community } = await searchParams;
  const nationalities = COMMUNITIES.map((c) => ({ nationality: c.nationality, flagEmoji: c.flagEmoji }));
  const initialNationality = nationalities.some((item) => item.nationality === community)
    ? community
    : nationalities[0]?.nationality;
  return (
    <div className="texture-weave min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="my-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl accent-gradient text-lg font-bold text-white">C</span>
            <span className="font-display text-xl font-semibold">Connect</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Join your cultural club</h1>
          <p className="mt-2 text-[var(--muted)]">
            Tell us where you are and where you&apos;re from. The platform places you in a nationality-based
            community near you and starts organizing.
          </p>
        </div>
        <OnboardingFlow nationalities={nationalities} initialNationality={initialNationality} />
      </div>
    </div>
  );
}
