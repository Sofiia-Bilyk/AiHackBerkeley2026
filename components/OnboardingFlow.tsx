"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, HelpCircle, Loader2, Upload } from "lucide-react";
import { createAccountAction, extractIdAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";

interface Extraction {
  name?: string;
  nationality?: string;
  documentType?: string;
  confidence: number;
  note: string;
  source: "claude" | "fallback";
}

export function OnboardingFlow({ nationalities }: { nationalities: { nationality: string; flagEmoji: string }[] }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [nationality, setNationality] = useState(nationalities[0]?.nationality ?? "Ukrainian");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const verified = !!extraction && extraction.confidence >= 0.6 && !!extraction.nationality;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifying(true);
    setExtraction(null);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    start(async () => {
      const r = (await extractIdAction(dataUrl, nationality)) as Extraction;
      setExtraction(r);
      if (r.nationality && nationalities.some((n) => n.nationality === r.nationality)) {
        setNationality(r.nationality);
      }
      if (r.name && !name) setName(r.name);
      setVerifying(false);
    });
  }

  return (
    <form action={createAccountAction} className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Your name" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className={inputCls} placeholder="you@email.com" />
          </Field>
          <Field label="City">
            <input name="city" value={city} onChange={(e) => setCity(e.target.value)} required className={inputCls} placeholder="e.g. Berkeley, CA" />
          </Field>
          <Field label="Primary nationality">
            <select name="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls}>
              {nationalities.map((n) => (
                <option key={n.nationality} value={n.nationality}>
                  {n.flagEmoji} {n.nationality}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Secondary cultural interest (optional)">
            <input name="secondary" className={inputCls} placeholder="e.g. Polish, Brazilian…" />
          </Field>
        </div>
      </Card>

      {/* ID verification */}
      <Card className="p-5">
        <h3 className="font-display text-lg font-semibold">Verify your nationality</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload a government-issued ID. Claude reads the nationality directly from the document —
          MVP-grade AI extraction, not a stored identity check.
        </p>

        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={verifying}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
        >
          {verifying ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {verifying ? "Reading document…" : "Upload ID document"}
        </button>

        {extraction && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
              verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {verified ? <CheckCircle2 size={16} className="mt-0.5" /> : <HelpCircle size={16} className="mt-0.5" />}
            <div>
              <div className="font-semibold">
                {verified ? `Verified ${extraction.nationality}` : "Couldn't verify automatically"}
                {" · "}
                {Math.round(extraction.confidence * 100)}% confidence
                {extraction.source === "fallback" && <span className="opacity-70"> · offline</span>}
              </div>
              <p className="mt-0.5 opacity-90">{extraction.note}</p>
            </div>
          </div>
        )}
      </Card>

      <input type="hidden" name="verified" value={String(verified)} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">You can verify later, but verified members unlock full participation.</p>
        <SubmitButton variant="accent" pendingText="Creating your club…">
          Join {nationality} club
        </SubmitButton>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-from)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
