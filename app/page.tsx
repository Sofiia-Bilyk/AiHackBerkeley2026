import { CommunityDirectory } from "@/components/CommunityDirectory";
import { Badge, Card } from "@/components/ui";
import { midjourneyPastEventImages } from "@/lib/midjourney-images";
import { CalendarDays, MapPin } from "lucide-react";

const pastEvents = [
  {
    name: "Midsummer picnic",
    community: "Finnish community",
    tradition: "Juhannus songs and shared picnic table",
    date: "June 20, 2026",
    datetime: "2026-06-20",
    timePlace: "4:00 PM at Tilden Regional Park",
    image: "photo-midsummer",
    imageUrl: midjourneyPastEventImages.midsummer.url,
    imagePrompt: midjourneyPastEventImages.midsummer.prompt,
    href: "/events/midsummer-picnic",
  },
  {
    name: "Obon evening",
    community: "Japanese community",
    tradition: "Lanterns, dance, and remembrance",
    date: "August 15, 2026",
    datetime: "2026-08-15",
    timePlace: "6:30 PM at Berkeley Buddhist Temple",
    image: "photo-obon",
    imageUrl: midjourneyPastEventImages.obon.url,
    imagePrompt: midjourneyPastEventImages.obon.prompt,
    href: "/events/obon-evening",
  },
];

const featuredCommunities = ["Swedish", "Lithuanian", "Japanese", "Indian", "Georgian", "Taiwanese"];

const userReviews = [
  {
    name: "Mina K.",
    community: "Japanese community",
    text: "I found an Obon event near me in minutes, and the context made it easy to join respectfully.",
  },
  {
    name: "Aarne L.",
    community: "Finnish community",
    text: "The volunteer tasks were small and clear, so helping with Midsummer did not feel overwhelming.",
  },
];

export default function Landing() {
  return (
    <main id="main-content" className="texture-weave min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        <header className="mb-12 max-w-3xl">
          <div className="shape-expressive mb-6 inline-flex items-center gap-3 border border-[var(--outline-variant)] bg-[var(--surface)]/85 px-3 py-2 shadow-[0_6px_20px_rgba(33,25,35,0.08)] backdrop-blur">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl accent-gradient text-xl font-bold text-white shadow-sm">C</span>
            <span className="font-display text-2xl font-semibold">Connect</span>
            <Badge tone="accent">AI cultural-club manager</Badge>
          </div>
          <h1 className="text-emphasized font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
            Build cultural communities without burning out volunteers.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Connect helps diaspora communities discover each other, verify cultural moments from trusted sources,
            approve event ideas, and coordinate the quiet work that makes gatherings happen.
          </p>
        </header>

        <section aria-labelledby="communities-heading" className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-5">
              <h2 id="communities-heading" className="font-display text-3xl font-semibold">Available communities</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Choose the cultural group you want to join.</p>
            </div>
            <CommunityDirectory featuredNationalities={featuredCommunities} />
          </div>

          <aside className="space-y-4" aria-label="Public past events preview">
            <Card className="overflow-hidden p-0">
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={20} className="text-[var(--primary)]" />
                  <h2 className="font-display text-xl font-semibold">Past events</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Public event memories appear only after organizer-role approval from that community.
                </p>
                <div className="mt-4 space-y-4">
                  {pastEvents.map((event) => (
                    <a key={event.name} href={event.href} className="block overflow-hidden rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[var(--outline)] hover:shadow-[0_8px_24px_rgba(33,27,22,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]" aria-label={`View past event: ${event.name}, ${event.date}`}>
                      <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} aria-hidden="true" />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{event.name}</p>
                            <p className="text-xs text-[var(--muted)]">{event.community}</p>
                          </div>
                          <Badge tone="green">Organizer approved</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-5 text-[var(--foreground)]">{event.tradition}</p>
                        <p className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                          <CalendarDays size={13} /> <time dateTime={event.datetime}>{event.date}</time>
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                          <MapPin size={13} /> {event.timePlace}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-xl font-semibold">User reviews</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Early members describe what made joining and helping feel easier.
              </p>
              <div className="mt-4 space-y-3">
                {userReviews.map((review) => (
                  <figure key={review.name} className="shape-expressive border border-[var(--outline-variant)] bg-[var(--surface-container)] p-4">
                    <blockquote className="text-sm leading-6 text-[var(--foreground)]">“{review.text}”</blockquote>
                    <figcaption className="mt-3 text-xs font-medium text-[var(--muted)]">
                      {review.name} · {review.community}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
