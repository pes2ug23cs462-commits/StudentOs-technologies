/* Premium · AI mock interviews: types, role suggestions and the calls to /api/interview. */

import { postAi } from "./assistant";
import { areasFromAcademics } from "./learn";
import type { SetupData } from "./setup";

/** "mixed" and the fresher/experienced levels are kept so older saved interviews still show. */
export type InterviewKind = "technical" | "hr" | "role" | "custom" | "mixed";
export type InterviewLevel = "beginner" | "intermediate" | "advanced" | "fresher" | "experienced";
export type Question = { q: string; focus: string };
export type ItemFeedback = { score: number; good: string; improve: string; better: string };
export type Feedback = { overall: number; verdict: string; summary: string; strengths: string[]; tips: string[]; items: ItemFeedback[] };

export interface InterviewRecord {
  id: string;
  at: number;
  role: string;
  kind: InterviewKind;
  level: InterviewLevel;
  questions: Question[];
  answers: string[];
  feedback: Feedback;
  topics?: string;
}

export const KIND_LABEL: Record<InterviewKind, string> = { technical: "Technical", hr: "Behavioral", role: "Job role", custom: "Custom", mixed: "Mixed" };
export const LEVEL_LABEL: Record<InterviewLevel, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", fresher: "Beginner", experienced: "Intermediate" };

/** Interview readiness and stats from saved interviews (newest first). Null when there are none. */
export function interviewStats(list: InterviewRecord[]) {
  if (!list.length) return null;
  const scores = list.map((x) => x.feedback.overall);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const recent = scores.slice(0, 3);
  return {
    taken: list.length,
    avg,
    best: Math.max(...scores),
    readiness: Math.round(recent.reduce((a, b) => a + b, 0) / recent.length),
    improvement: list.length > 1 ? scores[0] - scores[scores.length - 1] : null,
  };
}
export const MAX_SAVED = 12;

const ROLES: Record<string, string[]> = {
  tech: ["Software developer intern", "Frontend developer", "Python developer"],
  data: ["Data analyst intern", "Business analyst"],
  commerce: ["Accounts executive", "Financial analyst intern", "Tax assistant"],
  business: ["Marketing intern", "Business development associate", "HR intern"],
  entrepreneurship: ["Startup founder’s associate"],
  design: ["UI/UX designer intern", "Graphic designer"],
  arts: ["Content writer", "Communications intern"],
  health: ["Lab assistant", "Healthcare operations intern"],
  social: ["NGO program associate"],
  exams: ["Government job interview (general)"],
};

/** Role ideas from the student's degree and interests. */
export function suggestRoles(setup: SetupData | undefined) {
  const areas = [...new Set([...areasFromAcademics(setup), ...(setup?.goals.interests ?? [])])];
  const list = areas.flatMap((a) => ROLES[a] ?? []);
  return [...new Set([...list, "Campus placement (HR round)"])].slice(0, 6);
}

export async function makeQuestions(o: { role: string; kind: InterviewKind; level: InterviewLevel; count: number; profile: string; topics?: string }) {
  const j = await postAi<{ questions?: Question[] }>("/api/interview", { action: "questions", ...o });
  return j.questions ?? [];
}

export async function evaluate(o: { role: string; kind: InterviewKind; level: InterviewLevel; topics?: string; items: { q: string; a: string }[] }) {
  return postAi<Feedback>("/api/interview", { action: "evaluate", ...o });
}
