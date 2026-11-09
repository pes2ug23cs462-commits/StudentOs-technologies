/* Coding practice: types shared by the problems, the runner and the pages. */

export type Lang = "python" | "javascript";
export type Level = "Easy" | "Medium" | "Hard";

export interface Problem {
  id: string;
  num: number;
  title: string;
  level: Level;
  topics: string[];
  statement: string;
  constraints: string[];
  /** function name per language */
  fn: Record<Lang, string>;
  params: string[];
  starter: Record<Lang, string>;
  /** how many of the first tests are visible examples */
  shown: number;
  tests: { args: unknown[]; expected: unknown }[];
  /** written by the AI for this student */
  ai?: boolean;
}

export type CaseResult = { ok: boolean; args: unknown[]; expected: unknown; got?: unknown; error?: string; logs: string; ms: number };
export type RunResult = { status: "ok" | "error" | "timeout"; cases: CaseResult[]; error?: string };

/** Saved work for one problem in one language, with what the AI and pastes added. */
export interface Draft {
  code: string;
  /** lines the AI wrote that the student inserted */
  ai: string[];
  /** lines pasted from outside StudentOS */
  paste: string[];
  /** characters the student typed themselves */
  typed: number;
  /** time spent, ms */
  ms: number;
}

export interface Solved {
  at: number;
  lang: Lang;
  /** final AI share, 0–100 */
  ai: number;
}

export interface CodingState {
  solved: Record<string, Solved>;
  /** problem id → submissions made */
  attempts: Record<string, number>;
  /** `${problemId}:${lang}` → draft */
  drafts: Record<string, Draft>;
  lang?: Lang;
  /** bookmarked problem ids */
  saved?: string[];
  /** problems the AI wrote for this student (newest last) */
  custom?: Problem[];
}

export const LANG_LABEL: Record<Lang, string> = { python: "Python 3", javascript: "JavaScript" };
/** Most of the code must be the student’s own. */
export const AI_LIMIT = 50;

export const LEVEL_TONE: Record<Level, string> = { Easy: "text-emerald-400", Medium: "text-amber-300", Hard: "text-rose-400" };
