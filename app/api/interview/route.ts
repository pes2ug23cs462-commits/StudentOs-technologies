/* POST /api/interview  (Premium)
   { action: "questions", role, kind, level, count, profile? }
     → { questions: [{ q, focus }] }
   { action: "evaluate", role, kind, level, items: [{ q, a }] }
     → { overall, verdict, summary, strengths[], tips[], items: [{ score, good, improve, better }] } */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const KINDS: Record<string, string> = {
  technical: "technical questions on the core skills, concepts and problem solving this role needs",
  hr: "behavioral and HR questions (introduce yourself, strengths, communication, teamwork, leadership, conflict, situational judgement, goals)",
  role: "a real job-role interview: 1–2 HR questions, then mostly role-specific questions on day-to-day work, tools and scenarios, ending with one situational question",
  custom: "questions only on the topics the candidate chose",
  mixed: "a realistic mix: start with 1–2 HR questions, then mostly technical, end with one situational question",
};

function json<T>(raw: string, open: "{" | "["): T | null {
  const close = open === "{" ? "}" : "]";
  const a = raw.indexOf(open);
  const b = raw.lastIndexOf(close);
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!(await isPremium(uid))) return NextResponse.json({ error: "premium" }, { status: 402 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = s(b.role, 80) || "fresher (general)";
  const kind = KINDS[String(b.kind)] ? String(b.kind) : "mixed";
  const LEVELS: Record<string, string> = {
    beginner: "a beginner (student or fresher); keep questions basic and friendly",
    intermediate: "at an intermediate level (has done projects or an internship); ask standard placement-level questions",
    advanced: "advanced; ask deeper, tougher questions with follow-up style reasoning",
    experienced: "at an intermediate level (has done projects or an internship); ask standard placement-level questions",
  };
  const level = LEVELS[String(b.level)] ?? LEVELS.beginner;
  const topics = s(b.topics, 300);
  const kindText = kind === "custom" ? `${KINDS.custom}: ${topics || "general interview topics for this role"}` : KINDS[kind];

  try {
    if (b.action === "questions") {
      const count = Math.min(10, Math.max(3, Number(b.count) || 5));
      const prompt = `You are a friendly but realistic interviewer in India. Interview a candidate who is ${level}, for the role: "${role}".
Candidate background: ${s(b.profile, 400) || "college student"}.
Interview type: ${kindText}.

Write exactly ${count} interview questions, in the order you would ask them. Questions must be clear, one at a time, answerable in 1–2 minutes, and right for this role and level (real questions Indian companies and campus placements ask). No multi-part essays.
Reply with JSON only: [{"q":"question","focus":"what it tests, 2–4 words"}]`;
      for (let i = 0; i < 2; i++) {
        const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1500, temperature: 0.7 });
        const list = (json<{ q?: unknown; focus?: unknown }[]>(text, "[") ?? []).map((x) => ({ q: s(x.q, 300), focus: s(x.focus, 40) })).filter((x) => x.q.length > 8);
        if (list.length >= Math.min(3, count)) return NextResponse.json({ questions: list.slice(0, count) });
      }
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    if (b.action === "evaluate") {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10).map((x) => x as { q?: unknown; a?: unknown }).map((x) => ({ q: s(x.q, 300), a: s(x.a, 2500) }));
      if (!items.length) return NextResponse.json({ error: "failed" }, { status: 400 });
      const prompt = `You are an experienced interviewer giving feedback after a mock interview for the role "${role}". The candidate is ${level}. Interview type: ${kindText}.
Answers may be in English, Hindi or Hinglish and may come from speech-to-text (ignore small transcription errors). An empty answer means the candidate skipped it.

${items.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a || "(skipped)"}`).join("\n\n")}

Score each answer 0–10 fairly (a skipped answer is 0; a correct but very short answer is 4–6; a clear, structured, specific answer with an example is 8–10). Be encouraging but honest and specific.
Reply with JSON only:
{"overall": 0-100, "verdict": "2–4 words, e.g. Almost ready", "summary": "2 sentences", "strengths": ["...", "..."], "tips": ["3 most useful things to improve"],
 "items": [{"score": 0-10, "good": "one sentence on what worked", "improve": "one sentence on what to improve", "better": "a strong model answer in 2–4 sentences, in English"}]}
"items" must have exactly ${items.length} entries in order.`;
      for (let i = 0; i < 2; i++) {
        const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 3500, temperature: 0.3 });
        const r = json<{ overall?: unknown; verdict?: unknown; summary?: unknown; strengths?: unknown[]; tips?: unknown[]; items?: { score?: unknown; good?: unknown; improve?: unknown; better?: unknown }[] }>(text, "{");
        if (!r || !Array.isArray(r.items) || r.items.length < items.length) continue;
        const out = {
          overall: Math.max(0, Math.min(100, Math.round(Number(r.overall) || 0))),
          verdict: s(r.verdict, 40),
          summary: s(r.summary, 400),
          strengths: (r.strengths ?? []).map((x) => s(x, 200)).filter(Boolean).slice(0, 3),
          tips: (r.tips ?? []).map((x) => s(x, 200)).filter(Boolean).slice(0, 3),
          items: r.items.slice(0, items.length).map((x) => ({ score: Math.max(0, Math.min(10, Math.round(Number(x.score) || 0))), good: s(x.good, 300), improve: s(x.improve, 300), better: s(x.better, 700) })),
        };
        return NextResponse.json(out);
      }
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
    return NextResponse.json({ error: "failed" }, { status: 400 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
