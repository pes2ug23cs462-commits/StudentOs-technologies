/* A short plain-text summary of the student's account, sent with each
   assistant message so answers fit their week, goals and level.
   Respects the assistant settings (use schedule / use progress). */

import { goalProgress } from "./goal-progress";
import { isDue } from "./notes";
import { testAnalytics } from "./tests";
import { allCourses, courseStats, emptyLearning } from "./learn";
import { INTERESTS, LEVEL_INFO } from "./setup";
import type { AppState } from "./store";
import { TODAY, addDays } from "./utils";

export function buildContext(state: AppState): string {
  const lines: string[] = [];
  const a = state.setup?.academic;
  const g = state.setup?.goals;
  lines.push(`Today: ${TODAY}`);
  lines.push(`Name: ${state.profile.name || "unknown"}`);
  const edu = [a?.course || state.profile.degree, a?.specialization || a?.field, a?.year, a?.college || state.profile.college].filter(Boolean).join(", ");
  if (edu) lines.push(`Studies: ${edu}`);
  if (state.setup?.level) lines.push(`Assessed level: ${LEVEL_INFO[state.setup.level].label}`);
  if (g?.primary) lines.push(`Main goal: ${g.primary}`);
  if (g?.interests?.length) lines.push(`Interests: ${g.interests.map((i) => INTERESTS.find((x) => x.value === i)?.label ?? i).join(", ")}`);
  const skills = state.setup?.skills.familiar?.filter((s) => s !== "No specific skills yet");
  if (skills?.length) lines.push(`Skills: ${skills.join(", ")}`);
  lines.push(`Study preferences: ${state.prefs.hours} hours per week, ${state.prefs.sessionLength}-min sessions, prefers ${state.prefs.times.join("/") || "any time"}, rest day ${state.prefs.restDay}`);
  const ts = testAnalytics(state.tests ?? []);
  if (ts) lines.push(`Mock tests: ${ts.tests} taken, average ${ts.avg}%${ts.weak.length ? `, weak topics: ${ts.weak.map((w) => `${w.topic} (${w.acc}%)`).join(", ")}` : ""}`);
  const dueNotes = (state.notes ?? []).filter((n) => isDue(n));
  if (dueNotes.length) lines.push(`Notes due for revision today: ${dueNotes.map((n) => n.title).join(", ")}`);

  if (state.goals.length) {
    lines.push("Goals:");
    for (const goal of state.goals.slice(0, 6))
      lines.push(`- ${goal.title} (${goal.type}, target ${goal.target}${`, ${goalProgress(goal, state).pct}% done`})`);
  }

  if (state.assistant.useSchedule) {
    const end = addDays(TODAY, 7);
    const upcoming = state.sessions
      .filter((s) => s.date >= TODAY && s.date <= end && (s.status === "planned" || s.status === "suggested"))
      .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start))
      .slice(0, 8);
    if (upcoming.length) {
      lines.push("Planned sessions in the next 7 days:");
      for (const s of upcoming) lines.push(`- ${s.date} ${s.start}, ${s.minutes} min: ${s.short || s.title}`);
    } else lines.push("No study sessions planned in the next 7 days.");
    const missed = state.sessions.filter((s) => s.status === "missed").length;
    if (missed) lines.push(`Missed sessions so far: ${missed}`);
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (state.commitments.length)
      lines.push(`Fixed commitments: ${state.commitments.slice(0, 6).map((c) => `${c.name} (${c.days.map((d) => DAYS[d]).join("/")} ${c.start}-${c.end})`).join(", ")}`);
  }

  if (state.assistant.useProgress) {
    const l = state.learning ?? emptyLearning();
    const started = allCourses(l).filter((c) => l.courses[c.id]);
    if (started.length) {
      lines.push("StudentOS video courses:");
      for (const c of started) {
        const st = courseStats(c, l);
        lines.push(`- ${c.title}: ${st.done}/${st.total} modules${st.progress?.certId ? ", certified" : st.ready ? ", quiz unlocked" : ""}`);
      }
    }
    const entries = state.entries ?? [];
    if (entries.length) lines.push(`Projects & experience: ${entries.slice(0, 6).map((e) => e.title).join("; ")}`);
  }
  return lines.join("\n");
}
