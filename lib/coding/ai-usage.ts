/* The 50% AI rule.
   Every line the student inserts from the AI helper is remembered, and so is
   every line pasted in from outside StudentOS. On submit we count how many of
   the final code's real lines (not blank, not comments, not the starter
   signature) came from those sources. The AI checker can raise that number if
   the code looks AI-written; a solution only counts as solved when the final
   AI share is at most AI_LIMIT. */

import { postAi } from "../assistant";
import type { Draft, Lang, Problem } from "./types";

const norm = (l: string) => l.trim().replace(/\s+/g, " ");

/** Lines that count: not empty, not only a comment, not `pass`, not the function signature. */
export function realLines(code: string, lang: Lang, p: Problem) {
  const sig = lang === "python" ? `def ${p.fn.python}(` : `function ${p.fn.javascript}(`;
  return code
    .split("\n")
    .map(norm)
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("//") && l !== "pass" && l !== "}" && l !== "{" && !l.startsWith(sig));
}

/** Lines of a snippet worth remembering (same rules, without the signature check). */
export const snippetLines = (text: string) =>
  text
    .split("\n")
    .map(norm)
    .filter((l) => l.length > 1 && !l.startsWith("#") && !l.startsWith("//") && l !== "pass" && l !== "}");

/** Share of the code (0–100) that came from the AI helper and from pastes. */
export function trackedShare(d: Draft, lang: Lang, p: Problem) {
  const lines = realLines(d.code, lang, p);
  if (!lines.length) return { ai: 0, paste: 0, total: 0, lines: 0 };
  const ai = new Set(d.ai);
  const paste = new Set(d.paste);
  let a = 0;
  let q = 0;
  for (const l of lines) {
    if (ai.has(l)) a++;
    else if (paste.has(l)) q++;
  }
  const pct = (n: number) => Math.round((n / lines.length) * 100);
  return { ai: pct(a), paste: pct(q), total: pct(a + q), lines: lines.length };
}

export type HelpMode = "hint" | "explain" | "code";
export type HelpReply = { text: string; code?: string };
export type CheckReply = { estimate: number; reasons: string[]; time: string; space: string; review: string[] };

export async function askCodeHelp(o: { mode: HelpMode; problem: Problem; lang: Lang; code: string; failing?: string; question?: string }) {
  return postAi<HelpReply>("/api/code-ai", {
    action: "help",
    mode: o.mode,
    lang: o.lang,
    code: o.code,
    failing: o.failing,
    question: o.question,
    problem: { title: o.problem.title, statement: o.problem.statement, signature: o.problem.starter[o.lang].split("\n")[0] },
  });
}

export async function checkCode(o: { problem: Problem; lang: Lang; code: string; tracked: number; typed: number; pasted: number; aiLines: number; minutes: number }) {
  return postAi<CheckReply>("/api/code-ai", {
    action: "check",
    lang: o.lang,
    code: o.code,
    problem: { title: o.problem.title, statement: o.problem.statement },
    telemetry: { tracked: o.tracked, typed: o.typed, pasted: o.pasted, aiLines: o.aiLines, minutes: o.minutes },
  });
}
