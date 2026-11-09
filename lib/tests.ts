/* Premium · AI mock tests: types, analytics and the call to /api/mock-test. */

import { postAi } from "./assistant";
import type { AppState } from "./store";

export type TestLevel = "beginner" | "intermediate" | "advanced";
export type TestQuestion = { q: string; options: string[]; answer: number; topic: string; explain: string };

export interface TestRecord {
  id: string;
  at: number;
  subject: string;
  /** topics the student asked for (empty = whole subject) */
  topics?: string;
  level: TestLevel;
  total: number;
  score: number;
  /** time allowed and time used, in seconds */
  limit: number;
  used: number;
  /** right / total per topic */
  byTopic: Record<string, { right: number; total: number }>;
  /** questions and answers, kept only for the latest few tests */
  review?: { questions: TestQuestion[]; answers: (number | null)[] };
}

export const LEVEL_LABEL: Record<TestLevel, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
export const SECONDS_PER_Q: Record<TestLevel, number> = { beginner: 75, intermediate: 60, advanced: 50 };
export const MAX_TESTS = 40;
export const KEEP_REVIEW = 5;

export const pct = (r: { score: number; total: number }) => (r.total ? Math.round((r.score / r.total) * 100) : 0);

/** Saves a new test at the top of the list, keeping full questions only for the latest few. */
export function addTest(list: TestRecord[], rec: TestRecord) {
  return [rec, ...list].slice(0, MAX_TESTS).map((t, i) => (i < KEEP_REVIEW ? t : { ...t, review: undefined }));
}

/** Subjects to suggest: the student's goals, their courses and degree. */
export function suggestSubjects(state: AppState) {
  const out = [
    ...(state.goals ?? []).map((g) => g.title),
    ...(state.learning?.catalog ?? []).map((c) => c.title),
    ...(state.setup?.skills.familiar ?? []),
    state.setup?.academic.field ?? "",
  ];
  return [...new Set(out.map((s) => s.trim()).filter((s) => s && s.length < 60))].slice(0, 8);
}

/** Placement-test sections every student can practise, whatever their degree. */
export const GENERAL_SUBJECTS = [
  { subject: "Quantitative aptitude", label: "Aptitude" },
  { subject: "Logical reasoning", label: "Logical Reasoning" },
  { subject: "English and verbal ability", label: "English & Verbal" },
  { subject: "General awareness", label: "General Awareness" },
];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const testsFor = (list: TestRecord[], subject: string) => list.filter((t) => same(t.subject, subject));

/** Topic accuracy within one subject, grouped into strengths (≥75%), average and weak (<50%). */
export function subjectTopics(list: TestRecord[], subject: string) {
  const map = new Map<string, { topic: string; right: number; total: number }>();
  for (const t of testsFor(list, subject))
    for (const [k, v] of Object.entries(t.byTopic)) {
      const key = k.trim().toLowerCase();
      const cur = map.get(key) ?? { topic: k.trim(), right: 0, total: 0 };
      map.set(key, { ...cur, right: cur.right + v.right, total: cur.total + v.total });
    }
  const topics = [...map.values()].map((x) => ({ ...x, acc: Math.round((x.right / x.total) * 100) }));
  const tests = testsFor(list, subject);
  return {
    score: tests.length ? Math.round(tests.reduce((a, t) => a + pct(t), 0) / tests.length) : 0,
    strong: topics.filter((x) => x.acc >= 75),
    average: topics.filter((x) => x.acc >= 50 && x.acc < 75),
    weak: topics.filter((x) => x.acc < 50).sort((a, b) => a.acc - b.acc),
  };
}

/** "18h 40m" style total. */
export function practiceTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export type TopicStat = { topic: string; right: number; total: number; acc: number };

/** Progress across every saved test. Null when there are none. */
export function testAnalytics(list: TestRecord[]) {
  if (!list.length) return null;
  const scores = list.map(pct);
  const topics = new Map<string, { right: number; total: number }>();
  const subjects = new Map<string, { sum: number; n: number }>();
  let questions = 0;
  let time = 0;
  for (const t of list) {
    questions += t.total;
    time += t.used;
    for (const [k, v] of Object.entries(t.byTopic)) {
      const key = k.trim().toLowerCase();
      const cur = topics.get(key) ?? { right: 0, total: 0 };
      topics.set(key, { right: cur.right + v.right, total: cur.total + v.total });
    }
    const s = subjects.get(t.subject) ?? { sum: 0, n: 0 };
    subjects.set(t.subject, { sum: s.sum + pct(t), n: s.n + 1 });
  }
  const label = (key: string) => {
    for (const t of list) for (const k of Object.keys(t.byTopic)) if (k.trim().toLowerCase() === key) return k.trim();
    return key;
  };
  const topicList: TopicStat[] = [...topics.entries()].map(([k, v]) => ({ topic: label(k), ...v, acc: Math.round((v.right / v.total) * 100) }));
  return {
    tests: list.length,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    best: Math.max(...scores),
    questions,
    secsPerQ: questions ? Math.round(time / questions) : 0,
    /** oldest → newest, last 12 */
    trend: list.slice(0, 12).reverse().map((t) => ({ at: t.at, value: pct(t), subject: t.subject })),
    weak: topicList.filter((t) => t.total >= 2 && t.acc < 60).sort((a, b) => a.acc - b.acc).slice(0, 6),
    strong: topicList.filter((t) => t.total >= 2 && t.acc >= 80).sort((a, b) => b.acc - a.acc).slice(0, 6),
    topics: topicList.sort((a, b) => b.total - a.total).slice(0, 10),
    subjects: [...subjects.entries()].map(([subject, v]) => ({ subject, avg: Math.round(v.sum / v.n), n: v.n })).sort((a, b) => b.n - a.n).slice(0, 6),
  };
}

export async function makeTest(o: { subject: string; topics?: string; level: TestLevel; count: number; profile: string }) {
  const j = await postAi<{ questions?: TestQuestion[] }>("/api/mock-test", o);
  return j.questions ?? [];
}
