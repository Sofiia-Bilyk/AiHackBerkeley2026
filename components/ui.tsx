import * as React from "react";
import Link from "next/link";
import { cn, initialsOf } from "@/lib/utils";

// ---- Button -----------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "spring-motion inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.96]";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-[var(--primary-ink)] shadow-sm hover:shadow-md hover:brightness-105",
  accent: "accent-gradient text-white shadow-sm hover:shadow-md hover:brightness-105",
  secondary: "bg-[var(--primary-container)] text-[var(--on-primary-container)] hover:bg-[var(--surface-container)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--primary-container)]/60",
  danger: "bg-[#9a2f2f] text-white hover:brightness-110",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "text-sm px-3 py-2",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-6 py-3.5",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />
  );
}

// ---- Card -------------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--outline-variant)] bg-[var(--surface)] shadow-[0_1px_3px_rgba(33,25,35,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

// ---- Badge ------------------------------------------------------------------

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-container)] text-[var(--muted)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

// ---- Avatar -----------------------------------------------------------------

export function Avatar({
  name,
  color,
  size = 36,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      title={name}
    >
      {initialsOf(name)}
    </span>
  );
}

// ---- Section heading --------------------------------------------------------

export function SectionTitle({
  children,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{children}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Progress ---------------------------------------------------------------

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]", className)}>
      <div className="h-full rounded-full accent-gradient transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

// ---- System (AI) notice -----------------------------------------------------

/** The invisible AI operational layer — styled as a quiet system notice, never a
 *  named character. */
export function SystemNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-dashed border-[var(--accent-from)]/30 bg-[var(--accent-soft)]/60 px-3.5 py-2.5 text-sm text-[var(--accent-ink)]",
        className,
      )}
    >
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full accent-gradient text-[9px] font-bold text-white">
        C
      </span>
      <div className="leading-snug">{children}</div>
    </div>
  );
}
