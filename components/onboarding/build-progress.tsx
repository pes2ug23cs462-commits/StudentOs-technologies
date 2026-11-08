"use client";

import { planShape } from "@/lib/planner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, CheckIcon, ClockIcon, RefreshIcon, SlidersIcon, SpinnerIcon } from "@/components/ui/icons";
import { Card, Notice, ProgressBar } from "@/components/ui/primitives";
import { commitmentsShort, hoursLabel, timesLabel } from "@/lib/labels";
import type { OnboardingAnswers } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

/* “Preparing your personalised plan…” card with steps that tick off over ~4 s. */
export function BuildProgress({ answers }: { answers: OnboardingAnswers }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, 3)), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = [
    { title: "Reading your week", sub: `${answers.commitments.map((c) => c.name).join(", ") || "Your commitments"}, rest day and ${hoursLabel(answers.hours) || "free"} free hours`.replace(", rest", ", rest") },
    { title: `Writing ${planShape(answers).weeks} weeks of topics with AI`, sub: `Around ${planShape(answers).perWeek} sessions a week` },
    { title: "Adding buffer time", sub: "So a missed session doesn’t push your date" },
    { title: "Setting milestones", sub: "Checkpoints you can track" },
  ];
  return (
    <Card glow className="mt-4 p-5">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
        <SpinnerIcon size={15} className="animate-spin text-accent" /> Preparing your personalised plan…
      </p>
      <ul className="mt-3 divide-y divide-white/[0.07] border-t border-white/[0.07]">
        {steps.map((s, i) => {
          const state = i < phase ? "done" : i === phase ? "active" : "todo";
          return (
            <li key={s.title} className="flex gap-3 py-3">
              <span className="mt-0.5">
                {state === "done" ? (
                  <CheckCircleIcon size={15} className="text-emerald-400" />
                ) : state === "active" ? (
                  <SpinnerIcon size={15} className="animate-spin text-accent" />
                ) : (
                  <ClockIcon size={15} className="text-white/40" />
                )}
              </span>
              <span>
                <span className={cn("block text-[12.5px] font-medium", state === "todo" ? "text-white/55" : "text-white")}>{s.title}</span>
                <span className="block text-[11px] text-white/45">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <ProgressBar value={18 + phase * 22} className="mt-2 h-1.5" />
      <p className="mt-2 text-[11px] text-white/45">Usually takes a few seconds. Nothing is saved until you accept.</p>
    </Card>
  );
}

export function BuildFailed({ answers, onRetry, onEdit }: { answers: OnboardingAnswers; onRetry: () => void; onEdit: () => void }) {
  const saved = [
    `${answers.course.split(" — ")[0] || "Your course"} on edX · finish by ${answers.target ? fmt.full(answers.target) : "—"}`,
    `${hoursLabel(answers.hours)} a week · ${timesLabel(answers.times).toLowerCase().replace(", ", " and ")} · ${answers.sessionLength}-min sessions`,
    commitmentsShort(answers.commitments) || "No fixed commitments",
  ];
  return (
    <Card className="mt-4 border-rose-500/50 p-4">
      <Notice tone="error" title="The planner timed out">
        It took too long to fit your sessions. Retrying usually works. If it keeps happening, try fewer preferred time windows.
      </Notice>
      <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3.5">
        <p className="mb-2 text-[11px] text-white/45">Saved and ready to reuse</p>
        <ul className="space-y-1.5">
          {saved.map((s) => (
            <li key={s} className="flex items-center gap-2 text-[12px] text-white/80">
              <CheckIcon size={13} className="text-emerald-400" /> {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" icon={<SlidersIcon size={13} />} onClick={onEdit}>
          Edit preferences
        </Button>
        <Button size="sm" variant="primary" icon={<RefreshIcon size={13} />} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Card>
  );
}
