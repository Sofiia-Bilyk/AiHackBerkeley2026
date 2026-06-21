"use client";

import { useState } from "react";
import { createAccountAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";

export function OnboardingFlow({ nationalities, initialNationality }: { nationalities: { nationality: string; flagEmoji: string }[]; initialNationality?: string }) {
  const [nationality, setNationality] = useState(initialNationality ?? nationalities[0]?.nationality ?? "Ukrainian");
  return (
    <form action={createAccountAction} className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input name="name" required className={inputCls} placeholder="Your name" /></Field>
          <Field label="Email"><input name="email" type="email" required className={inputCls} placeholder="you@email.com" /></Field>
          <Field label="City"><input name="city" required className={inputCls} placeholder="e.g. Berkeley, CA" /></Field>
          <Field label="Primary nationality">
            <select name="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls}>
              {nationalities.map((n) => <option key={n.nationality} value={n.nationality}>{n.flagEmoji} {n.nationality}</option>)}
            </select>
          </Field>
          <Field label="Secondary cultural interest (optional)"><input name="secondary" className={inputCls} placeholder="e.g. Polish, Brazilian…" /></Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <SubmitButton variant="accent" pendingText="Creating your club…">Join {nationality} club</SubmitButton>
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-from)]";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>{children}</label>;
}
