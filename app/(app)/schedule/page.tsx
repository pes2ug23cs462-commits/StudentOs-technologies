"use client";

import { FancyIcon } from "@/components/site/fancy-icon";
import { startSession } from "@/lib/start-session";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { TimelineSection } from "@/components/timeline/timeline-section";
import { AddSessionDrawer } from "@/components/calendar/add-session-drawer";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import { RescheduleDrawer } from "@/components/reschedule/reschedule-drawer";
import { Button } from "@/components/ui/button";
import { BookIcon, CalendarIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, FlagIcon, PlayIcon, PlusIcon, XCircleIcon } from "@/components/ui/icons";
import { Card, Checkbox, EmptyState, Pill, Segmented } from "@/components/ui/primitives";
import { commitmentsOn, nextSession, sessionsOn } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { TODAY, addDays, addMinutes, cn, fmt, toMinutes, weekStart } from "@/lib/utils";

type View = "day" | "week";

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <Schedule />
    </Suspense>
  );
}

function Schedule() {
  const router = useRouter();
  const params = useSearchParams();
  const section = params.get("tab") === "timeline" ? "timeline" : "week";
  const { state } = useStore();
  const view: View = params.get("view") === "day" ? "day" : "week";
  const [anchor, setAnchor] = useState(TODAY);
  const [selectedId, setSelectedId] = useState<string | null>(() => nextSession(state.sessions)?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [rescheduling, setRescheduling] = useState<StudySession | null>(null);

  const ws = weekStart(anchor);
  const selected = state.sessions.find((s) => s.id === selectedId) ?? null;
  const setView = (v: View) => router.replace(v === "day" ? "/schedule?view=day" : "/schedule");
  const shift = (n: number) => setAnchor((a) => addDays(a, view === "week" ? n * 7 : n));

  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-tight text-white">
<FancyIcon name="bolt" tone="amber" size={44} />Schedule</h1>
          <p className="mt-1 text-[13px] text-white/55">
            {section === "timeline" ? "Your study week and your path through college, in one place." : view === "day" ? fmt.long(anchor) : "Your planned sessions around college and commitments."}
          </p>
        </div>
        {section === "week" && (
        <div className="flex gap-2">
          <Segmented value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }]} />
          <Button icon={<PlusIcon size={14} />} onClick={() => setAdding(true)}>
            Add session
          </Button>
        </div>
        )}
      </div>

      <div role="tablist" aria-label="Schedule sections" className="mt-5 flex gap-1 border-b border-white/10">
        {(
          [
            ["week", "This week", CalendarIcon],
            ["timeline", "College timeline", FlagIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => router.replace(key === "week" ? "/schedule" : "/schedule?tab=timeline")}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition",
              section === key ? "border-accent text-white" : "border-transparent text-white/55 hover:text-white",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {section === "timeline" ? (
        <div className="mt-6">
          <TimelineSection />
        </div>
      ) : (
      <>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10">
            <ChevronLeftIcon size={14} />
          </button>
          <button type="button" aria-label="Next" onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10">
            <ChevronRightIcon size={14} />
          </button>
        </div>
        <p className="text-[16px] font-semibold text-white">{view === "week" ? fmt.weekRange(ws) : `${anchor === TODAY ? "Today · " : ""}${fmt.short(anchor)}`}</p>
        {anchor !== TODAY && (
          <button type="button" onClick={() => setAnchor(TODAY)} className="rounded-md px-2 py-1 text-[12px] font-medium text-white/80 hover:bg-white/10">
            Today
          </button>
        )}
        {view === "week" && anchor === TODAY && <span className="px-2 py-1 text-[12px] font-medium text-white/80">Today</span>}
        {view === "week" && (
          <div className="ml-auto flex flex-wrap gap-4 text-[11px] text-white/55">
            {[
              ["bg-plum-strong", "Upcoming"],
              ["bg-emerald-500/40", "Completed"],
              ["bg-rose-500/45", "Missed"],
              ["bg-white/15", "Commitment"],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-sm", c)} /> {l}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        {view === "week" ? (
          <WeekCalendar weekStart={ws} sessions={state.sessions} commitments={state.commitments} startHour={7} endHour={22} hourHeight={30} showStatus selectedId={selectedId} onSelect={(s) => setSelectedId(s.id)} />
        ) : (
          <DayList date={anchor} onSelect={(s) => setSelectedId(s.id)} selectedId={selectedId} />
        )}

        {view === "week" ? (
          selected ? (
            <SessionDetail session={selected} onReschedule={() => setRescheduling(selected)} />
          ) : (
            <EmptyState icon={<CalendarIcon size={15} />} title="Pick a session">
              Select a session on the calendar to see its tasks.
            </EmptyState>
          )
        ) : (
          <DaySide date={anchor} />
        )}
      </div>

      <AddSessionDrawer open={adding} onClose={() => setAdding(false)} defaultDate={anchor} />
      <RescheduleDrawer session={rescheduling} open={!!rescheduling} onClose={() => setRescheduling(null)} />
      </>
      )}
    </div>
  );
}

function SessionDetail({ session, onReschedule }: { session: StudySession; onReschedule: () => void }) {
  const router = useRouter();
  const { state, actions } = useStore();
  const goal = state.goals.find((g) => g.id === session.goalId);
  const pill =
    session.status === "completed" ? (
      <Pill tone="green" dot>Completed</Pill>
    ) : session.status === "missed" ? (
      <Pill tone="red" dot>Missed</Pill>
    ) : session.status === "suggested" ? (
      <Pill tone="violet" dot>Suggested · needs your OK</Pill>
    ) : (
      <Pill tone="cyan" dot>
        Upcoming{session.date === TODAY ? " · tonight" : ""}
      </Pill>
    );
  return (
    <Card className="flex flex-col p-5">
      <div>{pill}</div>
      <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-white">{session.title}</h2>
      <ul className="mt-4 space-y-2.5 text-[12.5px] text-white/75">
        <li className="flex items-center gap-2.5">
          <CalendarIcon size={14} className="text-white/50" /> {fmt.short(session.date)} · {fmt.range(session.start, session.minutes)}
        </li>
        <li className="flex items-center gap-2.5">
          <ClockIcon size={14} className="text-white/50" /> {session.minutes} minutes
        </li>
        {goal && (
          <li className="flex items-center gap-2.5">
            <BookIcon size={14} className="text-white/50" /> {goal.course} · {goal.platform}
          </li>
        )}
        <li className="flex items-center gap-2.5">
          <FlagIcon size={14} className="text-white/50" /> Counts toward: {session.countsToward}
        </li>
      </ul>
      {session.tasks.length > 0 && (
        <>
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-[12.5px] font-medium text-white">Tasks</p>
          <ul className="mt-2.5 space-y-2.5">
            {session.tasks.map((t) => (
              <li key={t.id}>
                <Checkbox checked={t.done} onChange={() => actions.toggleTask(session.id, t.id)} label={t.label} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-5 space-y-2">
        {session.status === "suggested" ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              actions.updateSession(session.id, { status: "planned" });
              actions.toast("Catch-up session added to your plan.");
            }}
          >
            Accept suggestion
          </Button>
        ) : session.status !== "completed" ? (
          <Button variant="primary" className="w-full" icon={<PlayIcon size={10} />} onClick={() => startSession(session, state.goals, actions, router.push, state.learning)}>
            Start session
          </Button>
        ) : (
          <Button className="w-full" onClick={() => router.push(`/session/${session.id}`)}>
            View summary
          </Button>
        )}
        {session.status !== "completed" && (
          <Button className="w-full" icon={<CalendarIcon size={13} />} onClick={onReschedule}>
            Reschedule
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ---------- Day view ---------- */
type Row = { time: string; kind: "commitment" | "session" | "optional" | "end"; title: string; sub: string; session?: StudySession };

function DayList({ date, onSelect, selectedId }: { date: string; onSelect: (s: StudySession) => void; selectedId: string | null }) {
  const router = useRouter();
  const { state } = useStore();
  const rows: Row[] = [
    ...commitmentsOn(state.commitments, date).map((c) => ({ time: c.start, kind: "commitment" as const, title: c.name, sub: `${fmt.time(c.start)} – ${fmt.time(c.end)} · fixed` })),
    ...sessionsOn(state.sessions, date)
      .filter((s) => s.status !== "buffer")
      .map((s) => ({ time: s.start, kind: "session" as const, title: s.title, sub: `${fmt.range(s.start, s.minutes)} · ${s.minutes} min${s.status === "completed" ? " · done" : s.status === "missed" ? " · missed" : ""}`, session: s })),
  ];
  rows.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const lastEnd = rows.reduce((m, r) => Math.max(m, toMinutes(r.time) + (r.session?.minutes ?? 60)), 0);
  rows.push({ time: rows.length ? addMinutes("00:00", Math.max(lastEnd, 21 * 60)) : "21:00", kind: "end", title: "Wind down", sub: `Nothing scheduled after ${fmt.hour(addMinutes("00:00", Math.max(lastEnd, 21 * 60)))}` });

  return (
    <Card className="self-start overflow-hidden">
      <ul className="divide-y divide-white/[0.06]">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[72px_1fr] items-center gap-3 px-4 py-3">
            <span className="text-[12px] text-white/55">{fmt.time(r.time)}</span>
            {r.kind === "end" ? (
              <p className="text-[12.5px] text-white/55">
                {r.title} — {r.sub}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => (r.session ? (r.session.status === "planned" ? router.push(`/session/${r.session.id}`) : onSelect(r.session)) : undefined)}
                className={cn(
                  "rounded-lg px-3.5 py-2.5 text-left",
                  r.kind === "commitment" && "cursor-default border border-white/[0.08] bg-white/[0.05]",
                  r.kind === "optional" && "cursor-default border border-dashed border-white/20 bg-black/40",
                  r.kind === "session" && r.session?.status === "planned" && "border border-accent/60 bg-plum-strong",
                  r.kind === "session" && r.session?.status === "completed" && "border border-emerald-400/40 bg-emerald-500/10",
                  r.kind === "session" && r.session?.status === "missed" && "border border-rose-400/45 bg-rose-500/10",
                  r.session?.id === selectedId && "ring-1 ring-accent",
                )}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-white">
                  {r.session?.status === "completed" && <CheckCircleIcon size={12} className="text-emerald-400" />}
                  {r.session?.status === "missed" && <XCircleIcon size={12} className="text-rose-400" />}
                  {r.title}
                </span>
                <span className="block text-[11px] text-white/50">{r.sub}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DaySide({ date }: { date: string }) {
  const { state, actions } = useStore();
  const day = sessionsOn(state.sessions, date).filter((s) => s.status !== "buffer" && s.status !== "suggested");
  const planned = day.reduce((a, s) => a + s.minutes, 0);
  const commits = commitmentsOn(state.commitments, date);
  const lastCommit = commits.reduce((m, c) => (c.end > m ? c.end : m), "00:00");
  const collegeEnd = commits.find((c) => c.name === "College")?.end;
  let rest = date;
  for (let i = 0; i < 7; i++) {
    if (fmt.dow(rest) === (state.prefs.restDay === "saturday" ? "Sat" : "Sun")) break;
    rest = addDays(rest, 1);
  }
  const tasks = day.flatMap((s) => s.tasks.map((t) => ({ ...t, sid: s.id })));
  return (
    <div className="space-y-3 self-start">
      <Card className="p-4">
        <p className="text-[13.5px] font-semibold text-white">{date === TODAY ? "Today’s tasks" : `Tasks · ${fmt.short(date)}`}</p>
        {tasks.length ? (
          <ul className="mt-3 space-y-2.5">
            {tasks.map((t) => (
              <li key={t.id}>
                <Checkbox checked={t.done} onChange={() => actions.toggleTask(t.sid, t.id)} label={t.label} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-white/45">No tasks for this day.</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-[13.5px] font-semibold text-white">{date === TODAY ? "Today at a glance" : "At a glance"}</p>
        <dl className="mt-3 space-y-2.5 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">Planned study</dt>
            <dd className="text-white">{planned ? `${planned} min` : "None"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">Free after {collegeEnd ? "college" : "commitments"}</dt>
            <dd className="text-white">{fmt.time(collegeEnd && lastCommit > collegeEnd ? "18:00" : lastCommit === "00:00" ? "09:00" : lastCommit)} – 11:00 PM</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/50">Next rest day</dt>
            <dd className="text-white">{fmt.dowLong(rest)} {fmt.dayMonth(rest)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

