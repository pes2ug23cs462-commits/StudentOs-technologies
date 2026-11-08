/* POST /api/mock-test  (Premium)
   { subject, topics?, level, count, profile? }
     → { questions: [{ q, options[4], answer, topic, explain }] }
   Questions are written in batches so long tests stay reliable, and the
   options are shuffled here so the right answer isn’t always in one place. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LEVELS: Record<string, string> = {
  beginner: "easy (basic definitions and direct concepts)",
  intermediate: "medium (standard college exam and placement-test level)",
  advanced: "hard (tricky applications, multi-step problems and close options)",
};

type Raw = { q?: unknown; options?: unknown; answer?: unknown; topic?: unknown; explain?: unknown };
type Q = { q: string; options: string[]; answer: number; topic: string; explain: string };

function parse(raw: string): Raw[] {
  const a = raw.indexOf("[");
  const b = raw.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  try {
    const j = JSON.parse(raw.slice(a, b + 1));
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function clean(x: Raw): Q | null {
  const q = s(x.q, 400);
  const options = (Array.isArray(x.options) ? x.options : []).map((o) => s(o, 160)).filter(Boolean);
  const answer = Number(x.answer);
  if (q.length < 8 || options.length !== 4 || new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  // shuffle options and move the answer with them
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return { q, options: order.map((k) => options[k]), answer: order.indexOf(answer), topic: s(x.topic, 40) || "General", explain: s(x.explain, 400) };
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!(await isPremium(uid))) return NextResponse.json({ error: "premium" }, { status: 402 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subject = s(b.subject, 80);
  if (!subject) return NextResponse.json({ error: "failed" }, { status: 400 });
  const topics = s(b.topics, 300);
  const level = LEVELS[String(b.level)] ? String(b.level) : "intermediate";
  const count = Math.min(30, Math.max(5, Number(b.count) || 10));
  const profile = s(b.profile, 300);

  const out: Q[] = [];
  const seen = new Set<string>();
  try {
    for (let round = 0; round < 4 && out.length < count; round++) {
      const need = Math.min(15, count - out.length);
      const prompt = `You are an expert exam setter in India. Write ${need} multiple-choice questions for a mock test.
Subject: ${subject}
${topics ? `Only these topics: ${topics}\n` : ""}Difficulty: ${LEVELS[level]}
Student: ${profile || "college student"}
${out.length ? `Do not repeat these questions: ${out.map((x) => x.q.slice(0, 60)).join(" | ")}\n` : ""}
Rules: each question has exactly 4 short options and exactly one correct option; cover different topics of the subject; the "topic" is a short sub-topic name (1–3 words) used to find weak areas, reuse the same names for the same sub-topic; "explain" says in 1–2 sentences why the answer is right. Use plain text, no markdown.
Reply with JSON only: [{"q":"question","options":["a","b","c","d"],"answer":0,"topic":"sub-topic","explain":"why"}]`;
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 4000, temperature: 0.6 });
      for (const r of parse(text)) {
        const q = clean(r);
        if (!q || seen.has(q.q.toLowerCase())) continue;
        seen.add(q.q.toLowerCase());
        out.push(q);
        if (out.length >= count) break;
      }
    }
    if (out.length < Math.min(5, count)) return NextResponse.json({ error: "failed" }, { status: 502 });
    return NextResponse.json({ questions: out });
  } catch (e) {
    if (out.length >= Math.min(5, count)) return NextResponse.json({ questions: out });
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
