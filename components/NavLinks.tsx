"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Home,
  MessagesSquare,
  Sparkles,
  Users,
  BookOpen,
} from "lucide-react";

const links = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/members", label: "Members", icon: Users },
  { href: "/app/learn", label: "Culture", icon: BookOpen },
  { href: "/app/insights", label: "Insights", icon: Sparkles },
  { href: "/app/messages", label: "Messages", icon: MessagesSquare },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary navigation">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();
  const mobileLinks = links.filter((link) => link.label !== "Insights");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[var(--outline-variant)] bg-[var(--surface)]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(33,27,22,0.08)] backdrop-blur md:hidden" aria-label="Primary navigation">
      {mobileLinks.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-container)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
