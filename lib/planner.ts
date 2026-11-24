/* Study planner. The AI writes the plan's content (what to study each session);
   this file fits those sessions into the student's real week: preferred times,
   rest day, college/work commitments. If the AI is unavailable, a simple plan
   is built here so the student is never stuck. */

import type { Commitment, HoursRange, Milestone, OnboardingAnswers, StudySession, StudyTime } from "./types";
import { TODAY, addDays, daysBetween, toMinutes, weekStart, weekdayIndex as weekdayOf } from "./utils";

export type OutlineSession = { title: string; objective: string; tasks: string[] };
export type OutlineWeek = { title: string; sessions: OutlineSession[] };
/** `note`: the AI's honest word when the time left can't cover everything (shown on the plan review). */
export type PlanOutline = { weeks: OutlineWeek[]; note?: string };

const HOURS: Record<HoursRange, number> = { "under-3": 2.5, "3-5": 4, "5-8": 6.5, "8-plus": 9 };

/** Days from today to the target (0 = today). A target under a week away gets a last-minute plan. */
export function daysLeft(a: OnboardingAnswers) {
  return a.target ? daysBetween(TODAY, a.target) : null;
}
export function isCrash(a: OnboardingAnswers) {
  const d = daysLeft(a);
  return d != null && d >= 0 && d < 7;
}

/** Monday of the plan's first week: this week, or next week if this week is nearly over. */
export function planStartFor(a: OnboardingAnswers) {
  const thisWeek = weekStart(TODAY);
  if (isCrash(a)) return thisWeek;
  const perWeek = sessionsPerWeek(a);
  return weekSlots(thisWeek, a, perWeek).length >= Math.ceil(perWeek / 2) ? thisWeek : addDays(thisWeek, 7);
}

function sessionsPerWeek(a: OnboardingAnswers) {
  const hours = HOURS[(a.hours || "3-5") as HoursRange] ?? 4;
  return Math.min(7, Math.max(2, Math.floor((hours * 60) / a.sessionLength)));
}

/** How many weeks and sessions per week this student's plan needs. */
export function planShape(a: OnboardingAnswers, start = planStartFor(a)) {
  // last-minute: one list of sessions, as many as fit before the exam
  if (isCrash(a)) return { weeks: 1, perWeek: Math.max(1, crashSlots(a).length), crash: true as const, daysLeft: daysLeft(a) ?? 0 };
  const days = a.target ? daysBetween(start, a.target) : 56;
  const weeks = Math.min(12, Math.max(2, Math.ceil((days > 0 ? days : 56) / 7)));
  return { weeks, perWeek: sessionsPerWeek(a), crash: false as const, daysLeft: daysLeft(a) };
}

/** Free slots from now until the exam (the exam day itself only when the exam is today), up to 2 a day. */
export function crashSlots(a: OnboardingAnswers) {
  const d = daysLeft(a) ?? 0;
  const last = d === 0 ? TODAY : addDays(a.target, -1);
  const b = { ...a, target: last };
  const monday = weekStart(TODAY);
  const all = [...weekSlots(monday, b, 21), ...weekSlots(addDays(monday, 7), b, 21)];
  const perDay = new Map<string, number>();
  const picked = all
    .filter((x) => x.date >= TODAY && x.date <= last)
    .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start))
    .filter((x) => {
      const n = perDay.get(x.date) ?? 0;
      if (n >= 2) return false;
      perDay.set(x.date, n + 1);
      return true;
    })
    .slice(0, 12);
  if (picked.length) return picked;
  // nothing free in their usual times: still give one session, as soon as possible
  const h = new Date().getHours();
  return h < 21 ? [{ date: TODAY, start: `${String(Math.min(21, h + 1)).padStart(2, "0")}:00` }] : [{ date: d === 0 ? TODAY : addDays(TODAY, 1), start: "07:00" }];
}

/* ---------- slots ---------- */

const START_TIMES: Record<StudyTime, string[]> = {
  "early-mornings": ["07:00", "06:30", "07:30"],
  afternoons: ["15:00", "14:00", "16:00"],
  evenings: ["19:00", "20:00", "18:00"],
  weekends: ["10:00", "11:00", "15:00"],
};

function clashes(commitments: Commitment[], dow: number, start: string, minutes: number) {
  const s = toMinutes(start);
  const e = s + minutes;
  return commitments.some((c) => c.days.includes(dow) && s < toMinutes(c.end) && toMinutes(c.start) < e);
}

/** Free start times for one week, spread across days, in date order. */
function weekSlots(monday: string, a: OnboardingAnswers, count: number) {
  const times: StudyTime[] = a.times.length ? a.times : ["evenings"];
  const rest = a.restDay === "sunday" ? 6 : a.restDay === "saturday" ? 5 : -1;
  const options: { date: string; start: string }[][] = [];
  for (let i = 0; i < 7; i++) {
    if (i === rest) continue;
    const date = addDays(monday, i);
    if (date < TODAY || (a.target && date > a.target)) continue;
    const weekend = i >= 5;
    const kinds = times.filter((t) => (t === "weekends" ? weekend : !weekend || !times.includes("weekends")));
    const list = (kinds.length ? kinds : weekend ? ["weekends" as StudyTime] : ["evenings" as StudyTime])
      .flatMap((t) => START_TIMES[t])
      .filter((t) => !clashes(a.commitments, i, t, a.sessionLength))
      .filter((t) => date > TODAY || toMinutes(t) > new Date().getHours() * 60 + new Date().getMinutes());
    if (list.length) options.push(list.map((start) => ({ date, start })));
  }
  if (!options.length) return [];
  // Spread evenly over the free days; if weekends were chosen, use them too.
  const spread = (days: typeof options, n: number) => {
    const k = Math.min(n, days.length);
    return Array.from({ length: k }, (_, j) => days[Math.floor((j * days.length) / k)][0]);
  };
  const weekendDays = options.filter((d) => weekdayOf(d[0].date) >= 5);
  const weekDays = options.filter((d) => weekdayOf(d[0].date) < 5);
  const wantWeekend = times.includes("weekends") ? (times.length === 1 ? count : Math.max(1, Math.round(count / 3))) : 0;
  const picked = spread(weekendDays, wantWeekend);
  picked.push(...spread(weekDays, count - picked.length));
  if (picked.length < count) picked.push(...spread(weekendDays.filter((d) => !picked.some((p) => p.date === d[0].date)), count - picked.length));
  for (let round = 1; picked.length < count && round < 3; round++) {
    for (const day of options) {
      if (picked.length >= count) break;
      const used = picked.filter((p) => p.date === day[0].date);
      const free = day.find((o) => used.every((u) => Math.abs(toMinutes(u.start) - toMinutes(o.start)) >= a.sessionLength + 15));
      if (free && used.length <= round) picked.push(free);
    }
  }
  return picked.sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
}

/* ---------- outline → sessions ---------- */

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function scheduleOutline(outline: PlanOutline, a: OnboardingAnswers, goalId: string, courseId?: string) {
  const start = planStartFor(a);
  const sessions: StudySession[] = [];
  const milestones: Milestone[] = [];
  let n = 0;
  if (isCrash(a)) {
    // last-minute plan: the sessions in order, one after another, in the free slots before the exam
    const slots = crashSlots(a);
    const list = outline.weeks.flatMap((w) => w.sessions).slice(0, slots.length);
    list.forEach((s, si) => {
      n++;
      const title = clean(s.title, 80) || `Session ${si + 1}`;
      const tasks = (s.tasks ?? []).map((t) => clean(t, 90)).filter(Boolean).slice(0, 4);
      sessions.push({
        id: `p${n}`,
        goalId,
        title,
        short: title.length > 34 ? `${title.slice(0, 33)}…` : title,
        summary: tasks.slice(0, 2).join(" · ") || "Study session",
        objective: clean(s.objective, 200),
        week: 1,
        date: slots[si].date,
        start: slots[si].start,
        minutes: a.sessionLength,
        priority: si >= list.length - 2 ? "High" : "Core",
        status: "planned",
        tasks: tasks.map((label, ti) => ({ id: `p${n}t${ti}`, label, done: false })),
        notes: "",
        countsToward: "Get ready for the exam",
        ...(courseId ? { courseId } : {}),
      });
    });
    if (a.target) milestones.push({ id: "m1", label: "Exam", title: clean(a.course || a.goal, 60) || "Exam", due: a.target });
    return { sessions, milestones };
  }
  outline.weeks.forEach((w, wi) => {
    const monday = addDays(start, wi * 7);
    const slots = weekSlots(monday, a, w.sessions.length);
    w.sessions.slice(0, slots.length).forEach((s, si) => {
      n++;
      const title = clean(s.title, 80) || `Week ${wi + 1} · Session ${si + 1}`;
      const tasks = (s.tasks ?? []).map((t) => clean(t, 90)).filter(Boolean).slice(0, 4);
      const last = si === w.sessions.length - 1 && w.sessions.length > 2;
      sessions.push({
        id: `p${n}`,
        goalId,
        title,
        short: title.length > 34 ? `${title.slice(0, 33)}…` : title,
        summary: tasks.slice(0, 2).join(" · ") || "Study session",
        objective: clean(s.objective, 200),
        week: wi + 1,
        date: slots[si].date,
        start: slots[si].start,
        minutes: a.sessionLength,
        priority: last ? "High" : "Core",
        status: "planned",
        tasks: tasks.map((label, ti) => ({ id: `p${n}t${ti}`, label, done: false })),
        notes: "",
        countsToward: `Finish week ${wi + 1}: ${clean(w.title, 60)}`,
        ...(courseId ? { courseId } : {}),
      });
    });
    if (wi % 2 === 1 || wi === outline.weeks.length - 1) {
      const from = wi % 2 === 1 ? wi - 1 : wi;
      milestones.push({
        id: `m${milestones.length + 1}`,
        label: from === wi ? `Week ${wi + 1}` : `Weeks ${from + 1}–${wi + 1}`,
        title: clean(w.title, 60),
        due: a.target && addDays(monday, 6) > a.target ? a.target : addDays(monday, 6),
      });
    }
  });
  return { sessions, milestones };
}

/** Simple plan used when the AI can't be reached. */
export function fallbackOutline(a: OnboardingAnswers, weeks: number, perWeek: number): PlanOutline {
  const topic = a.course.split(" — ")[0].trim() || a.goal || "your course";
  if (isCrash(a)) {
    const n = Math.max(1, perWeek);
    return {
      note: `There isn't time to cover all of ${topic} before the exam, so this plan puts the most important topics first and keeps the last sessions for revision.`,
      weeks: [{
        title: "Last-minute preparation",
        sessions: Array.from({ length: n }, (_, j) =>
          j >= n - Math.min(2, Math.ceil(n / 3))
            ? { title: `Revision ${j + 1}`, objective: `Revise formulas, key points and past questions of ${topic}.`, tasks: ["Go through your short notes", "Solve past exam questions"] }
            : { title: `Important topic ${j + 1}`, objective: `Cover one of the topics that carries the most marks in ${topic}.`, tasks: ["Read the key points", "Do 5 practice questions"] },
        ),
      }],
    };
  }
  return {
    weeks: Array.from({ length: weeks }, (_, i) => {
      const final = i === weeks - 1;
      const title = final ? "Revise and finish" : i === 0 ? "Get started" : `Part ${i + 1}`;
      return {
        title,
        sessions: Array.from({ length: perWeek }, (_, j) => {
          const practice = j === perWeek - 1;
          return practice
            ? { title: `Week ${i + 1} · Practice`, objective: `Practise what you covered this week in ${topic}.`, tasks: ["Review your notes", "Do practice questions"] }
            : { title: `Week ${i + 1} · ${final ? "Revision" : "Learn"} ${j + 1}`, objective: final ? `Revise the hardest parts of ${topic}.` : `Cover the next part of ${topic}.`, tasks: final ? ["Revise weak topics", "Try a mock test"] : ["Study the next topic", "Write short notes"] };
        }),
      };
    }),
  };
}

/** Keeps only well-formed weeks/sessions from the AI's JSON. */
export function sanitizeOutline(raw: unknown, weeks: number, perWeek: number): PlanOutline | null {
  const list = (raw as { weeks?: unknown[] })?.weeks;
  if (!Array.isArray(list)) return null;
  const out: OutlineWeek[] = list.slice(0, weeks).map((w, i) => {
    const ww = w as { title?: unknown; sessions?: unknown[] };
    const sessions = (Array.isArray(ww.sessions) ? ww.sessions : [])
      .slice(0, perWeek)
      .map((s) => s as { title?: unknown; objective?: unknown; tasks?: unknown[] })
      .map((s) => ({ title: clean(s.title, 80), objective: clean(s.objective, 200), tasks: (Array.isArray(s.tasks) ? s.tasks : []).map((t) => clean(t, 90)).filter(Boolean).slice(0, 4) }))
      .filter((s) => s.title);
    return { title: clean(ww.title, 60) || `Week ${i + 1}`, sessions };
  });
  const good = out.filter((w) => w.sessions.length);
  const note = clean((raw as { note?: unknown })?.note, 300);
  return good.length >= Math.min(2, weeks) ? { weeks: good, ...(note ? { note } : {}) } : null;
}


/* ---------- reuse answers from the profile setup ---------- */

const SETUP_HOURS: Record<string, HoursRange> = { "< 2 hours": "under-3", "2 – 5 hours": "3-5", "5 – 10 hours": "5-8", "10+ hours": "8-plus" };
const SETUP_GOALS: Record<string, OnboardingAnswers["goalType"]> = { skills: "skill", career: "skill", academics: "exam", explore: "skill" };

type SetupLike = {
  academic: { college: string; course: string; year: string; field: string; specialization: string };
  goals: { primary: string; hours: string };
};

/** Onboarding answers we already know from setup. Only fills fields that are still empty. */
export function answersFromSetup(setup: SetupLike | undefined, a: OnboardingAnswers, profileName = ""): Partial<OnboardingAnswers> {
  const patch: Partial<OnboardingAnswers> = {};
  if (!a.name && profileName) patch.name = profileName;
  if (!setup) return patch;
  const ac = setup.academic;
  if (!a.college && ac.college) patch.college = ac.college;
  if (!a.year && ac.year) {
    const y = ac.year.toLowerCase();
    patch.year = (["1st year", "2nd year", "3rd year", "4th year"].includes(y) ? y : "Other") as OnboardingAnswers["year"];
  }
  if (!a.degree && ac.course) patch.degree = [ac.course === "Other" ? "" : ac.course, ac.specialization || ac.field].filter(Boolean).join(", ");
  if (!a.goalType && SETUP_GOALS[setup.goals.primary]) patch.goalType = SETUP_GOALS[setup.goals.primary];
  if (!a.hours && SETUP_HOURS[setup.goals.hours]) patch.hours = SETUP_HOURS[setup.goals.hours];
  return patch;
}

export const profileKnown = (a: OnboardingAnswers) => !!(a.name && a.college && a.year && a.degree);
