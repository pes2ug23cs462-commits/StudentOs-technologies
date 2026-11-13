/* POST /api/quiz  { text, title, count? }
   Makes a short multiple-choice revision quiz from a student's own notes.
   Returns { questions: [{ q, options[4], answer (0-3), why }] }. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

type Q = { q: string; options: string[]; answer: number; why: string };

function parse(raw: string): Q[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(raw.slice(start, end + 1)) as unknown[];
    return arr
      .map((x) => x as Partial<Q> & { correct?: number })
      .map((x) => ({ q: String(x.q ?? "").trim(), options: (x.options ?? []).map((o) => String(o).trim()).slice(0, 4), answer: Number(x.answer ?? x.correct), why: String(x.why ?? "").trim() }))
      .filter((x) => x.q && x.options.length === 4 && x.options.every(Boolean) && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4);
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { text?: string; title?: string; count?: number };
  const text = String(body.text ?? "").slice(0, 12_000);
  if (text.trim().length < 80) return NextResponse.json({ error: "too-short" }, { status: 400 });
  const count = Math.min(Math.max(Number(body.count) || 5, 3), 8);
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const prompt = `Make ${count} multiple-choice revision questions from these study notes${body.title ? ` ("${String(body.title).slice(0, 100)}")` : ""}.
Rules:
- Use only facts that are in the notes. Test understanding, not trivia like page numbers.
- Each question has exactly 4 short options and one correct answer.
- Write in the same language as the notes.
- Reply with JSON only: an array like [{"q":"...","options":["a","b","c","d"],"answer":0,"why":"one short sentence"}] where "answer" is the index (0-3) of the correct option.

Notes:
"""
${text}
"""`;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text: raw } = await chat([{ role: "user", content: prompt }], { maxTokens: 1800, temperature: 0.3 });
      const qs = parse(raw);
      if (qs.length >= 3) return NextResponse.json({ questions: qs.slice(0, count) });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
