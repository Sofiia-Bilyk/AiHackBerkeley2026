"use client";

import { useTransition } from "react";
import { CheckCircle2, Hand, Loader2, Lock } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { completeTaskAction, volunteerAction } from "@/app/actions";
import type { TaskStatus } from "@/lib/types";

export interface TaskView {
  id: string; title: string; detail: string; status: TaskStatus; critical: boolean; dueInDays: number;
  assignee?: { id: string; name: string; color: string };
}

const statusMeta: Record<TaskStatus, { label: string; tone: "amber" | "green" | "blue" }> = {
  open: { label: "Needs a volunteer", tone: "amber" }, claimed: { label: "Claimed", tone: "blue" },
  assigned: { label: "Auto-assigned", tone: "blue" }, completed: { label: "Complete", tone: "green" },
};

export function TaskList({ tasks, meId, restricted }: { tasks: TaskView[]; meId: string; restricted: boolean }) {
  return <div className="divide-y divide-[var(--line)]">{tasks.map((task) => <TaskRow key={task.id} task={task} meId={meId} restricted={restricted} />)}</div>;
}

function TaskRow({ task, meId, restricted }: { task: TaskView; meId: string; restricted: boolean }) {
  const [pending, start] = useTransition();
  const mine = task.assignee?.id === meId;
  const meta = statusMeta[task.status];
  return (
    <div className="px-4 py-3.5"><div className="flex items-start gap-3">
      {task.status === "completed" ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" /> : <span className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-[var(--accent-from)]" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{task.title}</span>{task.critical && <Badge tone="red">critical</Badge>}<Badge tone={meta.tone}>{meta.label}</Badge></div>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{task.detail}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-[var(--muted)]">
          {task.assignee ? <span className="inline-flex items-center gap-1.5"><Avatar name={task.assignee.name} color={task.assignee.color} size={18} />{task.assignee.name.split(" ")[0]}{mine && " (you)"}</span> : <span>Unclaimed</span>}
          <span>· due in {task.dueInDays < 0 ? `${Math.abs(task.dueInDays)}d overdue` : `${task.dueInDays}d`}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          {task.status === "open" && !restricted && <button onClick={() => start(() => volunteerAction(task.id))} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-from)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-ink)]">{pending ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}Volunteer for this</button>}
          {restricted && task.status === "open" && <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]"><Lock size={12} /> Restricted from volunteering</span>}
          {mine && (task.status === "claimed" || task.status === "assigned") && <button onClick={() => start(() => completeTaskAction(task.id))} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-ink)]">{pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Mark complete</button>}
        </div>
      </div>
    </div></div>
  );
}
