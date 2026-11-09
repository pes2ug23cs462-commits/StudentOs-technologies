import type {
  AssistantSettings,
  Commitment,
  Course,
  Goal,
  Milestone,
  NotificationSettings,
  OnboardingAnswers,
  Profile,
  StudyPrefs,
  StudySession,
  Task,
} from "./types";
import { addDays, daysBetween } from "./utils";

/* Sample data matching the Figma designs (Aarav, CS50P, week of 26 Oct 2026).
   Replace with real data from the backend later. */

export const PLAN_START = "2026-10-26"; // Monday, week 1
export const PLAN_WEEKS = 19;

export const demoProfile: Profile = {
  name: "Aarav Mehta",
  email: "aarav.m@college.edu",
  college: "Northfield Institute of Technology",
  year: "2nd year",
  degree: "B.Tech, Computer Science",
  timezone: "India (IST, UTC+5:30)",
  language: "English",
};

export const demoCommitments: Commitment[] = [
  { id: "c-college", name: "College", days: [0, 1, 2, 3, 4], start: "09:00", end: "16:30" },
  { id: "c-gym", name: "Gym", days: [1, 3], start: "18:00", end: "19:30" },
];

export const demoPrefs: StudyPrefs = {
  hours: "5-8",
  times: ["evenings", "weekends"],
  sessionLength: 60,
  restDay: "sunday",
};

export const demoNotifications: NotificationSettings = {
  beforeSession: true,
  howEarly: 30,
  missedSuggestions: true,
  morningPlan: false,
  weeklySummary: false,
  push: true,
  email: true,
};

export const demoAssistant: AssistantSettings = {
  tone: "encouraging",
  openOnLogin: true,
  autoReschedule: true,
  askBeforeChanging: true,
  useSchedule: true,
  useProgress: true,
  useCalendar: true,
};

export const demoGoals: Goal[] = [
  {
    id: "g-cs50p",
    type: "course",
    title: "Finish CS50’s Introduction to Programming with Python",
    shortTitle: "Finish CS50’s Python course",
    course: "CS50P",
    platform: "Harvard, edX",
    target: "2027-03-15",
    planEnds: "2027-03-08",
    hasPlan: true,
    totalWeeks: 10,
    currentWeek: 1,
    progressPct: 10,
    hoursPerWeek: "~4½ h",
    sessionsPerWeek: 4,
  },
  {
    id: "g-dbms",
    type: "exam",
    title: "Prepare for the DBMS mid-semester exam",
    shortTitle: "DBMS mid-semester exam",
    course: "Database Management Systems (CS204)",
    platform: "College course",
    target: "2026-11-05",
    hasPlan: false,
    examDate: "2026-11-05",
    revisionHours: 6,
    topics: [
      { label: "ER diagrams", selected: true },
      { label: "Normalisation", selected: true },
      { label: "SQL joins", selected: true },
      { label: "Transactions", selected: false },
      { label: "Indexing", selected: false },
    ],
  },
];

export const demoCourses: Course[] = [
  { id: "co-cs50p", name: "CS50’s Introduction to Programming with Python", meta: "edX · self-paced", goalId: "g-cs50p" },
  { id: "co-dbms", name: "Database Management Systems (CS204)", meta: "Northfield Institute of Technology · Semester 3", goalId: "g-dbms" },
];

export const demoMilestones: Milestone[] = [
  { id: "m1", label: "Weeks 0–2", title: "Functions → Loops", due: "2026-11-15" },
  { id: "m2", label: "Weeks 3–5", title: "Exceptions → Unit tests", due: "2026-12-13" },
  { id: "m3", label: "Weeks 6–8", title: "File I/O → OOP", due: "2027-01-24" },
  { id: "m4", label: "Week 9 + project", title: "Et cetera · Final project", due: "2027-03-08" },
];

/* ---------- Sessions ---------- */

let taskSeq = 0;
const t = (label: string, detail?: string, done = false): Task => ({ id: `t${++taskSeq}`, label, detail, done });

type Seed = Omit<StudySession, "id" | "goalId" | "notes" | "countsToward" | "tasks" | "objective"> &
  Partial<Pick<StudySession, "tasks" | "objective" | "countsToward" | "notes">>;

const LECTURES = [
  "Functions, variables",
  "Conditionals",
  "Loops",
  "Exceptions",
  "Libraries",
  "Unit tests",
  "File I/O",
  "Regular expressions",
  "Object-oriented programming",
  "Et cetera",
];

function weekOneAndTwo(): Seed[] {
  return [
    {
      title: "Lecture 1 · Functions, variables",
      short: "Lecture 1 · Functions",
      summary: "Watch lecture · take notes",
      objective: "Understand how functions take input and return values, and use f-strings to format output.",
      week: 1,
      date: "2026-10-26",
      start: "19:00",
      minutes: 60,
      priority: "Core",
      status: "completed",
      studiedMinutes: 58,
      notes: "def main(): input → return value. f\"{name}\" formats. Ask: why does print return None?",
      tasks: [
        t("Watch Lecture 1 (first half)", "Functions, print, input, str", true),
        t("Write along in your editor", "hello.py — return values, f-strings", true),
        t("Note 3 things to revisit", "For Problem Set 1 on Thursday", true),
      ],
    },
    {
      title: "Lecture 1 · part 2 + shorts",
      short: "Lecture 1 · part 2",
      summary: "Return values, f-strings",
      objective: "Finish the second half of Lecture 1 and the shorts on return values and f-strings.",
      week: 1,
      date: "2026-10-28",
      start: "19:00",
      minutes: 90,
      priority: "Core",
      status: "missed",
      tasks: [t("Watch Lecture 1 (second half)", "Return values, scope"), t("Shorts: return values"), t("Shorts: f-strings")],
    },
    {
      title: "Week 1 · Problem Set 1",
      short: "Problem Set 1",
      summary: "Indoor Voice, Playback Speed, Making Faces",
      objective:
        "Finish “Indoor Voice” and “Playback Speed” using what you learned about functions and strings in Lecture 1.",
      week: 1,
      date: "2026-10-29",
      start: "20:00",
      minutes: 60,
      priority: "High",
      status: "planned",
      countsToward: "Finish Week 1 by 1 Nov",
      tasks: [t("Indoor Voice"), t("Playback Speed"), t("Making Faces")],
    },
    {
      title: "Week 2 · Conditionals",
      short: "Week 2 · Conditionals",
      summary: "Watch lecture, try the examples",
      objective: "Learn if, elif and else, and try the lecture examples in your editor.",
      week: 1,
      date: "2026-10-31",
      start: "10:00",
      minutes: 90,
      priority: "Core",
      status: "planned",
      tasks: [t("Watch Lecture 2"), t("Try the examples"), t("Notes: if, elif and else")],
    },
    {
      title: "Catch-up: Lecture 1 part 2",
      short: "Catch-up: Lecture 1 part 2",
      summary: "Only if accepted",
      objective: "Catch up on the Lecture 1 part 2 session you missed on Wednesday.",
      week: 1,
      date: "2026-11-01",
      start: "10:00",
      minutes: 60,
      priority: "Buffer",
      status: "suggested",
      tasks: [t("Watch Lecture 1 (second half)"), t("Shorts: return values")],
    },
    // Week 2 · 2–8 Nov
    {
      title: "Week 2 · Conditionals",
      short: "Week 2 · Conditionals",
      summary: "Watch Lecture 2 · notes",
      objective: "Use if, elif and else to make decisions in your programs.",
      week: 2,
      date: "2026-11-02",
      start: "19:00",
      minutes: 60,
      priority: "Core",
      status: "planned",
      countsToward: "Finish Week 2 by 8 Nov",
      tasks: [t("Watch Lecture 2"), t("Notes: if, elif and else"), t("Practice: Meal Time")],
    },
    {
      title: "Week 2 · Problem Set 2",
      short: "Problem Set 2",
      summary: "Deep Thought, Home Federal Savings Bank",
      objective: "Apply conditionals to the Problem Set 2 exercises.",
      week: 2,
      date: "2026-11-03",
      start: "19:00",
      minutes: 60,
      priority: "High",
      status: "planned",
      tasks: [t("Deep Thought"), t("Home Federal Savings Bank"), t("File Extensions")],
    },
    {
      title: "Lecture 3 · Loops",
      short: "Lecture 3 · Loops",
      summary: "Watch lecture · while and for",
      objective: "Learn while and for loops, and how lists work.",
      week: 2,
      date: "2026-11-07",
      start: "10:00",
      minutes: 60,
      priority: "Core",
      status: "planned",
      tasks: [t("Watch Lecture 3"), t("Try the loop examples")],
    },
    {
      title: "Buffer / rest",
      short: "Buffer / rest",
      summary: "Free unless you need to catch up",
      objective: "Kept free so a missed session doesn’t push your finish date.",
      week: 2,
      date: "2026-11-08",
      start: "16:00",
      minutes: 60,
      priority: "Buffer",
      status: "buffer",
      tasks: [],
    },
    {
      title: "Lecture 3 · part 2",
      short: "Lecture 3 · part 2",
      summary: "Shorts: lists, dictionaries",
      objective: "Finish Lecture 3 and the shorts on lists and dictionaries.",
      week: 2,
      date: "2026-11-04",
      start: "19:00",
      minutes: 60,
      priority: "Core",
      status: "planned",
      tasks: [t("Lecture 3 (second half)"), t("Shorts: lists"), t("Shorts: dictionaries")],
    },
  ];
}

function laterWeeks(): Seed[] {
  const seeds: Seed[] = [];
  for (let week = 3; week <= PLAN_WEEKS; week++) {
    const monday = addDays(PLAN_START, (week - 1) * 7);
    const lectureIdx = Math.min(LECTURES.length - 1, Math.floor((week - 3) / 2) + 2);
    const isProject = week >= 18;
    const topic = isProject ? "Final project" : LECTURES[lectureIdx];
    const lecture = `Lecture ${lectureIdx + 1}`;
    const base = (date: string, start: string, minutes: number) => ({ week, date, start, minutes });
    seeds.push(
      {
        ...base(monday, "19:00", 60),
        title: isProject ? "Final project · plan" : `${lecture} · ${topic}`,
        short: isProject ? "Final project" : `${lecture} · ${topic}`,
        summary: isProject ? "Scope and milestones" : "Watch lecture · take notes",
        objective: isProject ? "Break the final project into small, testable pieces." : `Learn the core ideas of ${topic.toLowerCase()}.`,
        priority: "Core",
        status: "planned",
        tasks: [t(isProject ? "Write a one-paragraph spec" : `Watch ${lecture}`), t("Take notes")],
      },
      {
        ...base(addDays(monday, 2), "19:00", 60),
        title: isProject ? "Final project · build" : `${lecture} · shorts`,
        short: isProject ? "Final project · build" : `${lecture} · shorts`,
        summary: isProject ? "Build the next piece" : "Shorts · examples",
        objective: isProject ? "Build and test the next piece of your project." : `Work through the ${topic.toLowerCase()} shorts and examples.`,
        priority: "Core",
        status: "planned",
        tasks: [t(isProject ? "Build one feature" : "Watch the shorts"), t("Try the examples")],
      },
      {
        ...base(addDays(monday, 3), "20:00", 60),
        title: isProject ? "Final project · test" : `Week ${week} · Problem Set`,
        short: isProject ? "Final project · test" : `Problem Set ${Math.min(9, lectureIdx + 1)}`,
        summary: isProject ? "Tests and fixes" : "Problem set exercises",
        objective: isProject ? "Write tests and fix what they catch." : `Apply ${topic.toLowerCase()} in the problem set.`,
        priority: "High",
        status: "planned",
        tasks: [t(isProject ? "Write tests" : "Exercise 1"), t(isProject ? "Fix bugs" : "Exercise 2")],
      },
      {
        ...base(addDays(monday, 5), "10:00", 90),
        title: isProject ? "Final project · polish" : `Week ${week} · Practice`,
        short: isProject ? "Final project · polish" : `Week ${week} · Practice`,
        summary: "Review and practice",
        objective: "Review the week and practise anything that felt shaky.",
        priority: "Core",
        status: "planned",
        tasks: [t("Review notes"), t("Practice exercises")],
      },
    );
  }
  return seeds;
}

/** Sample plan. With `start`, every date is shifted so week 1 begins on that Monday. */
export function buildDemoSessions(goalId = "g-cs50p", start: string = PLAN_START): StudySession[] {
  taskSeq = 0;
  const shift = daysBetween(PLAN_START, start);
  const seeds = [...weekOneAndTwo(), ...laterWeeks()].map((s) => ({ ...s, date: addDays(s.date, shift) }));
  return seeds
    .map(
      (s, i): StudySession => ({
        ...s,
        id: `s${i + 1}`,
        goalId,
        notes: s.notes ?? "",
        tasks: s.tasks ?? [],
        objective: s.objective ?? "",
        countsToward: s.countsToward ?? `Finish Week ${s.week} on time`,
      }),
    )
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/* Previous week (19–25 Oct) only has commitments: the plan starts on 26 Oct. */

export const emptyAnswers = (name = ""): OnboardingAnswers => ({
  name,
  college: "",
  year: "",
  degree: "",
  goalType: "",
  goal: "",
  course: "",
  progress: "Finished week 1 of 10",
  target: "",
  hours: "",
  commitments: [],
  times: [],
  sessionLength: 60,
  restDay: "sunday",
});

export const demoAnswers: OnboardingAnswers = {
  name: "Aarav Mehta",
  college: "Northfield Institute of Technology",
  year: "2nd year",
  degree: "B.Tech, Computer Science",
  goalType: "course",
  goal: "Finish CS50’s Introduction to Programming with Python",
  course: "CS50P — Harvard, on edX",
  progress: "Finished week 1 of 10",
  target: "2027-03-15",
  hours: "5-8",
  commitments: demoCommitments,
  times: ["evenings", "weekends"],
  sessionLength: 60,
  restDay: "sunday",
};

export function shiftedMilestones(start: string): Milestone[] {
  const shift = daysBetween(PLAN_START, start);
  return demoMilestones.map((m) => ({ ...m, due: addDays(m.due, shift) }));
}
