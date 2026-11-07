"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import { MilestoneList, PlanStats, SessionRows, WeekNav } from "@/components/plan/plan-parts";
import { Button, IconButton } from "@/components/ui/button";
import { AlertCircleIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, ClockIcon, GripIcon, MaximizeIcon, MinimizeIcon, PlayIcon, SlidersIcon, XIcon } from "@/components/ui/icons";
import { Card, LogoMark, Notice, Pill, Segmented, fieldClass } from "@/components/ui/primitives";
import { askAssistant } from "@/lib/assistant";
import { PLAN_WEEKS } from "@/lib/mock-data";
import { countable, findClash, nextSession, sessionsInRange } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { TODAY, addDays, addMinutes, cn, daysBetween, fmt, toMinutes, weekStart, weekdayIndex } from "@/lib/utils";

type Tab = "week" | "list" | "milestones";

export default function PlanReviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, actions } = useStore();
  const editing = params.get("mode") === "edit";
  const goal = state.goals[0];

  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState<Tab>("week");
  const [draft, setDraft] = useState<StudySession[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sessions = editing ? (draft ?? state.sessions) : state.sessions;
  const planStart = state.planStart ?? weekStart(state.sessions[0]?.date ?? TODAY);
  const totalWeeks = state.sessions.length ? Math.max(1, Math.ceil((daysBetween(planStart, state.sessions[state.sessions.length - 1].date) + 1) / 7)) : PLAN_WEEKS;
  const start = addDays(planStart, (week - 1) * 7);
  const weekSessions = sessionsInRange(sessions, start);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  if (!goal || state.planStatus === "none") {
    return (
      <div className="mx-auto max-w-[520px] px-6 py-24 text-center">
        <h1 className="text-[22px] font-semibold text-white">No plan yet</h1>
        <p className="mt-2 text-[13px] text-white/55">Finish setting up with the assistant and it will suggest a plan for you to review here.</p>
        <Button variant="primary" className="mt-5" onClick={() => router.push("/onboarding")}>
          Resume setup
        </Button>
      </div>
    );
  }

  const accepted = state.planStatus === "accepted" && !editing;
  const total = sessions.filter(countable).length;

  const startEditing = () => {
    setDraft(state.sessions);
    router.push("/plan/review?mode=edit");
  };
  const updateDraft = (id: string, patch: Partial<StudySession>) => {
    setDraft((d) => (d ?? state.sessions).map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const saveDraft = () => {
    if (draft) {
      const before = new Map(state.sessions.map((s) => [s.id, s]));
      draft.forEach((s) => {
        const b = before.get(s.id);
        if (b && (b.date !== s.date || b.start !== s.start || b.minutes !== s.minutes)) actions.updateSession(s.id, { date: s.date, start: s.start, minutes: s.minutes });
      });
      state.sessions.filter((s) => !draft.some((d) => d.id === s.id)).forEach((s) => actions.removeSession(s.id));
      actions.toast("Schedule updated.");
    }
    setDraft(null);
    setSelectedId(null);
    router.push("/plan/review");
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 px-6 py-6 lg:px-8">
          <Pill tone={accepted ? "green" : "violet"} dot className="mb-2">
            {accepted ? "Plan saved" : editing ? "Editing · not saved yet" : "Suggested plan · not saved yet"}
          </Pill>
          <h1 className="text-[26px] font-semibold tracking-tight text-white">
            {accepted ? "Your study plan is on your schedule" : editing ? "Edit your schedule" : "Review your study plan"}
          </h1>

          <div className="mt-5">
            <PlanStats goal={goal} />
          </div>

          <div className="mt-6">
            <WeekNav
              planStart={planStart}
              week={week}
              total={totalWeeks}
              onChange={setWeek}
              rightSlot={
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "week", label: "Week" },
                    { value: "list", label: "List" },
                    { value: "milestones", label: "Milestones" },
                  ]}
                />
              }
            />
          </div>

          <div className="mt-5">
            {tab === "week" && (
              <>
                <WeekCalendar
                  weekStart={start}
                  sessions={sessions}
                  commitments={state.commitments}
                  selectedId={editing ? selectedId : null}
                  onSelect={editing ? (s) => setSelectedId(s.id) : undefined}
                  onMove={
                    editing
                      ? (id, date, startTime) => {
                          updateDraft(id, { date, start: startTime });
                          setSelectedId(id);
                        }
                      : undefined
                  }
                />
                <Card className="mt-4 overflow-hidden">
                  <SessionRows sessions={weekSessions} selectedId={editing ? selectedId : null} onSelect={editing ? (s) => setSelectedId(s.id) : (s) => router.push(`/session/${s.id}`)} />
                </Card>
              </>
            )}
            {tab === "list" && <FullList sessions={sessions} onSelect={(s) => (editing ? setSelectedId(s.id) : router.push(`/session/${s.id}`))} />}
            {tab === "milestones" && <MilestoneList milestones={state.milestones} currentWeek={goal.currentWeek} />}
          </div>
        </div>

        {/* Action bar */}
        {!accepted && (
          <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 border-t border-white/[0.07] bg-ink/90 px-6 py-3.5 backdrop-blur lg:px-8">
            <p className="text-[12px] text-white/50">{editing ? "Changes are saved when you press Save." : `${total} sessions · nothing is saved until you accept.`}</p>
            <div className="ml-auto flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => (setDraft(null), setSelectedId(null), router.push("/plan/review"))}>
                    Discard changes
                  </Button>
                  <Button size="sm" variant="primary" icon={<CheckIcon size={13} />} onClick={saveDraft}>
                    Save changes
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" icon={<SlidersIcon size={13} />} onClick={() => router.push("/plan/preferences")}>
                    Edit preferences
                  </Button>
                  <Button size="sm" onClick={startEditing}>
                    Edit schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<CheckIcon size={13} />}
                    onClick={() => {
                      actions.acceptPlan();
                      actions.toast(`Plan saved — ${total} sessions added to your schedule.`);
                    }}
                  >
                    Accept plan
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <aside className="sticky top-0 hidden h-screen w-[310px] shrink-0 flex-col border-l border-white/[0.06] bg-black/35 xl:flex">
        {editing ? (
          <EditSessionPanel
            key={selected?.id ?? "none"}
            session={selected}
            sessions={sessions}
            onClose={() => setSelectedId(null)}
            onApply={(patch) => selected && updateDraft(selected.id, patch)}
            onRemove={() => {
              if (!selected) return;
              setDraft((d) => (d ?? state.sessions).filter((s) => s.id !== selected.id));
              setSelectedId(null);
            }}
          />
        ) : accepted ? (
          <AcceptedPanel total={total} />
        ) : (
          <AssistantPanel />
        )}
      </aside>
    </div>
  );
}

function FullList({ sessions, onSelect }: { sessions: StudySession[]; onSelect: (s: StudySession) => void }) {
  const weeks = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    sessions.forEach((s) => {
      const k = weekStart(s.date);
      map.set(k, [...(map.get(k) ?? []), s]);
    });
    return [...map.entries()];
  }, [sessions]);
  return (
    <Card className="overflow-hidden">
      {weeks.map(([k, list], i) => (
        <div key={k}>
          <p className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[10.5px] font-semibold tracking-[0.06em] text-white/45 uppercase">
            Week {i + 1} · {fmt.weekRange(k, false)}
          </p>
          <SessionRows sessions={list} onSelect={onSelect} />
        </div>
      ))}
    </Card>
  );
}

/* ---------- Right panel: suggested plan → assistant ---------- */
function AssistantPanel() {
  const router = useRouter();
  const { state, actions } = useStore();
  const goal = state.goals.find((g) => g.hasPlan) ?? state.goals[0];
  const total = state.sessions.filter(countable).length;
  const totalWeeks = state.sessions.length ? Math.ceil((daysBetween(state.planStart ?? state.sessions[0].date, state.sessions[state.sessions.length - 1].date) + 1) / 7) : 0;
  const [log, setLog] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (label: string) => {
    if (label === "Move Saturday to 11 AM") {
      state.sessions.filter((s) => weekdayIndex(s.date) === 5 && s.start === "10:00").forEach((s) => actions.updateSession(s.id, { start: "11:00" }));
      setLog((l) => [...l, { role: "user", text: label }, { role: "assistant", text: "Done — Saturday sessions now start at 11:00 AM. Nothing else moved." }]);
    } else if (label === "Shorter sessions") {
      state.sessions.filter((s) => s.minutes > 60).forEach((s) => actions.updateSession(s.id, { minutes: 60 }));
      setLog((l) => [...l, { role: "user", text: label }, { role: "assistant", text: "Every session is now 60 minutes or less." }]);
    } else {
      setLog((l) => [...l, { role: "user", text: label }, { role: "assistant", text: "Noted — I’ll add a revision week before the final project the next time I rebuild your plan." }]);
    }
  };

  const ask = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setLog((l) => [...l, { role: "user", text: q }]);
    setBusy(true);
    try {
      const a = await askAssistant(q);
      setLog((l) => [...l, { role: "assistant", text: a }]);
    } catch {
      setLog((l) => [...l, { role: "assistant", text: "I couldn’t reach the server. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark size={20} />
        <span className="text-[13px] font-semibold text-white">StudentOS</span>
        <div className="ml-auto flex gap-1.5">
          <IconButton label="Minimise" className="h-8 w-8">
            <MinimizeIcon size={12} />
          </IconButton>
          <IconButton label="Open full chat" className="h-8 w-8" onClick={() => router.push("/assistant")}>
            <MaximizeIcon size={12} />
          </IconButton>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 pb-3">
        <Card className="p-4">
          <p className="text-[13px] font-semibold text-white">Why this plan</p>
          <ul className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-white/65">
            <li>• {state.commitments.length ? `Sessions are planned around ${state.commitments.map((c) => c.name.toLowerCase()).join(" and ")}.` : "Sessions are spread across your free evenings and weekends."}</li>
            <li>• {total} sessions over {totalWeeks} weeks, finishing {goal?.planEnds ? fmt.medium(goal.planEnds) : "before your target"}.</li>
            <li>• {state.prefs.restDay === "none" ? "No fixed rest day — missed sessions move to your next free slot." : `${state.prefs.restDay === "sunday" ? "Sunday" : "Saturday"} stays light. A missed session moves there first.`}</li>
          </ul>
        </Card>
        {log.map((m, i) => (
          <div key={i} className={cn("rounded-lg px-3 py-2 text-[12px]", m.role === "user" ? "ml-8 bg-plum-strong text-white" : "mr-4 bg-white/[0.05] text-white/80")}>
            {m.text}
          </div>
        ))}
        {busy && <p className="text-[11.5px] text-white/45">Thinking…</p>}
        <div className="flex flex-col items-start gap-2">
          {["Move Saturday to 11 AM", "Shorter sessions", "Add a revision week"].map((s) => (
            <button key={s} type="button" onClick={() => apply(s)} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] text-white hover:bg-white/[0.09]">
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pr-1.5 pl-3"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this plan…" aria-label="Ask about this plan" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white placeholder:text-white/40 outline-none" />
          <button type="submit" aria-label="Send" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 hover:bg-white/10">
            <ArrowRightIcon size={12} />
          </button>
        </form>
      </div>
    </>
  );
}

/* ---------- Right panel: plan accepted ---------- */
function AcceptedPanel({ total }: { total: number }) {
  const { state } = useStore();
  const first = nextSession(state.sessions) ?? state.sessions[0];
  const last = [...state.sessions].reverse().find(countable);
  return (
    <div className="space-y-3 overflow-y-auto p-4">
      <Card className="p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-emerald-300">
          <CheckCircleIcon size={16} />
        </span>
        <p className="mt-3 text-[15px] font-semibold text-white">Plan saved</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/55">
          {total} sessions added to your schedule from {fmt.medium(state.sessions[0]?.date ?? TODAY)} to {last ? fmt.medium(last.date) : "—"}. Reminders follow your notification settings.
        </p>
        <ul className="mt-3 space-y-1.5 text-[12px] text-white/80">
          {["Saved to Study Plan", "Schedule populated", "Assistant set up complete"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckIcon size={13} className="text-emerald-400" /> {t}
            </li>
          ))}
        </ul>
      </Card>
      {first && (
        <Card className="border-cyan-400/30 bg-cyan-400/[0.04] p-4">
          <p className="text-[10.5px] font-semibold tracking-[0.08em] text-white/50 uppercase">First session</p>
          <p className="mt-2 text-[14px] font-semibold text-white">{first.title}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-white/60">
            <ClockIcon size={12} /> {fmt.short(first.date)} · {fmt.time(first.start)} · {first.minutes} min
          </p>
          <Link href={`/session/${first.id}`} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-[13px] font-semibold text-black shadow-[0_0_22px_rgba(0,225,245,0.3)] hover:bg-accent-hover">
            <PlayIcon size={11} /> Start First Study Session
          </Link>
          <p className="mt-2.5 text-[11px] text-white/45">You can also start early — the timer only runs while you study.</p>
        </Card>
      )}
    </div>
  );
}

/* ---------- Right panel: edit one session ---------- */
const DURATIONS = [30, 45, 60, 90, 120];
const START_TIMES = Array.from({ length: 30 }, (_, i) => addMinutes("07:00", i * 30));

function EditSessionPanel({
  session,
  sessions,
  onApply,
  onRemove,
  onClose,
}: {
  session: StudySession | null;
  sessions: StudySession[];
  onApply: (patch: Partial<StudySession>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { state } = useStore();
  const [date, setDate] = useState(session?.date ?? "");
  const [start, setStart] = useState(session?.start ?? "19:00");
  const [minutes, setMinutes] = useState(session?.minutes ?? 60);

  const hint = (
    <p className="mt-auto flex items-center gap-1.5 px-5 py-4 text-[11px] text-white/45">
      <GripIcon size={12} /> Drag sessions on the calendar, or edit one here.
    </p>
  );

  if (!session) {
    return (
      <div className="flex h-full flex-col">
        <div className="px-5 py-5">
          <p className="text-[14px] font-semibold text-white">Edit session</p>
          <p className="mt-2 text-[12px] text-white/50">Pick a session on the calendar to change its day, time or length.</p>
        </div>
        {hint}
      </div>
    );
  }

  const ws = weekStart(session.date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const clash = findClash({ ...state, sessions }, date, start, minutes, session.id);
  const changed = date !== session.date || start !== session.start || minutes !== session.minutes;
  const late = toMinutes(start) + minutes > 22 * 60;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-semibold text-white">Edit session</p>
          <IconButton label="Close" onClick={onClose} className="h-7 w-7">
            <XIcon size={12} />
          </IconButton>
        </div>
        <p className="mt-1 text-[11.5px] text-white/50">
          {session.short} · {session.summary}
        </p>

        <label className="mt-4 mb-1.5 block text-[12px] font-medium text-white/85" htmlFor="es-day">Day</label>
        <select id="es-day" value={date} onChange={(e) => setDate(e.target.value)} className={cn(fieldClass(), "appearance-none")}>
          {days.map((d) => (
            <option key={d} value={d} className="bg-raised">
              {fmt.long(d)}
            </option>
          ))}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-white/85" htmlFor="es-start">Starts</label>
            <select id="es-start" value={start} onChange={(e) => setStart(e.target.value)} className={cn(fieldClass(), "appearance-none")}>
              {START_TIMES.map((t) => (
                <option key={t} value={t} className="bg-raised">
                  {fmt.time(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-white/85" htmlFor="es-dur">Duration</label>
            <select id="es-dur" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={cn(fieldClass(), "appearance-none")}>
              {DURATIONS.map((d) => (
                <option key={d} value={d} className="bg-raised">
                  {d} min
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {clash ? (
            <Notice tone="warning" icon={<AlertCircleIcon size={14} />} title={`That overlaps ${clash}`}>
              Pick another slot — StudentOS never schedules over a commitment.
            </Notice>
          ) : late ? (
            <Notice tone="warning" title="That runs late">Sessions ending after 10 PM are easy to skip. Try an earlier slot.</Notice>
          ) : (
            <Notice tone="success" icon={<CheckCircleIcon size={14} />}>
              No clash with your commitments or other sessions.
            </Notice>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="danger" onClick={onRemove}>
            Remove session
          </Button>
          <Button size="sm" disabled={!changed || !!clash} onClick={() => onApply({ date, start, minutes })}>
            Apply
          </Button>
        </div>
      </div>
      {hint}
    </div>
  );
}
