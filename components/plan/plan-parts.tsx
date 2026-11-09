"use client";

import type { ReactNode } from "react";
import { BookIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, FlagIcon, TargetIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/primitives";
import { shortGoal } from "@/lib/labels";
import type { Goal, Milestone, StudySession } from "@/lib/types";
import { addDays, cn, fmt } from "@/lib/utils";

export function StatTile({ icon, label, value, accent, className }: { icon?: ReactNode; label: string; value: ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-3 backdrop-blur", className)}>
      <p className="flex items-center gap-1.5 text-[10.5px] text-white/50">
        {icon}
        {label}
      </p>
      <p className={cn("mt-1.5 text-[12.5px] leading-snug font-semibold", accent ? "text-emerald-300" : "text-white")}>{value}</p>
    </div>
  );
}

/* Goal · Course · Target date · Plan finishes · Pace */
export function PlanStats({ goal }: { goal: Goal }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      <StatTile icon={<TargetIcon size={11} />} label="Goal" value={shortGoal(goal.title)} />
      <StatTile icon={<BookIcon size={11} />} label="Course" value={`${goal.course} · ${goal.platform}`} />
      <StatTile icon={<FlagIcon size={11} />} label="Target date" value={fmt.medium(goal.target)} />
      <StatTile icon={<CheckCircleIcon size={11} className="text-emerald-400" />} label="Plan finishes" value={fmt.medium(goal.planEnds ?? goal.target)} />
      <StatTile icon={<ClockIcon size={11} />} label="Pace" value={`${goal.sessionsPerWeek ?? 4} sessions · ${goal.hoursPerWeek ?? "~4½ h"} / week`} />
    </div>
  );
}

export function WeekNav({ planStart, week, total, onChange, rightSlot }: { planStart: string; week: number; total: number; onChange: (w: number) => void; rightSlot?: ReactNode }) {
  const start = addDays(planStart, (week - 1) * 7);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1.5">
        <button type="button" aria-label="Previous week" disabled={week <= 1} onClick={() => onChange(week - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 disabled:opacity-40">
          <ChevronLeftIcon size={14} />
        </button>
        <button type="button" aria-label="Next week" disabled={week >= total} onClick={() => onChange(week + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 disabled:opacity-40">
          <ChevronRightIcon size={14} />
        </button>
      </div>
      <p className="text-[14px] font-semibold text-white">
        Week {week} of {total} · {fmt.weekRange(start, false)}
      </p>
      <div className="ml-auto">{rightSlot}</div>
    </div>
  );
}

export function priorityTone(p: StudySession["priority"]) {
  return p === "High" ? "amber" : p === "Buffer" ? "gray" : "gray";
}

/* Rows under the calendar: “Mon 26 Oct · 7:00 PM — Lecture 1 · Functions, variables — 60 min — Core” */
export function SessionRows({ sessions, onSelect, selectedId }: { sessions: StudySession[]; onSelect?: (s: StudySession) => void; selectedId?: string | null }) {
  const rows = sessions.filter((s) => s.status !== "buffer");
  if (!rows.length) return <p className="px-4 py-6 text-center text-[12.5px] text-white/45">No sessions this week.</p>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {rows.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect?.(s)}
            className={cn("grid w-full grid-cols-[150px_1fr_auto_auto] items-center gap-4 px-4 py-3 text-left transition hover:bg-white/[0.03]", selectedId === s.id && "bg-white/[0.04]")}
          >
            <span className="text-[12px] text-white/55">
              {fmt.short(s.date).replace(/^(\w+) /, "$1 ")} · {fmt.time(s.start)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">{s.status === "suggested" ? `${s.title} (suggested)` : s.title}</span>
              <span className="block truncate text-[11px] text-white/45">{s.summary}</span>
            </span>
            <span className="text-[12px] text-white/60">{s.minutes} min</span>
            <Pill tone={s.priority === "High" ? "amber" : "gray"}>{s.priority}</Pill>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MilestoneList({ milestones, currentWeek = 1 }: { milestones: Milestone[]; currentWeek?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {milestones.map((m, i) => (
        <div key={m.id} className={cn("rounded-xl border p-4", i === 0 ? "border-accent/40 bg-accent/[0.05]" : "border-white/[0.08] bg-white/[0.03]")}>
          <p className={cn("text-[11px] font-medium", i === 0 ? "text-accent" : "text-white/50")}>{m.label}</p>
          <p className="mt-1 text-[14px] font-semibold text-white">{m.title}</p>
          <p className="mt-1 text-[11.5px] text-white/50">By {fmt.dayMonth(m.due)}</p>
          {i === 0 && <p className="mt-2 text-[11px] text-white/45">You’re in week {currentWeek}.</p>}
        </div>
      ))}
    </div>
  );
}
