/* Premium · AI mock interviews: types, role suggestions and the calls to /api/interview. */

import { postAi } from "./assistant";
import { areasFromAcademics } from "./learn";
import type { SetupData } from "./setup";

/** "mixed" and the fresher/experienced levels are kept so older saved interviews still show. */
export type InterviewKind = "coding" | "technical" | "hr" | "role" | "custom" | "mixed";
export type InterviewLevel = "beginner" | "intermediate" | "advanced" | "fresher" | "experienced";
export type Question = { q: string; focus: string };
/** Language the interviewer speaks. */
export type InterviewLang = "en" | "hi";
/** How the interviewer behaves. */
export type InterviewStyle = "friendly" | "neutral" | "tough";
export const STYLE_LABEL: Record<InterviewStyle, string> = { friendly: "Friendly", neutral: "Neutral", tough: "Tough" };
export const LANG_LABEL: Record<InterviewLang, string> = { en: "English", hi: "Hindi" };
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
  lang?: InterviewLang;
  style?: InterviewStyle;
  /** coding rounds only */
  coding?: CodingReport;
}

export const KIND_LABEL: Record<InterviewKind, string> = { coding: "Coding", technical: "Technical", hr: "Behavioural", role: "Role-based", custom: "Custom", mixed: "Mixed" };
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

export async function makeQuestions(o: { role: string; kind: InterviewKind; level: InterviewLevel; count: number; profile: string; topics?: string; lang?: InterviewLang; style?: InterviewStyle }) {
  const j = await postAi<{ questions?: Question[] }>("/api/interview", { action: "questions", ...o });
  return j.questions ?? [];
}

export async function evaluate(o: { role: string; kind: InterviewKind; level: InterviewLevel; topics?: string; lang?: InterviewLang; style?: InterviewStyle; items: { q: string; a: string }[] }) {
  return postAi<Feedback>("/api/interview", { action: "evaluate", ...o });
}

/* ---------- coding rounds ---------- */

export type ChatLine = { who: "asha" | "you"; text: string; t: number };
/** Something that happened in a coding round, at t seconds from the start. */
export type RoundEvent = { t: number; ok: boolean; text: string };
export type RubricItem = { key: "problem" | "communication" | "quality" | "testing"; label: string; score: number; note: string };
export type Moment = { t: number; ok: boolean; text: string; sub: string };
export type PracticeItem = { title: string; detail: string; minutes: number; problemId?: string };

export interface CodingReport {
  problemId: string;
  title: string;
  lang: "python" | "javascript";
  code: string;
  passed: number;
  total: number;
  seconds: number;
  rubric: RubricItem[];
  moments: Moment[];
  practice: PracticeItem[];
  transcript: ChatLine[];
  /** from the camera, measured on the student's device */
  presence?: { facing: number; away: number; out: number };
  /** a recording was saved on the device that took the round */
  recorded?: boolean;
  /** round time (s) when the recording started */
  recStart?: number;
}

export const RUBRIC_LABEL: Record<RubricItem["key"], string> = { problem: "Problem solving", communication: "Communication", quality: "Code quality", testing: "Testing" };

type ProblemBrief = { title: string; statement: string; level: string };

/** Asha's next line in a coding round. */
export async function codeChat(o: { problem: ProblemBrief; code: string; lang: string; stage: string; ask: "reply" | "hint"; history: ChatLine[]; style?: InterviewStyle; ilang?: InterviewLang }) {
  const j = await postAi<{ reply?: string }>("/api/interview", { action: "code-chat", ...o, history: o.history.slice(-12) });
  return (j.reply ?? "").trim();
}

/** Two follow-up questions about the student's solution. */
export async function codeFollowups(o: { problem: ProblemBrief; code: string; lang: string; ilang?: InterviewLang }) {
  const j = await postAi<{ questions?: string[] }>("/api/interview", { action: "code-followups", ...o });
  return (j.questions ?? []).filter(Boolean).slice(0, 2);
}

export async function codeEvaluate(o: { problem: ProblemBrief; code: string; lang: string; passed: number; total: number; seconds: number; level: InterviewLevel; style?: InterviewStyle; ilang?: InterviewLang; history: ChatLine[]; events: RoundEvent[]; candidates: { id: string; title: string; level: string; topics: string[] }[] }) {
  return postAi<{ overall: number; verdict: string; summary: string; rubric: { key: RubricItem["key"]; score: number; note: string }[]; moments: Moment[]; practice: PracticeItem[] }>("/api/interview", { action: "code-evaluate", ...o, history: o.history.slice(-30), events: o.events.slice(0, 30) });
}
