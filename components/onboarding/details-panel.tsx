"use client";

import type { ReactNode } from "react";
import { AlertCircleIcon, CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import { hoursLabel, restLabel, shortGoal, timesLabel } from "@/lib/labels";
import type { OnboardingAnswers } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

type Status = "pending" | "done" | "missing";

function DetailCard({ title, status, onEdit, rows }: { title: string; status: Status; onEdit?: () => void; rows: [string, ReactNode, boolean?][] }) {
  return (
    <div className={cn("rounded-xl border p-3.5", status === "missing" ? "border-rose-500/50 bg-rose-500/[0.05]" : "border-white/[0.08] bg-white/[0.025]")}>
      <div className="mb-2 flex items-center gap-2">
        {status === "done" ? (
          <CheckCircleIcon size={14} className="text-emerald-400" />
        ) : status === "missing" ? (
          <AlertCircleIcon size={14} className="text-rose-400" />
        ) : (
          <ClockIcon size={14} className="text-white/60" />
        )}
        <span className="text-[12.5px] font-semibold text-white">{title}</span>
        {status !== "pending" && onEdit && (
          <button type="button" onClick={onEdit} className="ml-auto text-[11px] font-medium text-cyan-300 hover:underline">
            {status === "missing" ? "Fix" : "Edit"}
          </button>
        )}
      </div>
      <dl className="space-y-1.5">
        {rows.map(([k, v, bad]) => (
          <div key={k} className="grid grid-cols-[76px_1fr] gap-2 text-[11px]">
            <dt className="text-white/45">{k}</dt>
            <dd className={bad ? "text-rose-400" : "text-white/80"}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* “Your details” column: everything the student has told the assistant so far. */
export function DetailsPanel({ answers, step, checked, onEdit }: { answers: OnboardingAnswers; step: number; checked: boolean; onEdit: (s: 1 | 2 | 3 | 4) => void }) {
  const a = answers;
  const dash = "—";
  const notYet = "Not yet";
  const profileDone = step > 1;
  const goalDone = step > 2;
  const courseVisited = step > 3;
  const weekVisited = step > 4;
  const targetMissing = checked && !a.target;
  const hoursMissing = checked && !a.hours;

  return (
    <aside className="hidden w-[290px] shrink-0 overflow-y-auto border-l border-white/[0.06] bg-black/30 px-4 py-5 xl:block">
      <h2 className="text-[14px] font-semibold text-white">Your details</h2>
      <p className="mt-1 mb-4 text-[11px] text-white/45">Everything you’ve told me so far. Edit anything — I’ll use the latest answers.</p>
      <div className="space-y-3">
        <DetailCard
          title="Profile"
          status={profileDone ? "done" : "pending"}
          onEdit={() => onEdit(1)}
          rows={[
            ["Name", a.name || dash],
            ["College", a.college || dash],
            ["Year", a.year || dash],
            ["Degree", a.degree || dash],
          ]}
        />
        <DetailCard title="Goal" status={goalDone ? "done" : "pending"} onEdit={() => onEdit(2)} rows={[["Goal", goalDone && a.goal ? shortGoal(a.goal) : notYet]]} />
        <DetailCard
          title="Course & date"
          status={targetMissing ? "missing" : courseVisited ? "done" : "pending"}
          onEdit={() => onEdit(3)}
          rows={
            courseVisited || step === 3
              ? [
                  ["Course", a.course ? a.course.replace(" — ", " · ").replace(", on edX", ", edX") : notYet],
                  ...(courseVisited ? [["Progress", a.progress.replace("Finished week", "Week")] as [string, ReactNode]] : []),
                  ["Target", a.target ? fmt.full(a.target) : targetMissing ? "Missing" : step === 3 ? "Choosing…" : notYet, targetMissing],
                ]
              : [
                  ["Course", notYet],
                  ["Target", notYet],
                ]
          }
        />
        <DetailCard
          title="Availability"
          status={hoursMissing ? "missing" : weekVisited ? "done" : "pending"}
          onEdit={() => onEdit(4)}
          rows={
            weekVisited || step === 4
              ? [
                  ["Hours", a.hours ? `${hoursLabel(a.hours)} a week` : hoursMissing ? "Missing" : "Choosing…", hoursMissing],
                  ["Times", timesLabel(a.times) || notYet],
                  ...(weekVisited && a.hours ? [["Sessions", `${a.sessionLength} min · ${restLabel(a.restDay)}`] as [string, ReactNode]] : []),
                ]
              : [
                  ["Hours", notYet],
                  ["Times", notYet],
                ]
          }
        />
      </div>
    </aside>
  );
}
