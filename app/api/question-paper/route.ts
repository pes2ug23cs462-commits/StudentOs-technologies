/* POST /api/question-paper  (free, normal AI limit; each section is one AI message)
   { subject, topics?, level, kind: "mcq" | "short" | "long", count, marks, profile?, avoid?: string[] }
     → { questions: [{ q, options?[4], answer: number | string }] }
   One section of an exam-style question paper. The page asks for the sections in
   parallel, so a 100-mark paper never gets cut off half way. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);
const LEVELS: Record<string, string> = {
  beginner: "BEGINNER: direct definitions, basic concepts and simple one-step problems",
  intermediate: "INTERMEDIATE: standard university semester-exam level, explain/compare/apply, routine problems",
  expert: "EXPERT: hard, analytical and multi-step questions, tricky cases, design and derivation, like the toughest university or GATE-style questions",
};
const KIND: Record<string, (n: number, m: number) => string> = {
  mcq: (n, m) =>
    `${n} multiple-choice questions, ${m} mark each. Each has exactly 4 options and one correct option. Reply as JSON: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0}]} where answer is the index (0-3) of the correct option.`,
  short: (n, m) =>
    `${n} short-answer questions, ${m} marks each (answer expected in about ${m * 25}-${m * 35} words: define, list, explain briefly or a short problem). Reply as JSON: {"questions":[{"q":"...","answer":"model answer: the key points an examiner looks for, 2-5 short lines"}]}`,
  long: (n, m) =>
    `${n} long-answer questions, ${m} marks each. A question may have parts written as (a) and (b) with their marks, adding up to ${m}. Reply as JSON: {"questions":[{"q":"...","answer":"model answer: the points, steps or derivation an examiner expects, 4-8 short lines"}]}`,
};

function parse(raw: string): unknown[] {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  try {
    const j = a >= 0 && b > a ? JSON.parse(raw.slice(a, b + 1)) : null;
    return Array.isArray(j?.questions) ? j.questions : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subject = s(b.subject, 80);
  if (!subject) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const kind = String(b.kind) in KIND ? String(b.kind) : "short";
  const level = String(b.level) in LEVELS ? String(b.level) : "intermediate";
  const count = Math.min(25, Math.max(1, Math.round(Number(b.count) || 5)));
  const marks = Math.min(20, Math.max(1, Math.round(Number(b.marks) || 1)));
  const topics = s(b.topics, 300);
  const avoid = (Array.isArray(b.avoid) ? b.avoid : []).map((x) => s(x, 120)).filter(Boolean).slice(0, 40);

  const prompt = `You are setting a university exam question paper for an Indian college student (${s(b.profile, 160) || "college student"}).
Subject: ${subject}${topics ? `\nCover these topics, spread evenly: ${topics}` : "\nCover the main syllabus topics of this subject, spread evenly (not all from one topic)."}
Difficulty: ${LEVELS[level]}.
Write ${KIND[kind](count, marks)}
Rules: original questions in clear exam English; no two questions alike${avoid.length ? `; do not repeat these: ${avoid.join(" | ")}` : ""}; no diagrams or images needed to answer; plain text only (write formulas like a^2 + b^2, not LaTeX). Exactly ${count} questions. JSON only.`;

  try {
    let best: { q: string; options?: string[]; answer: number | string }[] = [];
    for (let i = 0; i < 2 && best.length < count; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: kind === "mcq" ? 2200 + count * 60 : 1800 + count * (kind === "long" ? 260 : 140), temperature: 0.7 });
      const got = parse(text)
        .map((x) => {
          const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
          const q = s(o.q ?? o.question, 900);
          if (!q) return null;
          if (kind !== "mcq") return { q, answer: s(o.answer, 1500) };
          const options = (Array.isArray(o.options) ? o.options : []).map((v) => s(v, 200).replace(/^[A-Da-d][).]\s+/, "")).filter(Boolean);
          let answer = Number(o.answer);
          if (!Number.isInteger(answer)) answer = "ABCD".indexOf(String(o.answer).trim().toUpperCase().charAt(0));
          if (options.length !== 4 || answer < 0 || answer > 3) return null;
          return { q, options, answer };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, count);
      if (got.length > best.length) best = got;
    }
    if (!best.length) return NextResponse.json({ error: "failed" }, { status: 502 });
    return NextResponse.json({ questions: best });
  } catch (e) {
    const c = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: c }, { status: c === "no-key" ? 503 : c === "busy" ? 429 : 502 });
  }
}
