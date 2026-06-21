import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { midjourneyPastEventImages } from "@/lib/midjourney-images";
import { ArrowLeft, CalendarDays, MapPin, ShieldCheck } from "lucide-react";

const pastEvents = {
  "midsummer-picnic": {
    name: "Midsummer picnic",
    community: "Finnish community",
    tradition: "Juhannus songs and shared picnic table",
    date: "June 20, 2026",
    datetime: "2026-06-20",
    timePlace: "4:00 PM at Tilden Regional Park",
    image: "photo-midsummer",
    imageUrl: midjourneyPastEventImages.midsummer.url,
    imagePrompt: midjourneyPastEventImages.midsummer.prompt,
    summary:
      "A public memory from an organizer-approved gathering celebrating Juhannus through seasonal food, music, and time outdoors.",
  },
  "obon-evening": {
    name: "Obon evening",
    community: "Japanese community",
    tradition: "Lanterns, dance, and remembrance",
    date: "August 15, 2026",
    datetime: "2026-08-15",
    timePlace: "6:30 PM at Berkeley Buddhist Temple",
    image: "photo-obon",
    imageUrl: midjourneyPastEventImages.obon.url,
    imagePrompt: midjourneyPastEventImages.obon.prompt,
    summary:
      "A public memory from an organizer-approved gathering centered on remembrance, lanterns, and shared cultural context.",
  },
};

export default async function PublicPastEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = pastEvents[slug as keyof typeof pastEvents];
  if (!event) notFound();

  return (
    <main id="main-content" className="texture-weave min-h-screen px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Back to Connect
        </Link>

        <Card className="mt-6 overflow-hidden">
          <div className="h-72 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} aria-hidden="true" />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green"><ShieldCheck size={12} /> Organizer approved</Badge>
              <Badge tone="neutral">Public past event</Badge>
            </div>
            <p className="mt-5 text-sm font-medium text-[var(--muted)]">{event.community}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{event.name}</h1>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{event.summary}</p>

            <div className="mt-6 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
              <p className="inline-flex items-center gap-2"><CalendarDays size={16} /> <time dateTime={event.datetime}>{event.date}</time></p>
              <p className="inline-flex items-center gap-2"><MapPin size={16} /> {event.timePlace}</p>
            </div>

            <div className="mt-6 rounded-2xl bg-[var(--surface-2)] p-4">
              <h2 className="font-display text-xl font-semibold">Tradition shown</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.tradition}</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
