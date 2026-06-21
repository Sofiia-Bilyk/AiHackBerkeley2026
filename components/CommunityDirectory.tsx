"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Search, Sparkles, X } from "lucide-react";
import { COMMUNITIES } from "@/lib/communities";
import { Badge, Card } from "@/components/ui";

const nextEvents: Record<string, { day: string; name: string }> = {
  Finnish: { day: "Sat, Jun 20", name: "Midsummer picnic" },
  Georgian: { day: "Sun, Sep 13", name: "Supra dinner" },
  Lithuanian: { day: "Sat, Jun 20", name: "Jonines gathering" },
  Polish: { day: "Sun, Apr 5", name: "Easter table" },
  French: { day: "Tue, Jul 14", name: "Bastille Day picnic" },
  Japanese: { day: "Sat, Aug 15", name: "Obon evening" },
  Korean: { day: "Fri, Sep 25", name: "Chuseok meal" },
  Indian: { day: "Sun, Nov 8", name: "Diwali lights" },
  Taiwanese: { day: "Sat, Mar 7", name: "Lantern Festival night" },
  Norwegian: { day: "Sun, May 17", name: "Constitution Day picnic" },
  Swedish: { day: "Sat, Jun 20", name: "Midsummer table" },
};

export function CommunityDirectory({ featuredNationalities }: { featuredNationalities?: string[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(!featuredNationalities);
  const communities = useMemo(() => {
    if (!featuredNationalities || showAll) return COMMUNITIES;
    const featured = new Set(featuredNationalities);
    return COMMUNITIES.filter((community) => featured.has(community.nationality));
  }, [featuredNationalities, showAll]);
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return communities;
    return communities.filter((community) =>
      `${community.nationality} ${community.demonym} ${community.region.label}`.toLocaleLowerCase().includes(value),
    );
  }, [communities, query]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const canCreateUkrainian = filtered.length === 0 && (normalizedQuery === "ukraine" || normalizedQuery === "ukrainian");

  return (
    <>
      <div className="relative mb-6 max-w-2xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by culture, language, or region"
          aria-label="Search communities"
          className="min-h-12 w-full rounded-full border border-[var(--outline-variant)] bg-[var(--surface)] py-3 pl-11 pr-11 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent-from)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]">
            <X size={16} />
          </button>
        )}
      </div>

      {featuredNationalities && (
        <div className="shape-expressive mb-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--outline-variant)] bg-[var(--surface)] p-2 shadow-[0_1px_2px_rgba(33,27,22,0.05)]">
          <div className="flex rounded-full bg-[var(--surface-container)] p-1" role="group" aria-label="Community list filter">
            <button
              type="button"
              onClick={() => setShowAll(false)}
              aria-pressed={!showAll}
              className={`spring-motion min-h-10 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${!showAll ? "bg-[var(--primary-container)] text-[var(--on-primary-container)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Recently active
            </button>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              aria-pressed={showAll}
              className={`spring-motion min-h-10 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${showAll ? "bg-[var(--primary-container)] text-[var(--on-primary-container)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              All communities
            </button>
          </div>
          <p className="px-2 text-sm text-[var(--muted)]">
            Showing {filtered.length} of {COMMUNITIES.length}
          </p>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="mb-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8">
          <Badge tone="amber">Missing community</Badge>
          <p className="mt-3 font-display text-2xl font-semibold">{canCreateUkrainian ? "No Ukrainian community exists yet" : "No communities found"}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{canCreateUkrainian ? "Create a private draft with cultural sources, suggested holidays, and organizer review before anything goes public." : "Try another search or request a new community below."}</p>
          {canCreateUkrainian && (
            <Link href={{ pathname: "/onboarding", query: { community: "Ukrainian", create: "true" } }} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-ink)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">
              <Sparkles size={16} /> Create private AI draft
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((community) => (
          <Card key={community.id} className="spring-motion flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-[var(--outline)] hover:shadow-[0_12px_28px_rgba(33,25,35,0.12)]">
            <div className="h-2 accent-gradient" style={{ "--accent-from": community.accent.from, "--accent-to": community.accent.to } as CSSProperties} />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="text-4xl" aria-hidden="true">{community.flagEmoji}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold">{community.demonym} community</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--muted)]"><MapPin size={14} /> {community.region.label}</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[var(--surface-container)] p-4">
                <p className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)]"><CalendarDays size={15} /> {nextEvents[community.nationality]?.day ?? "Next event"}</p>
                <p className="mt-2 font-display text-2xl font-semibold">{nextEvents[community.nationality]?.name ?? "Community gathering"}</p>
              </div>
              <Link href={{ pathname: "/onboarding", query: { community: community.nationality } }} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-ink)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
                Join community <ArrowRight size={15} />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
