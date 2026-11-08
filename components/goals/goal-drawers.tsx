"use client";

import { goalProgress } from "@/lib/goal-progress";
import { useRouter } from "next/navigation";
import { linkableCourses, matchCourse } from "@/lib/learn";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { ArrowRightIcon, CheckCircleIcon, CheckIcon, FlagIcon, InfoIcon, PlanIcon, PlayIcon, AlertCircleIcon } from "@/components/ui/icons";
import { Chip, ChipGroup, FieldError, Input, Label, Notice, OptionCard, Pill, ProgressBar } from "@/components/ui/primitives";
import { countable, sessionsInRange, weekStats } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Goal, GoalType } from "@/lib/types";
import { TODAY, addDays, daysBetween, fmt, uid, wait, weekStart } from "@/lib/utils";

/* ---------- Add goal ---------- */
const KINDS: { value: GoalType; title: string; lines: string[] }[] = [
  { value: "course", title: "Finish an online course", lines: ["Pick a course and a target date", "e.g. CS50, Coursera, NPTEL"] },
  { value: "exam", title: "Prepare for an exam", lines: ["Pick the subject and the exam date", "Revision is spread across the weeks before"] },
  { value: "project", title: "Personal project", lines: ["Set milestones and weekly hours", "Side projects, hackathons, portfolio work"] },
];

export function AddGoalDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const router = useRouter();
  const [kind, setKind] = useState<GoalType>("course");
  const [course, setCourse] = useState("");
  const [linked, setLinked] = useState<string>("auto");
  const [target, setTarget] = useState("");
  const [hours, setHours] = useState("3");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const errors = { course: !course.trim() ? "Name the course or subject." : "", target: !target ? "Pick a target date." : "" };
  const suggested = matchCourse(course, state.learning);
  const others = state.goals.map((g) => (g.type === "exam" ? "the DBMS exam" : `your ${g.course} plan`)).join(" and ");

  const save = async () => {
    setTouched(true);
    if (errors.course || errors.target) return;
    setBusy(true);
    await wait(900);
    const id = uid("g");
    actions.addGoal(
      {
        id,
        type: kind,
        title: kind === "exam" ? `Prepare for the ${course.trim()} exam` : kind === "project" ? course.trim() : `Finish ${course.trim()}`,
        shortTitle: course.trim(),
        course: course.trim(),
        platform: kind === "course" ? "Online course" : kind === "exam" ? "College course" : "Personal project",
        target,
        hasPlan: false,
        examDate: kind === "exam" ? target : undefined,
        revisionHours: kind === "exam" ? Number(hours) || 6 : undefined,
        hoursPerWeek: `${hours} h`,
        // “auto” keeps matching the student’s own courses, even ones suggested later
        courseId: linked === "auto" ? undefined : linked,
      },
      { id: uid("co"), name: course.trim(), meta: kind === "course" ? "Online · self-paced" : kind === "exam" ? "College course" : "Personal project", goalId: id },
    );
    actions.toast("Goal saved — StudentOS is drafting a plan for it.");
    setBusy(false);
    onClose();
    router.push("/learn?tab=goals");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="My goals"
      title="Add a new goal"
      subtitle="StudentOS builds a plan for it after you save"
      footer={
        <>
          <span className="mr-auto" />
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<ArrowRightIcon size={13} />} loading={busy} onClick={save}>
            Save and build plan
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-white">What kind of goal?</p>
          <div className="space-y-2" role="radiogroup">
            {KINDS.map((k) => (
              <OptionCard key={k.value} checked={kind === k.value} onSelect={() => setKind(k.value)} title={k.title} lines={k.lines} />
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="g-course">{kind === "project" ? "Project name" : "Course or subject"}</Label>
          <Input id="g-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder={kind === "exam" ? "e.g. Operating Systems" : "e.g. CS50’s Introduction to AI with Python"} invalid={touched && !!errors.course} />
          {touched && <FieldError>{errors.course}</FieldError>}
        </div>
        <div>
          <Label>Learn it with a StudentOS video course</Label>
          <ChipGroup
            options={[
              { value: "auto", label: suggested ? `${suggested.title} (suggested)` : "Pick automatically" },
              ...linkableCourses(state.learning).filter((c) => c.id !== suggested?.id).map((c) => ({ value: c.id, label: c.title })),
              { value: "none", label: "None" },
            ]}
            value={linked}
            onChange={setLinked}
          />
          <p className="mt-1.5 text-[11px] text-white/45">Its sessions open this course, with the timer, when you press Start session.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{kind === "exam" ? "Exam date" : "Target date"}</Label>
            <DatePicker value={target} onChange={setTarget} min={addDays(TODAY, 1)} display={fmt.medium} invalid={touched && !!errors.target} />
            {touched && <FieldError>{errors.target}</FieldError>}
          </div>
          <div>
            <Label htmlFor="g-hours">{kind === "exam" ? "Revision time (h total)" : "Hours a week"}</Label>
            <Input id="g-hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
        </div>
        {others && (
          <Notice tone="info" icon={<InfoIcon size={14} />}>
            StudentOS will fit this around {others}, then show you the plan before saving.
          </Notice>
        )}
      </div>
    </Drawer>
  );
}

/* ---------- Edit goal (exam) ---------- */
export function EditGoalDrawer({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  if (!goal) return null;
  return <EditGoalForm goal={goal} onClose={onClose} />;
}

function EditGoalForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { actions } = useStore();
  const [title, setTitle] = useState(goal.title);
  const [course, setCourse] = useState(goal.course);
  const [date, setDate] = useState(goal.examDate ?? goal.target);
  const [hours, setHours] = useState(String(goal.revisionHours ?? 6));
  const [topics, setTopics] = useState(goal.topics ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = daysBetween(TODAY, date);

  const save = () => {
    actions.updateGoal(goal.id, { title: title.trim() || goal.title, course: course.trim() || goal.course, examDate: date, target: date, revisionHours: Number(hours) || goal.revisionHours, topics });
    actions.toast("Goal updated.");
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="My goals"
      title="Edit goal"
      subtitle={goal.title}
      footer={
        <>
          {confirmDelete ? (
            <span className="mr-auto flex items-center gap-2 text-[12px] text-white/70">
              Delete this goal?
              <Button
                size="xs"
                variant="danger"
                onClick={() => {
                  actions.removeGoal(goal.id);
                  actions.toast("Goal deleted.");
                  onClose();
                }}
              >
                Yes, delete
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              Delete goal
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<CheckIcon size={13} />} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="eg-title">Goal</Label>
          <Input id="eg-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="eg-course">Course</Label>
          <Input id="eg-course" value={course} onChange={(e) => setCourse(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{goal.type === "exam" ? "Exam date" : "Target date"}</Label>
            <DatePicker value={date} onChange={setDate} min={TODAY} display={fmt.short} />
          </div>
          <div>
            <Label htmlFor="eg-hours">Revision time</Label>
            <div className="relative">
              <Input id="eg-hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d]/g, ""))} className="pr-20" />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-white/45">h in total</span>
            </div>
          </div>
        </div>
        {goal.topics && (
          <div>
            <Label>Topics to cover</Label>
            <p className="-mt-1 mb-2 text-[11px] text-white/45">StudentOS spreads revision across these</p>
            <div className="flex flex-wrap gap-2">
              {topics.map((t, i) => (
                <Chip key={t.label} selected={t.selected} onClick={() => setTopics((x) => x.map((y, j) => (j === i ? { ...y, selected: !y.selected } : y)))}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {days >= 0 && days <= 14 && (
          <Notice tone="warning" title={`${goal.type === "exam" ? "Exam" : "Deadline"} is in ${days} day${days === 1 ? "" : "s"}`}>
            After you save, StudentOS will suggest revision sessions before {fmt.short(date)}.
          </Notice>
        )}
      </div>
    </Drawer>
  );
}

/* ---------- Review goal ---------- */

export function ReviewGoalDrawer({ goal, onClose, onUpdateDate }: { goal: Goal | null; onClose: () => void; onUpdateDate: () => void }) {
  const router = useRouter();
  const { state } = useStore();
  if (!goal) return null;
  const ws = weekStart(TODAY);
  const week = sessionsInRange(state.sessions, ws).filter(countable);
  const stats = weekStats(state.sessions, ws);
  const early = goal.planEnds ? Math.round(daysBetween(goal.planEnds, goal.target) / 7) : 0;
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Goal review"
      title={`Finish ${goal.course}`}
      subtitle={`${goal.title.replace(/^Finish /, "")} · ${goal.platform}`}
      footer={
        <>
          <Button size="sm" variant="ghost" className="mr-auto" onClick={onUpdateDate}>
            Update target date
          </Button>
          <Button size="sm" variant="primary" icon={<PlanIcon size={13} />} onClick={() => router.push("/study-plan")}>
            Open study plan
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            [`Week ${goal.currentWeek ?? 1}`, `of ${goal.totalWeeks ?? 10} in your plan`],
            [`${stats.done} of ${week.length}`, "sessions this week"],
            [`${early} week${early === 1 ? "" : "s"}`, "of buffer left"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              <p className="text-[18px] font-semibold text-white">{a}</p>
              <p className="text-[10.5px] text-white/50">{b}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-[12.5px]">
            <span className="font-medium text-white">Course progress</span>
            <span className="text-cyan-300">{goalProgress(goal, state).pct}%</span>
          </div>
          <ProgressBar value={goalProgress(goal, state).pct} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-white">Milestones</p>
          <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
            {state.milestones.map((m, i) => {
              const current = state.milestones.findIndex((x) => x.due >= TODAY);
              const badge = m.due < TODAY ? <Pill tone="green">Done</Pill> : i === current ? <Pill tone="cyan">In progress</Pill> : i === current + 1 ? <Pill>Next</Pill> : i === state.milestones.length - 1 ? <Pill tone="violet">Final</Pill> : <Pill>Later</Pill>;
              return (
                <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                  {i === current ? <PlayIcon size={11} className="text-cyan-300" /> : <FlagIcon size={13} className="text-white/55" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-white">
                      {m.label} · {m.title}
                    </span>
                    <span className="block text-[10.5px] text-white/45">Due {fmt.short(m.due)}</span>
                  </span>
                  {badge}
                </li>
              );
            })}
          </ul>
        </div>
        <Notice tone="success" icon={<CheckCircleIcon size={14} />} title="On track">
          You’ll finish on {fmt.medium(goal.planEnds ?? goal.target)} — {early ? `${early === 1 ? "a week" : `${early} weeks`} before` : "on"} your {fmt.dayMonth(goal.target)} target.
        </Notice>
      </div>
    </Drawer>
  );
}

/* ---------- Update target date ---------- */
export function TargetDateDrawer({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  if (!goal) return null;
  return <TargetForm goal={goal} onClose={onClose} />;
}

function TargetForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { actions } = useStore();
  const earlier = addDays(goal.target, -15);
  const later = addDays(goal.target, 31);
  const options = [
    { id: "earlier", date: earlier, title: fmt.medium(earlier), lines: ["~5½ h a week · 5 sessions", "Two weeks earlier — busier weeks"], badge: <Pill tone="amber" dot>More hours</Pill>, pace: "~5½ h a week" },
    { id: "later", date: later, title: fmt.medium(later), lines: ["~3½ h a week · 3 sessions", "More room around your end-semester exams"], badge: <Pill tone="green" dot>Lighter</Pill>, pace: "~3½ h a week" },
  ];
  const [choice, setChoice] = useState<"earlier" | "later" | "custom">("later");
  const [custom, setCustom] = useState("");
  const minCustom = "2026-12-01";
  const newDate = choice === "custom" ? custom : options.find((o) => o.id === choice)!.date;
  const pace = choice === "custom" ? (custom ? (custom < goal.target ? "~5 h a week" : "~4 h a week") : "—") : options.find((o) => o.id === choice)!.pace;
  const tooSoon = choice === "custom" && !!custom && custom < minCustom;

  const save = () => {
    if (!newDate || tooSoon) return;
    actions.updateGoal(goal.id, { target: newDate, planEnds: addDays(newDate, -7), hoursPerWeek: pace.replace(" a week", "") });
    actions.toast(`Target moved to ${fmt.medium(newDate)} — weeks 2–10 rebuilt.`);
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="My goals"
      title="Update target date"
      subtitle={goal.title}
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-white/55">{newDate ? fmt.medium(newDate) : "Pick a date"}</span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<CheckIcon size={13} />} disabled={!newDate || tooSoon} onClick={save}>
            Update date
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.04] p-4">
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">Current target</p>
            <p className="mt-1 text-[17px] font-semibold text-white">{fmt.medium(goal.target)}</p>
            <p className="text-[11px] text-white/50">{goal.hoursPerWeek ?? "~4½ h"} a week</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
            <ArrowRightIcon size={14} />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-cyan-300 uppercase">New target</p>
            <p className="mt-1 text-[17px] font-semibold text-white">{newDate ? fmt.medium(newDate) : "—"}</p>
            <p className="text-[11px] text-cyan-300">{pace}</p>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">Choose a new date</p>
          <p className="mb-2.5 text-[11px] text-white/45">StudentOS shows how your weekly load changes</p>
          <div className="space-y-2" role="radiogroup">
            {options.map((o) => (
              <OptionCard key={o.id} checked={choice === o.id} onSelect={() => setChoice(o.id as "earlier" | "later")} title={o.title} lines={o.lines} badge={o.badge} />
            ))}
            <OptionCard checked={choice === "custom"} onSelect={() => setChoice("custom")} title="Pick another date" lines={[`Enter any date after ${fmt.medium(minCustom)}`, "StudentOS checks it fits before saving"]} />
            {choice === "custom" && (
              <div className="pl-1">
                <DatePicker value={custom} onChange={setCustom} min={minCustom} display={fmt.medium} invalid={tooSoon} />
              </div>
            )}
          </div>
        </div>
        <Notice tone="warning" icon={<AlertCircleIcon size={14} />}>
          Weeks 2–10 will be rebuilt. Sessions you’ve completed stay as they are.
        </Notice>
      </div>
    </Drawer>
  );
}
