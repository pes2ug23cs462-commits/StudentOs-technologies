import type { Commitment, GoalType, HoursRange, RestDay, StudyTime } from "./types";
import { fmt } from "./utils";

export const HOURS_OPTIONS: { value: HoursRange; label: string }[] = [
  { value: "under-3", label: "Under 3 h" },
  { value: "3-5", label: "3–5 h" },
  { value: "5-8", label: "5–8 h" },
  { value: "8-plus", label: "8 h +" },
];
export const hoursLabel = (h: HoursRange | "") => HOURS_OPTIONS.find((o) => o.value === h)?.label ?? "";

export const TIME_OPTIONS: { value: StudyTime; label: string }[] = [
  { value: "early-mornings", label: "Early mornings" },
  { value: "afternoons", label: "Afternoons" },
  { value: "evenings", label: "Evenings" },
  { value: "weekends", label: "Weekends" },
];
export const timesLabel = (t: StudyTime[]) =>
  TIME_OPTIONS.filter((o) => t.includes(o.value))
    .map((o) => o.label)
    .join(", ");

export const SESSION_OPTIONS = [
  { value: 45 as const, label: "45 min" },
  { value: 60 as const, label: "60 min" },
  { value: 90 as const, label: "90 min" },
];

export const REST_OPTIONS: { value: RestDay; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "saturday", label: "Saturday" },
  { value: "none", label: "None" },
];
export const restLabel = (r: RestDay) => (r === "none" ? "no rest day" : `rest on ${r === "sunday" ? "Sunday" : "Saturday"}`);

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "course", label: "Finish an online course" },
  { value: "exam", label: "Prepare for an exam" },
  { value: "skill", label: "Learn a new skill" },
  { value: "project", label: "Build a project" },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** [0,1,2,3,4] → "Mon – Fri", [1,3] → "Tue, Thu" */
export function daysLabel(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  const contiguous = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (contiguous) return `${WEEKDAYS[sorted[0]]} – ${WEEKDAYS[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}

export function commitmentLabel(c: Commitment) {
  return `${daysLabel(c.days)} · ${fmt.time(c.start)} – ${fmt.time(c.end)}`;
}

/** “College Mon–Fri 9–4:30 · Gym Tue/Thu 6–7:30 PM” */
export function commitmentsShort(list: Commitment[]) {
  const t = (hhmm: string) => fmt.time(hhmm).replace(":00", "").replace(/ (AM|PM)$/, "");
  return list
    .map((c) => {
      const days = daysLabel(c.days).replace(" – ", "–").replace(", ", "/");
      return `${c.name} ${days} ${t(c.start)}–${t(c.end)}${fmt.time(c.end).endsWith("PM") && c.name !== "College" ? " PM" : ""}`;
    })
    .join(" · ");
}

/** “Finish CS50’s Introduction to Programming with Python” → “Finish CS50’s Python course” */
export function shortGoal(goal: string) {
  return goal.replace(/Introduction to Programming with Python/i, "Python course").trim();
}
