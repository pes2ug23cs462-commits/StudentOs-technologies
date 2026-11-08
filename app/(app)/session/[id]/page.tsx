"use client";

import { goalProgress } from "@/lib/goal-progress";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { courseForSession } from "@/lib/learn";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckCircleIcon, CheckIcon, ClockIcon, PlayIcon } from "@/components/ui/icons";
import { Card, Checkbox, Pill, ProgressBar, Segmented, Textarea } from "@/components/ui/primitives";
import { countable, sessionNumber, sessionsInRange } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { cn, fmt, weekStart } from "@/lib/utils";

type Phase = "ready" | "done";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useStore();
  const session = state.sessions.find((s) => s.id === id);
  const linkedCourse = session ? courseForSession(session, state.goals, state.learning) : undefined;

  const [phase, setPhase] = useState<Phase>(session?.status === "completed" ? "done" : "ready");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [nudge, setNudge] = useState<"open" | "added" | "dismissed">("open");

  // Keep notes saved as you type.
  useEffect(() => {
    if (!session || notes === session.notes) return;
    const t = setTimeout(() => actions.updateSession(session.id, { notes }), 400);
    return () => clearTimeout(t);
  }, [notes, session, actions]);

  if (!session) {
    return (
      <div className="px-8 py-24 text-center">
        <p className="text-[15px] font-semibold text-white">Session not found</p>
        <Link href="/study-plan" className="mt-3 inline-block text-[13px] text-accent hover:underline">
          Open your study plan
        </Link>
      </div>
    );
  }

  const { index, total: count } = sessionNumber(state.sessions, session.id);
  const doneTasks = session.tasks.filter((t) => t.done).length;
  const currentTask = session.tasks.find((t) => !t.done);
  const goal = state.goals.find((g) => g.id === session.goalId);

  const finish = () => {
    actions.updateSession(session.id, { status: "completed", studiedMinutes: session.studiedMinutes ?? session.minutes });
    setPhase("done");
  };

  const statusPill = {
    ready: <Pill tone="violet" dot>Ready to start</Pill>,
    done: <Pill tone="green" dot>Completed</Pill>,
  }[phase];

  const startCard = (
    <Card className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        <PlayIcon size={18} />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-white">{session.minutes}-minute session</p>
      <p className="mt-1 max-w-sm text-[12.5px] text-white/55">
        {linkedCourse ? `Study ${linkedCourse.title} in Learning, then come back and mark this session done.` : "Work through the tasks, then mark this session done."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {linkedCourse && (
          <Button variant="primary" icon={<PlayIcon size={11} />} onClick={() => router.push(`/learn/${linkedCourse.id}`)}>
            Open {linkedCourse.title}
          </Button>
        )}
        <Button variant={linkedCourse ? "secondary" : "primary"} icon={<CheckIcon size={13} />} onClick={finish}>
          Mark session done
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] text-white/65 hover:text-white">
          <ArrowLeftIcon size={12} /> Dashboard
        </Link>
        <div className="flex items-center gap-3 text-[12px] text-white/55">
          {statusPill}
          <span>
            Session {index} of {count} · Week {session.week}
          </span>
        </div>
      </div>

      <p className="mt-6 text-[10.5px] font-semibold tracking-[0.06em] text-white/45 uppercase">
        {goal?.course ?? "Study"} · Week {session.week}
      </p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-white">{phase === "done" ? "Session complete — nice start" : session.title}</h1>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_330px]">
        {phase === "done" ? (
          <Completed session={session} />
        ) : (
          startCard
        )}

        {phase === "done" ? (
          <AfterPanel session={session} notes={notes} nudge={nudge} setNudge={setNudge} />
        ) : (
          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-white">Objective</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/65">{session.objective}</p>
              <p className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <ClockIcon size={12} /> {session.minutes} min planned
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon size={12} /> {fmt.short(session.date)} · {fmt.hour(session.start)}
                </span>
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-white">Tasks</p>
              <ul className="mt-3 space-y-3">
                {session.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <Checkbox checked={t.done} onChange={() => actions.toggleTask(session.id, t.id)} label={t.label}>
                      <span>
                        <span className={cn("block text-[12.5px]", t.done ? "text-white/60" : "text-white")}>{t.label}</span>
                        {t.detail && <span className="block text-[10.5px] text-white/40">{t.detail}</span>}
                      </span>
                    </Checkbox>
                    {currentTask?.id === t.id && (
                      <Pill tone="cyan" className="ml-auto">
                        Now
                      </Pill>
                    )}
                  </li>
                ))}
              </ul>
              <ProgressBar value={(doneTasks / Math.max(1, session.tasks.length)) * 100} className="mt-4" />
              <p className="mt-1.5 text-[10.5px] text-white/45">
                {doneTasks} of {session.tasks.length} tasks
              </p>
            </Card>
            <Card className="p-4">
              <p className="mb-2.5 text-[13px] font-semibold text-white">Notes</p>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jot anything to revisit…" aria-label="Session notes" />
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  function Completed({ session }: { session: StudySession }) {
    const weekList = sessionsInRange(state.sessions, weekStart(session.date)).filter(countable);
    const weekDone = weekList.filter((s) => s.status === "completed").length;
    return (
      <Card className="flex flex-col items-center p-8">
        <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
          <CheckCircleIcon size={20} />
        </span>
        <div className="mt-6 grid w-full max-w-[440px] grid-cols-3 gap-2.5">
          {[
            ["Time studied", `${session.studiedMinutes ?? session.minutes} min`],
            ["Tasks done", `${session.tasks.filter((t) => t.done).length} of ${session.tasks.length}`],
            [`Week ${session.week}`, `${weekDone} of ${weekList.length}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              <p className="text-[10.5px] text-white/50">{k}</p>
              <p className="mt-1 text-[20px] font-semibold text-white">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 w-full max-w-[440px]">
          <div className="mb-1.5 flex justify-between text-[10.5px]">
            <span className="text-white/50">{goal?.course ?? "Course"} progress</span>
            <span className="font-medium text-white">
              Week {goal?.currentWeek ?? 1} of {goal?.totalWeeks ?? 10} · {goal ? goalProgress(goal, state).pct : 0}%
            </span>
          </div>
          <ProgressBar value={goal ? goalProgress(goal, state).pct : 0} />
        </div>
        <p className="mt-6 text-[13px] font-medium text-white">How did that feel?</p>
        <Segmented
          className="mt-2"
          size="sm"
          value={session.feeling ?? "none"}
          onChange={(v) => actions.updateSession(session.id, { feeling: v as StudySession["feeling"] })}
          options={[
            { value: "too-easy", label: "Too easy" },
            { value: "about-right", label: "About right" },
            { value: "too-hard", label: "Too hard" },
          ]}
        />
        <p className="mt-2 text-[10.5px] text-white/45">Optional. It helps the assistant adjust future sessions.</p>
        <div className="mt-5 flex gap-2">
          <Button size="sm" onClick={() => router.push("/study-plan")}>
            View study plan
          </Button>
          <Button size="sm" variant="primary" icon={<ArrowRightIcon size={13} />} onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </Card>
    );
  }
}

function AfterPanel({ session, notes, nudge, setNudge }: { session: StudySession; notes: string; nudge: "open" | "added" | "dismissed"; setNudge: (n: "open" | "added" | "dismissed") => void }) {
  const { state, actions } = useStore();
  const next = state.sessions.find((s) => s.status === "planned" && (s.date + s.start).localeCompare(session.date + session.start) > 0);
  return (
    <div className="space-y-3">
      {next && (
        <Card className="p-4">
          <p className="text-[12px] text-white/55">Up next</p>
          <Link href={`/session/${next.id}`} className="mt-1.5 block text-[14px] font-semibold text-white hover:underline">
            {next.short}
          </Link>
          <p className="mt-1 text-[11.5px] text-white/50">{next.summary.replace(/, /g, " · ")}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/55">
            <CalendarIcon size={12} /> {fmt.short(next.date)} · {fmt.time(next.start)} · {next.minutes} min
          </p>
        </Card>
      )}
      <Card className="p-4">
        <p className="text-[12px] text-white/55">Your notes</p>
        <p className="mt-1.5 text-[12px] leading-relaxed whitespace-pre-wrap text-white/80">{notes || "No notes this time."}</p>
      </Card>
      {nudge !== "dismissed" && (
        <Card className="p-4">
          <p className="text-[12px] text-white/55">From the assistant</p>
          {nudge === "added" ? (
            <p className="mt-1.5 text-[12px] text-emerald-300">Added 10 minutes to your next session to review this one first.</p>
          ) : (
            <>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">
                {next ? `Your next session is ${next.short}. ` : ""}If you want, I can add 10 minutes to it to review what you just covered.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (next) actions.updateSession(next.id, { minutes: next.minutes + 10 });
                    setNudge("added");
                  }}
                >
                  Add 10 min
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNudge("dismissed")}>
                  Not now
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
