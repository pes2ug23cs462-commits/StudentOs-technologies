"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { BookIcon, CalendarIcon, ChatIcon, ChevronRightIcon, SlidersIcon, TargetIcon } from "@/components/ui/icons";
import { Card, EmptyState, Pill } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { TODAY, cn, daysBetween, fmt, weekStart } from "@/lib/utils";

function StatusPill({ s }: { s: StudySession }) {
  if (s.status === "completed") return <Pill tone="green" dot>Completed</Pill>;
  if (s.status === "missed") return <Pill tone="red" dot>Missed</Pill>;
  if (s.status === "suggested") return <Pill tone="violet" dot>Suggested</Pill>;
  if (s.status === "buffer") return <Pill tone="gray" dot>Buffer</Pill>;
  if (s.date === TODAY) return <Pill tone="cyan" dot>Tonight</Pill>;
  if (s.rescheduled) return <Pill tone="cyan" dot>Rescheduled</Pill>;
  return <Pill tone="gray" dot>Upcoming</Pill>;
}

export default function StudyPlanPage() {
  const router = useRouter();
  const { state } = useStore();
  const goal = state.goals.find((g) => g.hasPlan);
  const [weeksShown, setWeeksShown] = useState(1);
  const [milestone, setMilestone] = useState(0);

  const weeks = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    state.sessions
      .filter((s) => s.status !== "buffer")
      .forEach((s) => {
        const k = weekStart(s.date);
        map.set(k, [...(map.get(k) ?? []), s]);
      });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [state.sessions]);

  if (!goal || state.planStatus === "none") {
    return (
      <div className="px-6 py-7 lg:px-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Study Plan</h1>
        <EmptyState icon={<TargetIcon size={15} />} title="No plan yet" className="mt-6 py-14">
          <span className="block">Finish setting up with the assistant and your plan will show here.</span>
          <Link href="/onboarding" className="mt-3 inline-block font-medium text-accent hover:underline">
            Resume setup
          </Link>
        </EmptyState>
      </div>
    );
  }

  const thisWeek = weekStart(TODAY);
  const visible = weeks.filter(([k]) => k >= thisWeek).slice(0, weeksShown);
  const remaining = weeks.filter(([k]) => k >= thisWeek).length - visible.length;

  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Study Plan</h1>
          <p className="mt-1 text-[13px] text-white/55">
            {state.planStatus === "accepted" ? `Accepted ${fmt.dayMonth(state.planAcceptedOn ?? TODAY)} · you can change it any time` : "Suggested · not saved yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/plan/preferences" size="sm" icon={<SlidersIcon size={13} />}>
            Edit preferences
          </ButtonLink>
          <ButtonLink href="/plan/review?mode=edit" size="sm" icon={<CalendarIcon size={13} />}>
            Edit schedule
          </ButtonLink>
          <ButtonLink href="/assistant?q=revise" size="sm" variant="primary" icon={<ChatIcon size={13} />}>
            Ask StudentOS to revise
          </ButtonLink>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">
        <Card glow className="p-4">
          <Pill tone="violet" dot>Active goal</Pill>
          <p className="mt-2.5 text-[15px] font-semibold text-white">{goal.title}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/50">
            <BookIcon size={12} /> {goal.course} · {goal.platform}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-white/50">Target date</p>
          <p className="mt-1.5 text-[15px] font-semibold text-white">{fmt.medium(goal.target)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-white/50">Plan finishes</p>
          <p className="mt-1.5 text-[15px] font-semibold text-emerald-300">{fmt.medium(goal.planEnds ?? goal.target)}{goal.planEnds && goal.planEnds < goal.target ? " · early" : ""}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-white/50">Pace</p>
          <p className="mt-1.5 text-[15px] font-semibold text-white">
            {goal.sessionsPerWeek ?? 4} sessions · {goal.hoursPerWeek ?? "~4½ h"} a week
          </p>
        </Card>
      </div>

      {state.milestones.length > 0 && (
      <Card className="mt-4 p-5">
        <p className="text-[14px] font-semibold text-white">Milestones</p>
        <div className="mt-3 grid grid-cols-2 border-b border-white/[0.08] md:grid-cols-4">
          {state.milestones.map((m, i) => (
            <button key={m.id} type="button" onClick={() => setMilestone(i)} className={cn("-mb-px border-b-2 py-3 pr-3 text-left transition", milestone === i ? "border-accent" : "border-transparent hover:border-white/20")}>
              <p className={cn("text-[11px] font-medium", i === 0 ? "text-cyan-300" : "text-white/50")}>{m.label}</p>
              <p className="mt-1 text-[13px] font-semibold text-white">{m.title}</p>
              <p className="mt-0.5 text-[11px] text-white/45">By {fmt.dayMonth(m.due)}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-white/55">
          {milestone === 0 ? "In progress. " : "Not started yet. "}
          {state.milestones[milestone].title} should be done by {fmt.long(state.milestones[milestone].due)}.
        </p>
      </Card>
      )}

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="text-[14px] font-semibold text-white">Planned sessions</p>
          <Link href="/schedule" className="flex items-center gap-0.5 text-[11.5px] text-cyan-300 hover:underline">
            Open schedule <ChevronRightIcon size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full min-w-[760px] text-left text-[12.5px]">
            <thead>
              <tr className="text-[11px] text-white/50">
                <th className="px-5 py-2 font-normal">When</th>
                <th className="px-3 py-2 font-normal">Topic</th>
                <th className="px-3 py-2 font-normal">Tasks</th>
                <th className="px-3 py-2 font-normal">Duration</th>
                <th className="px-3 py-2 font-normal">Priority</th>
                <th className="px-5 py-2 font-normal">Status</th>
              </tr>
            </thead>
            {visible.map(([k, list]) => (
              <tbody key={k} className="divide-y divide-white/[0.06]">
                <tr>
                  <td colSpan={6} className="px-5 pt-4 pb-2 text-[10.5px] font-semibold tracking-[0.06em] text-white/45 uppercase">
                    {k === thisWeek ? "This week" : `Week ${daysBetween(state.planStart ?? k, k) / 7 + 1}`} · {fmt.weekRange(k, false)}
                  </td>
                </tr>
                {list.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/session/${s.id}`)} className="cursor-pointer transition hover:bg-white/[0.03]">
                    <td className="px-5 py-3 whitespace-nowrap text-white/70">
                      {fmt.short(s.date)} · {fmt.hour(s.start)}
                    </td>
                    <td className="px-3 py-3 font-medium text-white">{s.short}</td>
                    <td className="max-w-[230px] truncate px-3 py-3 text-white/55">{s.summary}</td>
                    <td className="px-3 py-3 text-white/70">{s.minutes} min</td>
                    <td className="px-3 py-3">
                      <Pill tone={s.priority === "High" ? "amber" : "gray"}>{s.priority}</Pill>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        {remaining > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-3.5">
            <Button variant="link" size="sm" onClick={() => setWeeksShown((n) => n + 3)}>
              Show {remaining} more week{remaining > 1 ? "s" : ""} <ChevronRightIcon size={12} />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

