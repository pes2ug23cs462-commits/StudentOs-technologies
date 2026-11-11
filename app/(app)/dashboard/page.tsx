"use client";

import { FancyIcon } from "@/components/site/fancy-icon";
import { goalProgress } from "@/lib/goal-progress";
import { startSession } from "@/lib/start-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RescheduleDrawer } from "@/components/reschedule/reschedule-drawer";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  AlertCircleIcon,
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  FlagIcon,
  PlanIcon,
  PlayIcon,
  TargetIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Card, Checkbox, EmptyState, Pill, ProgressBar } from "@/components/ui/primitives";
import { Countdown } from "@/components/ui/countdown";
import { ExamProgress } from "@/components/exam/exam-progress";
import { defaultGrade, showExamPrep } from "@/lib/exam-prep";
import { countable, nextSession, planWeek, sessionsInRange, weekStats, whenLabel } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { NOW, TODAY, addDays, cn, daysBetween, fmt, greeting, weekStart } from "@/lib/utils";

function relDay(date: string) {
  if (date === TODAY) return "Tonight";
  if (date === addDays(TODAY, 1)) return "Tomorrow";
  return fmt.dow(date);
}

export default function DashboardPage() {
  const { state } = useStore();
  const first = state.profile.name.split(" ")[0] || "there";
  if (state.planStatus === "none" || !state.sessions.length) return <EmptyDashboard first={first} />;
  return <FullDashboard first={first} />;
}

/* ---------- Before the first plan exists ---------- */
function EmptyDashboard({ first }: { first: string }) {
  const { state } = useStore();
  const step = Math.max(1, state.onboarding.step);
  const done = Math.max(0, step - 1);
  return (
    <div className="px-6 py-7 lg:px-8">
      <h1 className="flex items-center gap-3 text-[24px] font-semibold tracking-[-0.02em] text-white">
<FancyIcon name="rocket" tone="violet" size={44} />
        {greeting(NOW)}, {first}
      </h1>
      <p className="mt-1 text-[13px] text-white/55">Your dashboard fills in once your first plan is ready.</p>

      <Card glow className="mt-5 flex flex-wrap items-center gap-4 border-violet-400/25 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/25 text-violet-200">
          <ChatIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-white">Finish setting up your plan — step {step} of 5</p>
          <p className="text-[12px] text-white/50">Your answers so far are saved. Next: {["", "tell StudentOS about you.", "pick your goal.", "add your course and target date.", "tell StudentOS about your week.", "check the summary."][step]}</p>
        </div>
        <div className="w-40">
          <ProgressBar value={(done / 5) * 100} />
          <p className="mt-1.5 text-[11px] text-white/45">{done} of 5 steps done</p>
        </div>
        <ButtonLink href="/onboarding" variant="primary" size="sm" icon={<ChevronRightIcon size={13} />}>
          Resume setup
        </ButtonLink>
      </Card>

      {showExamPrep(state.setup) && (
        <div className="mt-4 max-w-[560px]">
          <ExamProgress st={state.examPrep ?? {}} grade={state.examPrep?.grade ?? defaultGrade(state.setup)} compact />
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <EmptyState icon={<CalendarIcon size={15} />} title="No sessions planned yet">
          Your study sessions appear here after you accept a plan.
        </EmptyState>
        <EmptyState icon={<TargetIcon size={15} />} title="No learning goals yet">
          Your goal will show here with its target date.
        </EmptyState>
      </div>
    </div>
  );
}

/* ---------- Normal dashboard ---------- */
function QuickAction({ href, icon, title, sub }: { href: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="lift-3d depth flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 backdrop-blur hover:border-white/15 hover:bg-white/[0.06]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-white">{title}</span>
        <span className="block truncate text-[11px] text-white/45">{sub}</span>
      </span>
    </Link>
  );
}

function FullDashboard({ first }: { first: string }) {
  const router = useRouter();
  const { state, actions } = useStore();
  const [rescheduling, setRescheduling] = useState<StudySession | null>(null);

  const goal = state.goals.find((g) => g.hasPlan) ?? state.goals[0];
  const next = nextSession(state.sessions);
  const ws = weekStart(TODAY);
  const stats = weekStats(state.sessions, ws);
  const missed = state.sessions.find((s) => s.status === "missed" && s.date >= ws);
  const movedMissed = state.sessions.find((s) => s.rescheduled && s.status === "planned" && s.date >= TODAY);
  const catchUp = state.sessions.find((s) => s.status === "suggested" && s.date >= TODAY);
  const totalWeeks = Math.ceil(daysBetween(state.sessions[0].date, state.sessions[state.sessions.length - 1].date) / 7);

  const acceptCatchUp = () => {
    if (!missed || !catchUp) return;
    actions.updateSession(missed.id, { date: catchUp.date, start: catchUp.start, status: "planned", rescheduled: true });
    actions.removeSession(catchUp.id);
    actions.toast(`${missed.short} moved to ${fmt.dow(catchUp.date)}, ${fmt.time(catchUp.start)}`);
  };

  const when = next ? whenLabel(next) : "";

  return (
    <div className="px-6 py-7 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-[24px] font-semibold tracking-[-0.02em] text-white">
<FancyIcon name="rocket" tone="violet" size={44} />
            {greeting(NOW)}, {first}
          </h1>
          <p className="mt-1 text-[13px] text-white/55">
            {fmt.long(TODAY)} · Week {planWeek(state.planStart)} of your {goal?.course ?? "study"} plan
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/assistant" size="sm" icon={<ChatIcon size={13} />}>
            Ask StudentOS
          </ButtonLink>
          <ButtonLink href="/study-plan" size="sm" icon={<PlanIcon size={13} />}>
            View Study Plan
          </ButtonLink>
        </div>
      </div>

      {state.planStatus === "suggested" && (
        <Card glow className="mt-5 flex flex-wrap items-center gap-3 border-violet-400/30 p-4">
          <PlanIcon size={16} className="text-violet-200" />
          <p className="flex-1 text-[13px] text-white">Your suggested plan is ready. Nothing is on your schedule until you accept it.</p>
          <ButtonLink href="/plan/review" variant="primary" size="sm">
            Review plan
          </ButtonLink>
        </Card>
      )}

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <QuickAction href="/assistant" icon={<ChatIcon size={14} />} title="Ask StudentOS" sub="Questions, changes, help" />
        <QuickAction href="/study-plan" icon={<PlanIcon size={14} />} title="View Study Plan" sub={`${goal?.course ?? "Plan"} · ${totalWeeks} weeks`} />
        <QuickAction href="/schedule" icon={<CalendarIcon size={14} />} title="Edit Schedule" sub="Move or add sessions" />
        <QuickAction href={next ? `/session/${next.id}` : "/study-plan"} icon={<PlayIcon size={11} />} title="Resume Study Session" sub={next ? `Week ${next.week} · ${next.short}` : "Nothing scheduled"} />
      </div>

      {showExamPrep(state.setup) && (
        <div className="mt-4">
          <ExamProgress st={state.examPrep ?? {}} grade={state.examPrep?.grade ?? defaultGrade(state.setup)} compact />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        {/* Next session */}
        <Card glow className="ui-sweep relative flex min-h-[220px] flex-col overflow-hidden border-violet-400/25 p-5">
          <span aria-hidden className="ui-orbit-art" />
          {next ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="cyan" dot>
                  Next session{when ? ` · ${when}` : ` · ${fmt.dow(next.date)}`}
                </Pill>
                {next.rescheduled && (
                  <Pill tone="green" dot>
                    Rescheduled
                  </Pill>
                )}
                <span className="ml-auto text-[12px] text-white/55">
                  {next.date !== TODAY && next.date !== addDays(TODAY, 1) ? `${fmt.short(next.date)} · ` : ""}
                  {fmt.range(next.start, next.minutes)} · {next.minutes} min
                </span>
              </div>
              <Countdown to={new Date(`${next.date}T${next.start}:00`)} className="mt-auto pt-6 text-[12.5px]" />
              <h2 className="mt-1.5 text-[22px] font-semibold tracking-tight text-white">{next.title}</h2>
              <p className="mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-white/55">Objective: {next.objective}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" size="sm" icon={<PlayIcon size={10} />} onClick={() => startSession(next, state.goals, actions, router.push, state.learning)}>
                  Start session
                </Button>
                <Button size="sm" icon={<CalendarIcon size={13} />} onClick={() => setRescheduling(next)}>
                  Reschedule
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon={<CalendarIcon size={15} />} title="Nothing else this week" className="flex-1 border-0">
              You’re all caught up.
            </EmptyState>
          )}
        </Card>

        {/* Current goal */}
        {goal && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Current goal</p>
              <Link href="/learn?tab=goals" className="flex items-center gap-0.5 text-[11.5px] text-accent hover:underline">
                My goals <ChevronRightIcon size={12} />
              </Link>
            </div>
            <p className="mt-3 text-[14px] font-semibold text-white">{goal.title}</p>
            <p className="mt-2 text-[11.5px] text-white/50">
              Target · {fmt.medium(goal.target)}
              {goal.planEnds && <span className="ml-3">Plan ends · {fmt.medium(goal.planEnds)}</span>}
            </p>
            <div className="mt-5 mb-1.5 flex justify-between text-[11.5px]">
              <span className="text-white/55">Course progress · {goalProgress(goal, state).pct}%</span>
              <span className="font-medium text-white">
                Week {planWeek(state.planStart)} of {totalWeeks}
              </span>
            </div>
            <ProgressBar value={goalProgress(goal, state).pct} />
            <Pill tone="green" dot className="mt-3">
              {stats.missed ? `${stats.missed} missed this week — reschedule to stay on track` : "On track"}
            </Pill>
          </Card>
        )}

        {/* Today's priorities */}
        <Card className="p-5">
          <p className="text-[14px] font-semibold text-white">Today’s priorities</p>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {next?.tasks.slice(0, 2).map((t) => (
              <PriorityRow key={t.id} checked={t.done} onChange={() => actions.toggleTask(next.id, t.id)} label={`${next.short} · ${t.label}`} meta={`${relDay(next.date)}, ${fmt.time(next.start)}`} />
            ))}
            {(missed || movedMissed) && (
              <PriorityRow
                checked={false}
                onChange={() => (missed ? setRescheduling(missed) : undefined)}
                label={`Review the missed ${fmt.dowLong((missed ?? movedMissed)!.date)} session`}
                meta={movedMissed ? `Moved to ${fmt.dow(movedMissed.date)}, ${fmt.time(movedMissed.start)}` : "Choose a new time below"}
              />
            )}
          </ul>
        </Card>

        {/* This week */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">This week</p>
            <Link href="/schedule" className="flex items-center gap-0.5 text-[11.5px] text-accent hover:underline">
              Open schedule <ChevronRightIcon size={12} />
            </Link>
          </div>
          <WeekStrip sessions={sessionsInRange(state.sessions, ws)} start={ws} />
          <p className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/55">
            <span className="flex items-center gap-1">
              <CheckCircleIcon size={12} className="text-emerald-400" /> {stats.done} done
            </span>
            <span className="flex items-center gap-1">
              <AlertCircleIcon size={12} className="text-rose-400" /> {stats.missed} missed
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={12} className="text-accent" /> {stats.upcoming} upcoming
            </span>
          </p>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="p-5">
          <p className="text-[14px] font-semibold text-white">Upcoming deadlines</p>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {[
              ...(next ? [{ icon: <FlagIcon size={13} className="text-accent" />, title: next.short, sub: `Week ${next.week} checkpoint`, date: addDays(weekStart(next.date), 6) }] : []),
              ...state.goals.filter((g) => g.type === "exam" && g.examDate).map((g) => ({ icon: <AlertCircleIcon size={13} className="text-amber-300" />, title: g.shortTitle, sub: g.hasPlan ? "Revision planned" : "No revision plan yet", date: g.examDate! })),
              ...state.milestones.filter((m) => m.due >= TODAY).slice(0, 1).map((m) => ({ icon: <TargetIcon size={13} className="text-violet-300" />, title: `Milestone: ${m.title}`, sub: m.label, date: m.due })),
            ]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((d) => {
                const left = daysBetween(TODAY, d.date);
                return (
                  <li key={d.title} className="flex items-center gap-3 py-2.5">
                    {d.icon}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-white">{d.title}</span>
                      <span className="block text-[10.5px] text-white/45">{d.sub}</span>
                    </span>
                    <span className="text-right text-[11px] text-white/55">
                      {fmt.short(d.date)}
                      <span className={cn("block text-[10px]", left <= 3 ? "text-amber-300" : "text-white/40")}>{left} day{left === 1 ? "" : "s"} left</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </Card>

        {/* Needs your attention */}
        {missed ? (
          <Card className="border-rose-500/35 p-5">
            <p className="text-[14px] font-semibold text-white">Needs your attention</p>
            <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-white">
              <AlertCircleIcon size={14} className="text-rose-400" /> You missed {fmt.dowLong(missed.date)}’s session
            </p>
            <p className="mt-1 text-[12px] text-white/55">
              {missed.title} ({missed.minutes} min). Pick a new time so you stay on track.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {catchUp && (
                <Button size="sm" variant="primary" onClick={acceptCatchUp}>
                  Move to {fmt.dow(catchUp.date)} {fmt.hour(catchUp.start)}
                </Button>
              )}
              <Button size="sm" onClick={() => setRescheduling(missed)}>
                Choose a time
              </Button>
            </div>
          </Card>
        ) : movedMissed ? (
          <Card className="p-5">
            <p className="text-[14px] font-semibold text-white">Missed session moved</p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-white">
              <CheckCircleIcon size={14} className="text-emerald-400" /> Moved to {fmt.short(movedMissed.date)}, {fmt.time(movedMissed.start)}
            </p>
            <p className="mt-1 text-[12px] text-white/55">{movedMissed.title} · your finish date doesn’t change.</p>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-[14px] font-semibold text-white">Needs your attention</p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-white/70">
              <CheckCircleIcon size={14} className="text-emerald-400" /> Nothing right now — you’re on track.
            </p>
          </Card>
        )}
      </div>

      <RescheduleDrawer session={rescheduling} open={!!rescheduling} onClose={() => setRescheduling(null)} />
    </div>
  );
}

function PriorityRow({ checked, onChange, label, meta }: { checked: boolean; onChange: (v: boolean) => void; label: string; meta: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Checkbox checked={checked} onChange={onChange} label={label}>
        <span className={cn("text-[12.5px]", checked ? "text-white/60" : "text-white/85")}>{label}</span>
      </Checkbox>
      <span className="ml-auto shrink-0 text-right text-[11px] text-white/45">{meta}</span>
    </li>
  );
}

function WeekStrip({ sessions, start }: { sessions: StudySession[]; start: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="mt-4 grid grid-cols-7 gap-1 text-center">
      {days.map((d) => {
        const list = sessions.filter((s) => s.date === d && countable(s));
        const today = d === TODAY;
        const icon = list.some((s) => s.status === "missed") ? (
          <XCircleIcon size={13} className="text-rose-400" />
        ) : list.length && list.every((s) => s.status === "completed") ? (
          <CheckCircleIcon size={13} className="text-emerald-400" />
        ) : list.some((s) => s.status === "planned") ? (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        ) : fmt.dow(d) === "Sun" ? (
          <span className="text-[10px] text-white/45">Rest</span>
        ) : null;
        return (
          <div key={d} className={cn("flex flex-col items-center gap-1 rounded-lg py-2", today && "border border-violet-400/50 bg-violet-500/20")}>
            <span className={cn("text-[10.5px]", today ? "text-white" : "text-white/50")}>{fmt.dow(d)}</span>
            <span className="text-[15px] font-semibold text-white">{fmt.dayNum(d)}</span>
            <span className="flex h-4 items-center">{icon}</span>
          </div>
        );
      })}
    </div>
  );
}
