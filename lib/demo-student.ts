/* Demo account: fills a team member's own account with a made-up student, so a college
   can be shown StudentOS with real-looking screens. Every name here is invented, and the
   app shows a "Sample data" band while `demo` is set (components/shell/demo-band.tsx).
   Only emails listed in NEXT_PUBLIC_DEMO_EMAILS see the button (Settings → Account). */

import type { AptitudeAttempt } from "./aptitude";
import { PROBLEMS } from "./coding/problems";
import type { CodingState } from "./coding/types";
import type { InterviewRecord } from "./interview";
import type { SetupData } from "./setup";
import type { AppState } from "./store";
import type { TestRecord } from "./tests";

export const DEMO_EMAILS = (process.env.NEXT_PUBLIC_DEMO_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export const canDemo = (email?: string) => !!email && DEMO_EMAILS.includes(email.toLowerCase());

const DAY = 86_400_000;

/** The parts of the state the demo replaces, so "Remove sample data" can clear exactly these. */
export const DEMO_KEYS = ["tests", "interviews", "coding", "aptitude", "resume"] as const;

export function demoStudent(state: AppState, now = Date.now()): Partial<AppState> {
  const ago = (d: number, h = 18) => now - d * DAY - (24 - h) * 3_600_000;

  const academic: SetupData["academic"] = {
    type: "college",
    college: "Sample Institute of Technology",
    course: "B.E.",
    year: "3rd Year",
    field: "Engineering & Technology",
    specialization: "Computer Science",
    graduation: String(new Date(now).getFullYear() + 2),
  };

  const tests: TestRecord[] = [
    t("Data Structures", "intermediate", 20, 15, 21, { Arrays: [5, 6], "Linked lists": [4, 5], Trees: [3, 5], Stacks: [3, 4] }, ago(2)),
    t("DBMS", "intermediate", 15, 10, 16, { Normalisation: [3, 5], SQL: [5, 6], Transactions: [2, 4] }, ago(6)),
    t("Operating Systems", "beginner", 15, 9, 17, { Scheduling: [3, 5], Memory: [3, 5], Deadlocks: [3, 5] }, ago(11)),
    t("Data Structures", "beginner", 20, 11, 22, { Arrays: [4, 6], "Linked lists": [3, 5], Trees: [2, 5], Stacks: [2, 4] }, ago(19)),
  ];

  const interviews: InterviewRecord[] = [
    iv("Software developer intern", "technical", 72, "Good grasp of basics; explain trade-offs more.", ago(3)),
    iv("Software developer intern", "hr", 78, "Clear and confident. Use one example per answer.", ago(9)),
    iv("Software developer intern", "technical", 58, "Knows the terms; answers need structure.", ago(17)),
  ];

  const picks = [...PROBLEMS.filter((p) => p.level === "Easy").slice(0, 5), ...PROBLEMS.filter((p) => p.level === "Medium").slice(0, 2)];
  const coding: CodingState = {
    solved: Object.fromEntries(picks.map((p, i) => [p.id, { at: ago(1 + i), lang: "python" as const, ai: i % 4 === 0 ? 15 : 0 }])),
    attempts: Object.fromEntries(picks.map((p, i) => [p.id, 1 + (i % 3)])),
    drafts: {},
    lang: "python",
  };

  const aptitude: { attempts: AptitudeAttempt[] } = {
    attempts: [
      ap("mock", 30, 22, ago(1), { percent: [4, 5], profit: [3, 4], speed: [3, 4], series: [4, 5], syllogism: [3, 4], synonyms: [3, 4], errors: [2, 4] }),
      ap("topic", 10, 7, ago(4), { probability: [7, 10] }, "probability"),
      ap("topic", 10, 8, ago(7), { work: [8, 10] }, "work"),
      ap("mock", 30, 17, ago(14), { percent: [3, 5], profit: [2, 4], speed: [2, 4], series: [3, 5], syllogism: [3, 4], synonyms: [2, 4], errors: [2, 4] }),
    ],
  };

  return {
    demo: now,
    profile: { ...state.profile, name: "Ananya Kulkarni (sample)", college: academic.college, degree: "B.E., 3rd Year", year: "3rd year" },
    setup: state.setup ? { ...state.setup, academic } : undefined,
    tests,
    interviews,
    coding,
    aptitude,
    resume: {
      name: "Ananya Kulkarni",
      headline: "Computer Science student · Python, SQL, React",
      email: "ananya.sample@example.com",
      phone: "",
      location: "Vijayapura, Karnataka",
      links: "github.com/sample-student",
      summary: "Third-year CSE student who enjoys building small web apps. Looking for a software developer internship.",
      education: { school: academic.college, degree: "B.E., Computer Science", years: `${new Date(now).getFullYear() - 1} – ${academic.graduation}`, score: "CGPA 8.1 (sample)" },
      skills: "Python, Java, SQL, HTML/CSS, React, Git",
      entryIds: [],
      template: "professional",
    },
  };
}

function t(subject: string, level: TestRecord["level"], total: number, score: number, minutes: number, topics: Record<string, [number, number]>, at: number): TestRecord {
  return {
    id: `demo-t-${at}`,
    at,
    subject,
    level,
    total,
    score,
    limit: total * 60,
    used: minutes * 60,
    byTopic: Object.fromEntries(Object.entries(topics).map(([k, [right, all]]) => [k, { right, total: all }])),
  };
}

function iv(role: string, kind: InterviewRecord["kind"], overall: number, summary: string, at: number): InterviewRecord {
  const qs =
    kind === "hr"
      ? ["Tell me about yourself.", "Describe a time you worked in a team.", "Why do you want this internship?"]
      : ["What is the difference between a process and a thread?", "How does a hash map work?", "Explain normalisation with an example."];
  return {
    id: `demo-i-${at}`,
    at,
    role,
    kind,
    level: "beginner",
    lang: "en",
    style: "neutral",
    questions: qs.map((q) => ({ q, focus: kind === "hr" ? "Communication" : "Fundamentals" })),
    answers: qs.map(() => "(sample answer)"),
    feedback: {
      overall,
      verdict: overall >= 70 ? "Ready with a little more practice" : "Needs more practice",
      summary,
      strengths: kind === "hr" ? ["Clear speaking", "Good examples"] : ["Knows the definitions", "Stays calm"],
      tips: kind === "hr" ? ["Keep answers under 2 minutes", "End with what you learned"] : ["Give one real example per answer", "Say the time and space cost"],
      items: qs.map((_, i) => ({ score: Math.max(30, Math.min(95, overall + (i - 1) * 6)), good: "On topic.", improve: "Add an example.", better: "(sample)" })),
    },
  };
}

function ap(kind: AptitudeAttempt["kind"], total: number, correct: number, at: number, byTopic: AptitudeAttempt["byTopic"], topic?: AptitudeAttempt["topic"]): AptitudeAttempt {
  return { id: `demo-a-${at}`, at, kind, topic, total, correct, secs: total * 55, byTopic };
}
