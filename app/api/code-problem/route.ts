/* POST /api/code-problem  (Free and Premium)
   { level, topic?, profile?, avoid: string[] }
     → { title, level, topics[], statement, constraints[], params[], fn: { python, javascript },
         reference, tests: [{ args }], examples: [{ args, expected }] }
   Writes a new, original coding problem for one student. The browser runs the
   JavaScript `reference` on every test to get the expected outputs and checks
   them against the AI's own examples, so a wrong problem never reaches the student.
   The reference solution is not kept anywhere. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const ident = (v: unknown, py: boolean) => {
  const x = String(v ?? "").trim();
  return py ? (/^[a-z_][a-z0-9_]{1,40}$/.test(x) ? x : "") : /^[a-zA-Z_$][\w$]{1,40}$/.test(x) ? x : "";
};
const LEVELS = ["Easy", "Medium", "Hard"];

function json<T>(raw: string): T | null {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

type Raw = {
  title?: unknown;
  level?: unknown;
  topics?: unknown;
  statement?: unknown;
  constraints?: unknown;
  params?: unknown;
  fn_python?: unknown;
  fn_javascript?: unknown;
  reference_javascript?: unknown;
  tests?: unknown;
  examples?: unknown;
};

/** Only plain JSON values (numbers, strings, booleans, nested lists) as arguments and results. */
const plain = (v: unknown, depth = 0): boolean =>
  depth < 4 && (typeof v === "number" ? Number.isFinite(v) : typeof v === "string" ? v.length <= 2000 : typeof v === "boolean" ? true : Array.isArray(v) ? v.length <= 2000 && v.every((x) => plain(x, depth + 1)) : false);

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const level = LEVELS.includes(String(b.level)) ? String(b.level) : "Easy";
  const topic = s(b.topic, 60);
  const avoid = (Array.isArray(b.avoid) ? b.avoid : []).map((x) => s(x, 60)).filter(Boolean).slice(0, 60);
  const seed = Math.random().toString(36).slice(2, 8);

  const prompt = `You write ORIGINAL coding interview practice problems for an Indian college student (${s(b.profile, 200) || "engineering student"}).
Write ONE new ${level} problem${topic ? ` on the topic "${topic}"` : ""}. Make it different from these problems the student already has: ${avoid.join("; ") || "none"}.
Make it fresh (variation id ${seed}): you can use a small real-life story (college, cricket scores, a canteen, train tickets, marks) but the task must be a clear algorithm problem.

Rules:
- The solution is ONE function. Arguments and the return value are only integers, strings, booleans, or lists of those (lists may be nested). No floats, no dicts, no classes, no printing.
- Exactly one correct output for every input (if several answers could be valid, define a rule that makes it unique, e.g. "smallest index first").
- "reference_javascript": a correct, efficient JavaScript function named exactly like fn_javascript. Plain JS, no imports.
- "tests": 10 inputs as argument lists, from small to large, including edge cases (empty or single element where allowed). Keep each list ≤ 200 items.
- "examples": the first 3 tests again, with the expected output you are sure of, and they must be what reference_javascript returns.
- fn_python is snake_case, fn_javascript is camelCase, params are short lowercase names.
- statement: 2–4 sentences, plain text. constraints: 2–4 short lines.
Reply with JSON only:
{"title":"...","level":"${level}","topics":["..."],"statement":"...","constraints":["..."],"params":["..."],"fn_python":"...","fn_javascript":"...","reference_javascript":"function name(...) { ... }","tests":[[arg1, arg2]],"examples":[{"args":[arg1, arg2],"expected":...}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 3000, temperature: 0.8 });
      const r = json<Raw>(text);
      if (!r) continue;
      const params = (Array.isArray(r.params) ? r.params : []).map((p) => ident(p, true)).filter(Boolean).slice(0, 4);
      const py = ident(r.fn_python, true);
      const js = ident(r.fn_javascript, false);
      const reference = String(r.reference_javascript ?? "").slice(0, 4000);
      const tests = (Array.isArray(r.tests) ? r.tests : []).filter((t) => Array.isArray(t) && t.length === params.length && t.every((a) => plain(a))).slice(0, 12) as unknown[][];
      const examples = (Array.isArray(r.examples) ? r.examples : [])
        .map((e) => e as { args?: unknown; expected?: unknown })
        .filter((e) => Array.isArray(e.args) && e.args.length === params.length && e.args.every((a) => plain(a)) && plain(e.expected))
        .slice(0, 3) as { args: unknown[]; expected: unknown }[];
      if (!params.length || !py || !js || !reference.includes(js) || tests.length < 5 || examples.length < 2) continue;
      return NextResponse.json({
        title: s(r.title, 70) || "New problem",
        level,
        topics: (Array.isArray(r.topics) ? r.topics : []).map((t) => s(t, 30)).filter(Boolean).slice(0, 3),
        statement: s(r.statement, 900),
        constraints: (Array.isArray(r.constraints) ? r.constraints : []).map((c) => s(c, 120)).filter(Boolean).slice(0, 5),
        params,
        fn: { python: py, javascript: js },
        reference,
        tests,
        examples,
      });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const c = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: c }, { status: c === "no-key" ? 503 : c === "busy" ? 429 : 502 });
  }
}
