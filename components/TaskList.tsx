"use client";

import { useRef, useState, useTransition } from "react";
import {
  Camera,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Loader2,
  Hand,
  Lock,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { submitEvidenceAction, volunteerAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { TaskStatus, Verdict } from "@/lib/types";

export interface TaskView {
  id: string;
  title: string;
  detail: string;
  evidenceHint: string;
  status: TaskStatus;
  critical: boolean;
  dueInDays: number;
  assignee?: { id: string; name: string; color: string };
  latestVerdict?: { verdict: Verdict; confidence: number; reasoning: string };
}

interface VerifyResult {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  source: "claude" | "fallback";
}

const statusMeta: Record<TaskStatus, { label: string; tone: "neutral" | "amber" | "green" | "red" | "blue" }> = {
  open: { label: "Needs a volunteer", tone: "amber" },
  claimed: { label: "Claimed", tone: "blue" },
  assigned: { label: "Auto-assigned", tone: "blue" },
  submitted: { label: "Verifying…", tone: "neutral" },
  verified: { label: "Verified complete", tone: "green" },
  failed: { label: "Incomplete", tone: "red" },
};

export function TaskList({ tasks, meId, restricted }: { tasks: TaskView[]; meId: string; restricted: boolean }) {
  return (
    <div className="divide-y divide-[var(--line)]">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} meId={meId} restricted={restricted} />
      ))}
    </div>
  );
}

function TaskRow({ task, meId, restricted }: { task: TaskView; meId: string; restricted: boolean }) {
  const [pending, start] = useTransition();
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = task.assignee?.id === meId;
  const meta = statusMeta[task.status];
  const canVolunteer = task.status === "open" && !restricted;
  const canSubmit = mine && (task.status === "claimed" || task.status === "assigned" || task.status === "submitted" || task.status === "failed");

  function volunteer() {
    start(() => volunteerAction(task.id));
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifying(true);
    setResult(null);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    try {
      const r = (await submitEvidenceAction(task.id, dataUrl)) as VerifyResult;
      setResult(r);
    } finally {
      setVerifying(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <StatusIcon status={task.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{task.title}</span>
            {task.critical && <Badge tone="red">critical</Badge>}
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{task.detail}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            {task.assignee ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={task.assignee.name} color={task.assignee.color} size={18} />
                {task.assignee.name.split(" ")[0]}
                {mine && " (you)"}
              </span>
            ) : (
              <span>Unclaimed</span>
            )}
            <span>· due in {task.dueInDays < 0 ? `${Math.abs(task.dueInDays)}d overdue` : `${task.dueInDays}d`}</span>
          </div>

          {/* existing verified evidence */}
          {task.latestVerdict && !result && (
            <VerdictNote
              verdict={task.latestVerdict.verdict}
              confidence={task.latestVerdict.confidence}
              reasoning={task.latestVerdict.reasoning}
            />
          )}
          {/* fresh verification result */}
          {result && (
            <VerdictNote verdict={result.verdict} confidence={result.confidence} reasoning={result.reasoning} source={result.source} />
          )}

          {/* actions */}
          <div className="mt-2.5 flex items-center gap-2">
            {canVolunteer && (
              <button
                onClick={volunteer}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-from)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-ink)] transition-all hover:brightness-105 active:scale-95"
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
                Volunteer for this
              </button>
            )}
            {restricted && task.status === "open" && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <Lock size={12} /> Restricted from volunteering
              </span>
            )}
            {canSubmit && (
              <>
                <button
                  onClick={pickFile}
                  disabled={verifying}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-ink)] transition-all hover:brightness-110 active:scale-95"
                >
                  {verifying ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  {verifying ? "Verifying photo…" : task.status === "failed" ? "Upload a clearer photo" : "Upload proof"}
                </button>
                <span className="text-xs text-[var(--muted)]">{task.evidenceHint}</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "verified") return <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />;
  if (status === "failed") return <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />;
  if (status === "open")
    return <span className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-amber-400" />;
  return <span className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full border-2 border-[var(--accent-from)]" />;
}

function VerdictNote({
  verdict,
  confidence,
  reasoning,
  source,
}: {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  source?: "claude" | "fallback";
}) {
  const map = {
    completed: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-800", label: "Task likely completed" },
    uncertain: { icon: HelpCircle, cls: "border-amber-200 bg-amber-50 text-amber-800", label: "Photo unclear" },
    incomplete: { icon: XCircle, cls: "border-red-200 bg-red-50 text-red-800", label: "Task may not be done" },
  }[verdict];
  const Icon = map.icon;
  return (
    <div className={cn("mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs", map.cls)}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div>
        <span className="font-semibold">{map.label}</span> · {Math.round(confidence * 100)}% confidence
        {source === "fallback" && <span className="opacity-70"> · offline</span>}
        <p className="mt-0.5 opacity-90">{reasoning}</p>
      </div>
    </div>
  );
}
