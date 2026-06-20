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
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
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
