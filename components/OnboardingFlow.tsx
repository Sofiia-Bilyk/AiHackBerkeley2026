"use client";

import { useState } from "react";
import { createAccountAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, Card } from "@/components/ui";

export function OnboardingFlow({ nationalities, initialNationality, creating = false }: { nationalities: { nationality: string; flagEmoji: string }[]; initialNationality?: string; creating?: boolean }) {
  const [nationality, setNationality] = useState(initialNationality ?? nationalities[0]?.nationality ?? "Ukrainian");
  return (
    <form action={createAccountAction} className="space-y-5">
      <input type="hidden" name="creating" value={creating ? "true" : "false"} />
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone={creating ? "amber" : "accent"}>{creating ? "Create with AI" : "Join community"}</Badge>
            <h2 className="mt-2 font-display text-2xl font-semibold">{creating ? "Community basics" : "Member basics"}</h2>
          </div>
          <span className="text-xs font-medium text-[var(--muted)]">Step 1 of 3</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input name="name" required className={inputCls} placeholder="Your name" /></Field>
          <Field label="Phone"><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={inputCls} placeholder="(555) 123-4567" /></Field>
          <Field label="City"><input name="city" required className={inputCls} placeholder="e.g. Berkeley, CA" /></Field>
          <Field label="Primary nationality">
            <select name="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls}>
              {nationalities.map((n) => <option key={n.nationality} value={n.nationality}>{n.flagEmoji} {n.nationality}</option>)}
            </select>
          </Field>
          <Field label="Secondary cultural interest (optional)"><input name="secondary" className={inputCls} placeholder="e.g. Polish, Brazilian…" /></Field>
        </div>
      </Card>
      {creating && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReviewStep title="Sources" text="Find official cultural references." />
            <ReviewStep title="Privacy" text="Keep the draft hidden by default." />
            <ReviewStep title="Approval" text="Require organizer review before launch." />
          </div>
        </Card>
      )}
      <div className="flex justify-end">
        <SubmitButton variant="accent" pendingText={creating ? "Preparing private draft..." : "Creating your club..."}>{creating ? `Create ${nationality} draft` : `Join ${nationality} club`}</SubmitButton>
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-from)]";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>{children}</label>;
}

function ReviewStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p>
    </div>
  );
}
