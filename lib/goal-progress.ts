/* Real progress for a goal: the linked StudentOS video course if there is one
   (lessons watched), otherwise the share of its study sessions marked done. */

import { courseForGoal, coursePercent, emptyLearning, moduleKey, type Course } from "./learn";
import type { AppState } from "./store";
import type { Goal } from "./types";

export type GoalProgress = { pct: number; course?: Course; label: string; doneSessions: number; total: number };

export function goalProgress(g: Goal, state: Pick<AppState, "sessions" | "learning">): GoalProgress {
  const learning = state.learning ?? emptyLearning();
  const own = state.sessions.filter((x) => x.goalId === g.id && x.status !== "buffer" && x.status !== "suggested");
  const doneSessions = own.filter((x) => x.status === "completed").length;
  const course = courseForGoal(g, learning);
  if (course) {
    const modulesDone = course.modules.filter((m) => learning.modules[moduleKey(course.id, m.id)]?.done).length;
    return { course, pct: coursePercent(course, learning), label: `${modulesDone} of ${course.modules.length} modules done`, doneSessions, total: own.length };
  }
  return { pct: own.length ? Math.round((doneSessions / own.length) * 100) : 0, label: own.length ? `${doneSessions} of ${own.length} sessions done` : "No sessions yet", doneSessions, total: own.length };
}
