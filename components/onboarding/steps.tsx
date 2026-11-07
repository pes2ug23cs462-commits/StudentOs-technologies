"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { AlertCircleIcon, CalendarIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlanIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { Card, Chip, ChipGroup, FieldError, Input, Label, Pill, fieldClass } from "@/components/ui/primitives";
import {
  GOAL_TYPES,
  HOURS_OPTIONS,
  REST_OPTIONS,
  SESSION_OPTIONS,
  TIME_OPTIONS,
  WEEKDAYS,
  commitmentLabel,
  commitmentsShort,
  hoursLabel,
  restLabel,
  timesLabel,
} from "@/lib/labels";
import type { AcademicYear, Commitment, OnboardingAnswers, StudyTime } from "@/lib/types";
import { TODAY, cn, daysBetween, fmt, uid } from "@/lib/utils";

type StepProps = {
  answers: OnboardingAnswers;
  set: (patch: Partial<OnboardingAnswers>) => void;
  onNext: () => void;
  onBack?: () => void;
};

export function FormCard({ title, step, children, footer, tone = "default" }: { title: ReactNode; step?: string; children: ReactNode; footer?: ReactNode; tone?: "default" | "error" | "ready" }) {
  return (
    <Card
      glow
      className={cn(
        "mt-4 p-5",
        tone === "error" && "border-rose-500/45 bg-rose-500/[0.03]",
      )}
    >
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-[14.5px] font-semibold text-white">{title}</h3>
        {step && <p className="mt-1 text-[11.5px] text-white/45">{step}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5 flex items-center justify-end gap-2">{footer}</div>}
    </Card>
  );
}

const BackBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button variant="ghost" size="sm" onClick={onClick} icon={<ChevronLeftIcon size={14} />}>
    Back
  </Button>
);
const ContinueBtn = ({ onClick, children = "Continue" }: { onClick: () => void; children?: ReactNode }) => (
  <Button variant="primary" size="sm" onClick={onClick} icon={<ChevronRightIcon size={14} />}>
    {children}
  </Button>
);

/* ---------- Step 1 · About you ---------- */
const YEARS: AcademicYear[] = ["1st year", "2nd year", "3rd year", "4th year", "Other"];

export function AboutYouStep({ answers, set, onNext }: StepProps) {
  return (
    <FormCard
      title="About you"
      step="Step 1 of 5 · You can edit this later."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onNext}>
            Skip for now
          </Button>
          <ContinueBtn onClick={onNext}>Save and continue</ContinueBtn>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ob-name">Your name</Label>
          <Input id="ob-name" value={answers.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="ob-college">College or institution</Label>
          <Input id="ob-college" value={answers.college} onChange={(e) => set({ college: e.target.value })} placeholder="e.g. Northfield Institute of Technology" />
        </div>
      </div>
      <div>
        <Label>Academic year</Label>
        <ChipGroup options={YEARS.map((y) => ({ value: y, label: y }))} value={answers.year} onChange={(year) => set({ year })} />
      </div>
      <div>
        <Label htmlFor="ob-degree">Degree or course</Label>
        <Input id="ob-degree" value={answers.degree} onChange={(e) => set({ degree: e.target.value })} placeholder="e.g. B.Tech, Computer Science" />
      </div>
    </FormCard>
  );
}

/* ---------- Step 2 · Learning goal ---------- */
export function GoalStep({ answers, set, onNext, onBack }: StepProps) {
  return (
    <FormCard title="Your learning goal" step="Step 2 of 5" footer={<><BackBtn onClick={onBack} /><ContinueBtn onClick={onNext} /></>}>
      <div>
        <Label>Type of goal</Label>
        <ChipGroup options={GOAL_TYPES} value={answers.goalType} onChange={(goalType) => set({ goalType })} />
      </div>
      <div>
        <Label htmlFor="ob-goal">Describe your goal</Label>
        <Input id="ob-goal" value={answers.goal} onChange={(e) => set({ goal: e.target.value })} placeholder="e.g. Finish CS50’s Introduction to Programming with Python" />
        <p className="mt-1.5 text-[11px] text-white/45">Specific goals make better plans — mention the course or exam if you can.</p>
      </div>
    </FormCard>
  );
}

/* ---------- Step 3 · Course and target date ---------- */
const PROGRESS = ["Not started yet", ...Array.from({ length: 9 }, (_, i) => `Finished week ${i + 1} of 10`)];

export function targetHint(target: string) {
  if (!target) return null;
  const weeks = Math.round(daysBetween(TODAY, target) / 7);
  if (weeks < 1) return { tone: "bad" as const, text: "That date has passed or is this week — pick a later one." };
  if (weeks < 9) return { tone: "warn" as const, text: `About ${weeks} weeks away — tight for 9 weeks of material.` };
  return { tone: "ok" as const, text: `About ${weeks} weeks away — comfortable for 9 weeks of material.` };
}

export function CourseStep({ answers, set, onNext, onBack }: StepProps) {
  const hint = targetHint(answers.target);
  const isCs50 = /cs50/i.test(answers.course + answers.goal);
  return (
    <FormCard title="Course and target date" step="Step 3 of 5" footer={<><BackBtn onClick={onBack} /><ContinueBtn onClick={onNext} /></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ob-course">Course or subject</Label>
          <Input id="ob-course" value={answers.course} onChange={(e) => set({ course: e.target.value })} placeholder="e.g. CS50P — Harvard, on edX" />
        </div>
        <div>
          <Label htmlFor="ob-progress">Where you are now</Label>
          <div className="relative">
            <select
              id="ob-progress"
              value={answers.progress}
              onChange={(e) => set({ progress: e.target.value })}
              className={cn(fieldClass(), "appearance-none pr-9")}
            >
              {PROGRESS.map((p) => (
                <option key={p} value={p} className="bg-raised">
                  {p}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/60" />
          </div>
        </div>
        <div>
          <Label htmlFor="ob-target">Target completion date</Label>
          <DatePicker id="ob-target" value={answers.target} onChange={(target) => set({ target })} min={TODAY} />
          {hint && <p className={cn("mt-1.5 text-[11px]", hint.tone === "ok" ? "text-white/45" : hint.tone === "warn" ? "text-amber-300" : "text-rose-400")}>{hint.text}</p>}
        </div>
        <div className="rounded-lg border border-violet-400/20 bg-violet-600/20 px-3.5 py-3">
          <p className="text-[11px] text-white/50">Course effort {isCs50 ? "(from edX)" : "(estimate)"}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-white">{isCs50 ? "≈ 6–8 hours a week" : "≈ 4–6 hours a week"}</p>
          <p className="mt-0.5 text-[11px] text-white/50">You can override this if you work faster or slower.</p>
        </div>
      </div>
    </FormCard>
  );
}

/* ---------- Step 4 · Your week ---------- */
function AddCommitment({ onAdd, onCancel }: { onAdd: (c: Commitment) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [error, setError] = useState("");
  const add = () => {
    if (!name.trim()) return setError("Give it a name, like “Part-time job”.");
    if (!days.length) return setError("Pick at least one day.");
    if (end <= start) return setError("End time must be after the start time.");
    onAdd({ id: uid("c"), name: name.trim(), days, start, end });
  };
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
      <Input value={name} onChange={(e) => (setName(e.target.value), setError(""))} placeholder="What is it? e.g. Part-time job" aria-label="Commitment name" />
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <Chip key={d} selected={days.includes(i)} onClick={() => (setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i])), setError(""))} className="h-8 px-2.5">
            {d}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/60">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start time" className={cn(fieldClass(), "h-9 w-[130px]")} />
        to
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End time" className={cn(fieldClass(), "h-9 w-[130px]")} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={add}>Add</Button>
        </div>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function CommitmentList({ list, onChange }: { list: Commitment[]; onChange: (l: Commitment[]) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-2">
      {list.map((c) => (
        <div key={c.id} className="flex h-10 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[12.5px]">
          <CalendarIcon size={14} className="text-white/60" />
          <span className="font-semibold text-white">{c.name}</span>
          <span className="truncate text-white/50">{commitmentLabel(c)}</span>
          <button type="button" aria-label={`Remove ${c.name}`} onClick={() => onChange(list.filter((x) => x.id !== c.id))} className="ml-auto rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
            <XIcon size={13} />
          </button>
        </div>
      ))}
      {adding ? (
        <AddCommitment onAdd={(c) => (onChange([...list, c]), setAdding(false))} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium text-white hover:text-cyan-300">
          <PlusIcon size={14} /> Add commitment
        </button>
      )}
    </div>
  );
}

export function WeekStep({ answers, set, onNext, onBack }: StepProps) {
  const toggleTime = (t: StudyTime) => set({ times: answers.times.includes(t) ? answers.times.filter((x) => x !== t) : [...answers.times, t] });
  return (
    <FormCard title="Your week" step="Step 4 of 5" footer={<><BackBtn onClick={onBack} /><ContinueBtn onClick={onNext} /></>}>
      <div>
        <Label>Hours you can study each week</Label>
        <ChipGroup options={HOURS_OPTIONS} value={answers.hours} onChange={(hours) => set({ hours })} />
      </div>
      <div>
        <Label>Fixed commitments</Label>
        <CommitmentList list={answers.commitments} onChange={(commitments) => set({ commitments })} />
      </div>
      <div>
        <Label>Preferred study times</Label>
        <ChipGroup options={TIME_OPTIONS} value={answers.times} onChange={toggleTime} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Session length</Label>
          <ChipGroup options={SESSION_OPTIONS} value={answers.sessionLength} onChange={(sessionLength) => set({ sessionLength })} />
        </div>
        <div>
          <Label>Rest day</Label>
          <ChipGroup options={REST_OPTIONS.filter((r) => r.value !== "saturday")} value={answers.restDay} onChange={(restDay) => set({ restDay })} />
        </div>
      </div>
    </FormCard>
  );
}

/* ---------- Step 5 · Summary / missing details ---------- */
export function missingFields(a: OnboardingAnswers) {
  const missing: ("target" | "hours")[] = [];
  if (!a.target) missing.push("target");
  if (!a.hours) missing.push("hours");
  return missing;
}

export function weekSummary(a: OnboardingAnswers) {
  const times = timesLabel(a.times).toLowerCase().replace(", ", " and ");
  return [hoursLabel(a.hours), times, `${a.sessionLength}-min sessions`, restLabel(a.restDay)].filter(Boolean).join(" · ");
}

export function profileSummary(a: OnboardingAnswers) {
  const degree = a.degree.replace(/,?\s*Computer Science/i, " CSE");
  const college = a.college.split(" ")[0];
  return [a.name, a.year, [degree, college].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
}

export function MissingCard({ answers, set, onBuild }: { answers: OnboardingAnswers; set: StepProps["set"]; onBuild: () => void }) {
  const [initial] = useState(() => missingFields(answers));
  const stillMissing = missingFields(answers);
  const remainingWeeks = 9;
  return (
    <FormCard
      tone="error"
      title={
        <>
          <AlertCircleIcon size={16} className="text-rose-400" />
          {initial.length} required detail{initial.length > 1 ? "s are" : " is"} missing
        </>
      }
      footer={
        <Button variant={stillMissing.length ? "secondary" : "primary"} size="sm" disabled={stillMissing.length > 0} onClick={onBuild} icon={stillMissing.length ? undefined : <PlanIcon size={14} />}>
          Build my plan
        </Button>
      }
    >
      {initial.includes("target") && (
        <div>
          <Label htmlFor="ob-missing-target">Target completion date</Label>
          <DatePicker id="ob-missing-target" value={answers.target} onChange={(target) => set({ target })} min={TODAY} invalid={!answers.target} />
          {!answers.target && <FieldError>Add a target date so I know how to pace the {remainingWeeks} remaining weeks.</FieldError>}
        </div>
      )}
      {initial.includes("hours") && (
        <div>
          <Label hint="Required">Hours you can study each week</Label>
          <ChipGroup options={HOURS_OPTIONS} value={answers.hours} onChange={(hours) => set({ hours })} />
          {!answers.hours && <FieldError>Choose a range so I don’t overbook your week.</FieldError>}
        </div>
      )}
    </FormCard>
  );
}

export function SummaryCard({ answers, onEdit, onBuild }: { answers: OnboardingAnswers; onEdit: (step: 1 | 2 | 3 | 4) => void; onBuild: () => void }) {
  const weeksAway = answers.target ? Math.round(daysBetween(TODAY, answers.target) / 7) : 0;
  const rows: { label: string; value: string; step: 1 | 2 | 3 | 4 }[] = [
    { label: "You", value: profileSummary(answers) || "—", step: 1 },
    { label: "Goal", value: answers.goal || "—", step: 2 },
    { label: "Course", value: [answers.course.replace(" — Harvard, on edX", " on edX"), answers.progress.toLowerCase()].filter(Boolean).join(" · ") || "—", step: 3 },
    { label: "Target date", value: answers.target ? `${fmt.full(answers.target)} · about ${weeksAway} weeks away` : "—", step: 3 },
    { label: "Your week", value: weekSummary(answers), step: 4 },
    { label: "Commitments", value: commitmentsShort(answers.commitments) || "None", step: 4 },
  ];
  return (
    <Card glow className="mt-4 p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[14.5px] font-semibold text-white">
          <CheckCircleIcon size={17} className="text-emerald-400" /> Ready to build your plan
        </h3>
        <Pill tone="green" dot>All required details</Pill>
      </div>
      <dl className="divide-y divide-white/[0.07]">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 py-3 text-[12.5px]">
            <dt className="text-white/50">{r.label}</dt>
            <dd className="text-white/90">{r.value}</dd>
            <button type="button" onClick={() => onEdit(r.step)} className="text-[11.5px] font-medium text-cyan-300 hover:underline">
              Edit
            </button>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" icon={<PencilIcon size={13} />} onClick={() => onEdit(1)}>
          Edit details
        </Button>
        <Button size="sm" variant="primary" icon={<PlanIcon size={14} />} onClick={onBuild}>
          Build my plan
        </Button>
      </div>
    </Card>
  );
}
