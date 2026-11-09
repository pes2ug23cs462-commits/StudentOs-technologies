import type { AppState } from "./store";
import type { Commitment, StudySession } from "./types";
import { NOW, TODAY, addDays, addMinutes, daysBetween, toMinutes, weekdayIndex } from "./utils";

/** Sessions that count toward the plan (not suggestions or buffer blocks). */
export const countable = (s: StudySession) => s.status !== "suggested" && s.status !== "buffer";

export function sessionsInRange(sessions: StudySession[], startKey: string, days = 7) {
  const end = addDays(startKey, days);
  return sessions.filter((s) => s.date >= startKey && s.date < end);
}

export function sessionsOn(sessions: StudySession[], dateKey: string) {
  return sessions.filter((s) => s.date === dateKey);
}

export function commitmentsOn(commitments: Commitment[], dateKey: string) {
  const idx = weekdayIndex(dateKey);
  return commitments.filter((c) => c.days.includes(idx));
}

export function isPast(s: StudySession) {
  if (s.date < TODAY) return true;
  if (s.date > TODAY) return false;
  const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  return toMinutes(s.start) + s.minutes <= nowMin;
}

/** Next planned session from now. */
export function nextSession(sessions: StudySession[]) {
  return sessions.find((s) => s.status === "planned" && !isPast(s));
}

export function sessionNumber(sessions: StudySession[], id: string) {
  const list = sessions.filter(countable);
  return { index: list.findIndex((s) => s.id === id) + 1, total: list.length };
}

export function whenLabel(s: StudySession) {
  if (s.date === TODAY) return "tonight";
  if (s.date === addDays(TODAY, 1)) return "tomorrow";
  return "";
}

export function weekStats(sessions: StudySession[], startKey: string) {
  const week = sessionsInRange(sessions, startKey).filter(countable);
  return {
    done: week.filter((s) => s.status === "completed").length,
    missed: week.filter((s) => s.status === "missed").length,
    upcoming: week.filter((s) => s.status === "planned").length,
  };
}

/** Does a proposed slot clash with a commitment or another session? */
export function findClash(state: AppState, date: string, start: string, minutes: number, ignoreId?: string) {
  const s = toMinutes(start);
  const e = s + minutes;
  for (const c of commitmentsOn(state.commitments, date)) {
    if (s < toMinutes(c.end) && e > toMinutes(c.start)) return c.name.toLowerCase();
  }
  for (const other of sessionsOn(state.sessions, date)) {
    if (other.id === ignoreId || other.status === "suggested" || other.status === "buffer") continue;
    const os = toMinutes(other.start);
    if (s < os + other.minutes && e > os) return other.short;
  }
  return null;
}

/** Free hour-aligned slots on a day, between 8 AM and 9 PM, that avoid commitments and sessions. */
export function freeSlots(state: AppState, date: string, minutes: number, ignoreId?: string) {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    const start = `${String(h).padStart(2, "0")}:00`;
    if (toMinutes(addMinutes(start, minutes)) > 21 * 60 + 30) continue;
    if (!findClash(state, date, start, minutes, ignoreId)) slots.push(start);
  }
  return slots;
}

/** Which week of the plan today falls in (1-based). */
export function planWeek(planStart: string | undefined) {
  if (!planStart) return 1;
  return Math.max(1, Math.floor(daysBetween(planStart, TODAY) / 7) + 1);
}
