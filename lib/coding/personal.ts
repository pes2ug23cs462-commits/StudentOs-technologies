"use client";

/* Every student gets their own problems.
   · From the bank: a set picked for this student (seeded by their account), so
     two students rarely see the same list, and never in the same order.
   · New problems written by the AI just for them. The AI's reference solution
     is run in the browser to produce every expected output, and its examples
     must match, otherwise the problem is thrown away. */

import { useMemo } from "react";
import { postAi } from "../assistant";
import { auth } from "../firebase";
import { PROBLEMS } from "./problems";
import { runCode, same } from "./runner";
import type { Level, Problem } from "./types";
import { useCoding } from "./use-coding";

export const PER_STUDENT: Record<Level, number> = { Easy: 7, Medium: 4, Hard: 1 };
export const MAX_CUSTOM = 30;

/** Small seeded random generator (mulberry32). */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** This student's problems from the bank: 7 Easy, 4 Medium, 1 Hard, chosen and ordered by their account. */
export function bankSet(seed: string): Problem[] {
  const r = rng(seed || "student");
  const out: Problem[] = [];
  for (const level of ["Easy", "Medium", "Hard"] as Level[]) {
    const pool = PROBLEMS.filter((p) => p.level === level);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, PER_STUDENT[level]));
  }
  return out;
}

/** The student's list: their bank set first, then the problems the AI wrote for them, numbered 1, 2, 3… */
export function useMyProblems() {
  const { coding, state } = useCoding();
  const seed = auth.currentUser?.uid ?? state.profile.email ?? "student";
  return useMemo(() => {
    const solvedOutside = PROBLEMS.filter((p) => coding.solved[p.id]);
    const set = bankSet(seed);
    // keep problems they already solved or started, even if they're not in their set
    for (const p of solvedOutside) if (!set.some((x) => x.id === p.id)) set.push(p);
    return [...set, ...(coding.custom ?? [])].map((p, i) => ({ ...p, num: i + 1 }));
  }, [seed, coding.custom, coding.solved]);
}

/** Finds a problem by id: the bank or this student's own AI problems. */
export const findProblem = (id: string, custom: Problem[] = []) => PROBLEMS.find((p) => p.id === id) ?? custom.find((p) => p.id === id);

type Generated = {
  title: string;
  level: Level;
  topics: string[];
  statement: string;
  constraints: string[];
  params: string[];
  fn: { python: string; javascript: string };
  reference: string;
  tests: unknown[][];
  examples: { args: unknown[]; expected: unknown }[];
};

/** Asks the AI for a new problem and checks it by running its reference solution. */
export async function generateProblem(o: { level: Level; topic?: string; profile: string; avoid: string[] }): Promise<Problem> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const g = await postAi<Generated>("/api/code-problem", o);
    // examples first (they become the visible cases), then the other tests without repeats
    const key = (a: unknown[]) => JSON.stringify(a);
    const seen = new Set(g.examples.map((e) => key(e.args)));
    const inputs = [...g.examples.map((e) => e.args), ...g.tests.filter((t) => !seen.has(key(t)) && seen.add(key(t)))];
    const res = await runCode("javascript", g.reference, g.fn.javascript, inputs.map((args) => ({ args, expected: undefined })));
    if (res.status !== "ok" || res.cases.some((c) => c.error || c.got === undefined)) continue;
    const ok = g.examples.every((e, i) => same(res.cases[i].got, e.expected));
    if (!ok) continue;
    const id = `ai-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const pyArgs = g.params.join(", ");
    return {
      id,
      num: 0,
      title: g.title,
      level: g.level,
      topics: g.topics.length ? g.topics : [o.topic || "Practice"],
      statement: g.statement,
      constraints: g.constraints,
      fn: g.fn,
      params: g.params,
      starter: {
        python: `def ${g.fn.python}(${pyArgs}):\n    # write your code here\n    pass\n`,
        javascript: `function ${g.fn.javascript}(${pyArgs}) {\n  // write your code here\n}\n`,
      },
      shown: Math.min(3, g.examples.length),
      tests: inputs.map((args, i) => ({ args, expected: res.cases[i].got })),
      ai: true,
    };
  }
  throw new Error("The AI’s problem didn’t pass our checks. Try again.");
}
