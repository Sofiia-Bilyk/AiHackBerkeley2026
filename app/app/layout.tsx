import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";
import { db } from "@/lib/store";
import { communityById } from "@/lib/communities";
import { accentStyle } from "@/lib/theme";
import { MobileNavLinks, NavLinks } from "@/components/NavLinks";
import { Avatar } from "@/components/ui";
import { logout } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentProfile();
  if (!me) redirect("/");

  const communityId = db.membershipsFor(me.id)[0]?.communityId;
  const community = communityId ? communityById(communityId) : undefined;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-6xl gap-6 px-4 py-5"
      style={community ? accentStyle(community) : undefined}
    >
      {/* sidebar */}
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col justify-between md:flex">
        <div>
          <Link href="/app" className="mb-6 flex items-center gap-2 px-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg accent-gradient text-base font-bold text-white">
              C
            </span>
            <span className="font-display text-lg font-semibold">Connect</span>
          </Link>

          {community && (
            <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-ink)]">
                <span className="text-lg leading-none">{community.flagEmoji}</span>
                {community.demonym} club
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{community.region.label}</p>
            </div>
          )}

          <NavLinks />
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={me.name} color={me.avatarColor} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{me.name}</div>
              <div className="truncate text-xs text-[var(--muted)]">{me.city}</div>
            </div>
          </div>
          <form action={logout}>
            <button className="mt-2.5 w-full rounded-lg px-2 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]">
              Switch persona / sign out
            </button>
          </form>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/app" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-sm font-bold text-white">C</span>
          <span className="font-display font-semibold">Connect</span>
        </Link>
        <Avatar name={me.name} color={me.avatarColor} size={30} />
      </div>

      {/* main */}
      <main id="main-content" className="min-w-0 flex-1 pb-28 pt-12 md:pb-10 md:pt-0">{children}</main>
      <MobileNavLinks />
    </div>
  );
}
