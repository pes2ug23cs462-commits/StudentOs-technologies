/* Server-only helpers shared by company tests (/api/partner) and StudentOS careers
   tests (/api/careers): checking coding outputs, shuffling, cleaning a test. */

import { PROBLEMS } from "@/lib/coding/problems";

export type TestQ = { q: string; options: string[]; answer: number };
export type CodeResult = { id: string; title: string; passed: number; total: number; lang: string; code: string };
export const problem = (pid: string) => PROBLEMS.find((p) => p.id === pid);
/** what strict mode can report */
export const BREACHES = ["tab", "fullscreen", "away", "out", "people", "talk", "voice"];
const s = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Same comparison as the coding runner: numbers within 1e-6, arrays and objects by value. */
export function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b || Math.abs(a - b) < 1e-6;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

export const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** MCQs with a right answer, and up to 3 StudentOS coding problems. */
export function cleanQuestions(t: Record<string, unknown>): { questions: TestQ[]; coding: string[] } {
  const questions = (Array.isArray(t.questions) ? t.questions : []).slice(0, 100).map((x) => {
    const q = (x ?? {}) as Record<string, unknown>;
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 6);
    const answer = Math.floor(Number(q.answer));
    return { q: String(q.q ?? "").trim().slice(0, 600), options, answer };
  }).filter((q) => q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length);
  const coding = [...new Set((Array.isArray(t.coding) ? t.coding : []).map((x) => s(x, 60)).filter((x) => problem(x)))].slice(0, 3);
  return { questions, coding };
}

/** The coding problems for the test page: examples with answers, every input, no expected outputs. */
export const codingForPage = (ids: string[]) =>
  ids.map(problem).filter(Boolean).map((c) => ({
    id: c!.id, title: c!.title, level: c!.level, statement: c!.statement, constraints: c!.constraints, params: c!.params, fn: c!.fn, starter: c!.starter,
    examples: c!.tests.slice(0, c!.shown),
    inputs: c!.tests.map((x) => x.args),
  }));

/** Scores the MCQ answers (given in the shuffled order) and the coding outputs sent from the browser. */
export function scoreTest(questions: TestQ[], order: number[], answersIn: unknown, codeIn: unknown, codingIds: string[]) {
  const given = (Array.isArray(answersIn) ? answersIn : []).slice(0, order.length).map((x) => (Number.isInteger(x) ? Number(x) : -1));
  let correct = 0;
  order.forEach((qi, k) => {
    if (questions[qi] && given[k] === questions[qi].answer) correct++;
  });
  const sent = (Array.isArray(codeIn) ? codeIn : []).map((x) => (x ?? {}) as Record<string, unknown>);
  const coding: CodeResult[] = codingIds.filter((x) => problem(x)).map((pid) => {
    const pr = problem(pid)!;
    const c = sent.find((x) => x.id === pid);
    const outs = Array.isArray(c?.outputs) ? (c!.outputs as unknown[]) : [];
    const passed = pr.tests.filter((x, i) => i < outs.length && same(outs[i], x.expected)).length;
    return { id: pid, title: pr.title, passed, total: pr.tests.length, lang: c?.lang === "python" ? "python" : "javascript", code: String(c?.code ?? "").slice(0, 8000) };
  });
  return { given, correct, coding };
}

export const cleanWarnings = (v: unknown, n = 10) => (Array.isArray(v) ? v : []).map((w) => s(w, 12)).filter((w) => BREACHES.includes(w)).slice(0, n);
