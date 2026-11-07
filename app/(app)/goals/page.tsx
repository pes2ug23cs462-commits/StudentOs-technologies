"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddGoalDrawer, EditGoalDrawer, ReviewGoalDrawer, TargetDateDrawer } from "@/components/goals/goal-drawers";
import { Button } from "@/components/ui/button";
import { BookIcon, CalendarIcon, ChatIcon, ChevronRightIcon, ClockIcon, GradCapIcon, PencilIcon, PlusIcon, TargetIcon } from "@/components/ui/icons";
import { Card, EmptyState, Pill, ProgressBar } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { fmt } from "@/lib/utils";

export default function GoalsPage() {
  const router = useRouter();
  const { state } = useStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [reviewing, setReviewing] = useState<Goal | null>(null);
  const [dating, setDating] = useState<Goal | null>(null);
  const milestone = state.milestones[0];

  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Courses & Goals</h1>
          <p className="mt-1 text-[13px] text-white/55">What you’re working towards, and the courses behind it.</p>
        </div>
        <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => setAdding(true)}>
          Add goal
        </Button>
      </div>

      {state.goals.length === 0 ? (
        <EmptyState icon={<TargetIcon size={15} />} title="No learning goals yet" className="mt-6 py-14">
          Add a course, exam or project and StudentOS will plan around it.
        </EmptyState>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {state.goals.map((g) =>
            g.hasPlan ? (
              <Card key={g.id} glow className="p-5">
                <div className="flex gap-2">
                  <Pill tone="cyan" dot>Active</Pill>
                  <Pill tone="green" dot>Plan accepted</Pill>
                </div>
                <h2 className="mt-3 text-[15.5px] font-semibold text-white">{g.title}</h2>
                <ul className="mt-3 space-y-2 text-[12px] text-white/65">
                  <li className="flex items-center gap-2">
                    <BookIcon size={13} className="text-white/45" /> {g.course} · {g.platform}
                  </li>
                  <li className="flex items-center gap-2">
                    <CalendarIcon size={13} className="text-white/45" /> Target {fmt.medium(g.target)}
                    {g.planEnds && ` · plan ends ${fmt.dayMonth(g.planEnds)}`}
                  </li>
                  <li className="flex items-center gap-2">
                    <ClockIcon size={13} className="text-white/45" /> {g.sessionsPerWeek ?? 4} sessions · {g.hoursPerWeek ?? "~4½ h"} a week
                  </li>
                </ul>
                <div className="mt-4 mb-1.5 flex justify-between text-[11.5px]">
                  <span className="text-white/60">
                    Week {g.currentWeek ?? 1} of {g.totalWeeks ?? 10}
                  </span>
                  {milestone && (
                    <span className="text-white/60">
                      Milestone: {milestone.label} by {fmt.dayMonth(milestone.due)}
                    </span>
                  )}
                </div>
                <ProgressBar value={g.progressPct ?? 0} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" icon={<TargetIcon size={13} />} onClick={() => setReviewing(g)}>
                    Review goal
                  </Button>
                  <Button size="sm" variant="ghost" icon={<PencilIcon size={12} />} onClick={() => setDating(g)}>
                    Update target date
                  </Button>
                </div>
              </Card>
            ) : (
              <Card key={g.id} className="self-start p-5">
                <Pill tone="amber" dot>No plan yet</Pill>
                <h2 className="mt-3 text-[15.5px] font-semibold text-white">{g.title}</h2>
                <ul className="mt-3 space-y-2 text-[12px] text-white/65">
                  <li className="flex items-center gap-2">
                    <GradCapIcon size={13} className="text-white/45" /> {g.platform} · {g.course}
                  </li>
                  <li className="flex items-center gap-2">
                    <CalendarIcon size={13} className="text-white/45" /> {g.type === "exam" ? "Exam on" : "Target"} {fmt.short(g.examDate ?? g.target)} {(g.examDate ?? g.target).slice(0, 4)}
                  </li>
                </ul>
                <p className="mt-3 text-[12px] text-white/55">Ask StudentOS to fit {g.type === "exam" ? "revision for this exam" : "this goal"} around your {state.goals.find((x) => x.hasPlan)?.course ?? "other"} sessions.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" icon={<ChatIcon size={13} />} onClick={() => router.push("/assistant")}>
                    Create a plan
                  </Button>
                  <Button size="sm" variant="ghost" icon={<PencilIcon size={12} />} onClick={() => setEditing(g)}>
                    Edit goal
                  </Button>
                </div>
              </Card>
            ),
          )}
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        <p className="px-5 pt-5 pb-2 text-[14px] font-semibold text-white">Courses</p>
        {state.courses.length === 0 ? (
          <p className="px-5 pb-5 text-[12.5px] text-white/45">Courses appear here when you add a goal.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {state.courses.map((c) => {
              const goal = state.goals.find((g) => g.id === c.goalId);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => goal && (goal.hasPlan ? setReviewing(goal) : setEditing(goal))} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.03]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/70">
                      <BookIcon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white">{c.name}</span>
                      <span className="block truncate text-[11px] text-white/45">{c.meta}</span>
                    </span>
                    {goal ? goal.hasPlan ? <Pill tone="green" dot>Linked to a goal</Pill> : <Pill tone="amber" dot>Goal without a plan</Pill> : <Pill>No goal</Pill>}
                    <ChevronRightIcon size={14} className="text-white/45" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AddGoalDrawer open={adding} onClose={() => setAdding(false)} />
      <EditGoalDrawer goal={editing} onClose={() => setEditing(null)} />
      <ReviewGoalDrawer
        goal={reviewing}
        onClose={() => setReviewing(null)}
        onUpdateDate={() => {
          setDating(reviewing);
          setReviewing(null);
        }}
      />
      <TargetDateDrawer goal={dating} onClose={() => setDating(null)} />
    </div>
  );
}
