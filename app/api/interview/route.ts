/* POST /api/interview  (Premium)
   { action: "questions", role, kind, level, count, profile? }
     → { questions: [{ q, focus }] }
   { action: "evaluate", role, kind, level, items: [{ q, a }] }
     → { overall, verdict, summary, strengths[], tips[], items: [{ score, good, improve, better }] }
   Coding rounds:
   { action: "code-chat", problem, code, lang, stage, ask: "reply"|"hint", history } → { reply }
   { action: "code-followups", problem, code, lang } → { questions[] }
   { action: "code-evaluate", problem, code, lang, passed, total, seconds, history, events, candidates }
     → { overall, verdict, summary, rubric[], moments[], practice[] } */

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
  const quota = await takeQuota(uid);
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
  const hindi = b.lang === "hi";
  const STYLES: Record<string, { ask: string; score: string }> = {
    friendly: { ask: "Be warm and encouraging, like a friendly senior.", score: "Be encouraging; still be honest." },
    neutral: { ask: "Be polite and professional.", score: "Be fair and honest." },
    tough: { ask: "Be a strict, probing panel interviewer: ask precise questions that need specific, well-reasoned answers, including one that challenges a typical answer.", score: "Score strictly, like a tough panel: vague or generic answers get low scores." },
  };
  const style = STYLES[String(b.style)] ?? STYLES.neutral;
  const kindText = kind === "custom" ? `${KINDS.custom}: ${topics || "general interview topics for this role"}` : KINDS[kind];

  try {
    if (b.action === "questions") {
      const count = Math.min(10, Math.max(3, Number(b.count) || 5));
      const prompt = `You are a friendly but realistic interviewer in India. Interview a candidate who is ${level}, for the role: "${role}".
Candidate background: ${s(b.profile, 400) || "college student"}.
Interview type: ${kindText}.
Tone: ${style.ask}

Write exactly ${count} interview questions, in the order you would ask them. Questions must be clear, one at a time, answerable in 1–2 minutes, and right for this role and level (real questions Indian companies and campus placements ask). No multi-part essays.${hindi ? `
Write every question in natural spoken Hindi in Devanagari script, the way an Indian interviewer talks (polite "आप"). Keep common technical words in English letters (e.g. API, database, Excel). Keep each question short, under 200 characters, so it can be read aloud.` : `
Keep each question under 200 characters so it can be read aloud.`}
Reply with JSON only: [{"q":"question","focus":"what it tests, 2–4 words in English"}]`;
      for (let i = 0; i < 2; i++) {
        const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1500, temperature: 0.7 });
        const list = (json<{ q?: unknown; focus?: unknown }[]>(text, "[") ?? []).map((x) => ({ q: s(x.q, 300), focus: s(x.focus, 40) })).filter((x) => x.q.length > 8);
        if (list.length >= Math.min(3, count)) return NextResponse.json({ questions: list.slice(0, count) });
      }
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    if (b.action === "code-chat" || b.action === "code-followups" || b.action === "code-evaluate") {
      const pr = (b.problem ?? {}) as Record<string, unknown>;
      const problem = `"${s(pr.title, 80)}" (${s(pr.level, 10)}): ${s(pr.statement, 700)}`;
      const lang = b.lang === "javascript" ? "JavaScript" : "Python";
      const code = String(b.code ?? "").slice(0, 4000);
      const hist = (Array.isArray(b.history) ? b.history : []).slice(-30).map((x) => x as { who?: unknown; text?: unknown }).map((x) => `${x.who === "you" ? "Candidate" : "Interviewer"}: ${s(x.text, 600)}`).join("\n");
      const speak = hindi ? "Reply in natural spoken Hindi (Devanagari), keeping technical words in English letters." : "Reply in English.";

      if (b.action === "code-chat") {
        const hint = b.ask === "hint";
        const stage = s(b.stage, 20);
        const prompt = `You are Asha, an interviewer running a live coding interview in India. Tone: ${style.ask} The candidate is ${level}.
Problem: ${problem}
Language: ${lang}. Interview stage: ${stage}.
Candidate's current code:
"""
${code || "(empty)"}
"""
Conversation so far:
${hist || "(none)"}

${hint ? "The candidate asked for a hint. Give ONE small hint that moves them forward (a question or a nudge), never the full solution or code." : stage === "intro" ? "Respond to the candidate's approach in 1–2 short sentences: acknowledge it, point out anything important they missed (complexity, edge cases) as a question, then tell them to go ahead and code it." : "Respond to the candidate's last message like a real interviewer in 1–2 short sentences. Ask a short probing question if useful. Never write the solution or code for them."}
${speak} Keep it under 240 characters so it can be read aloud. Reply with JSON only: {"reply":"..."}`;
        for (let i = 0; i < 2; i++) {
          const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 400, temperature: 0.6 });
          const r = json<{ reply?: unknown }>(text, "{");
          const reply = s(r?.reply, 400);
          if (reply) return NextResponse.json({ reply });
        }
        return NextResponse.json({ error: "failed" }, { status: 502 });
      }

      if (b.action === "code-followups") {
        const prompt = `You are a coding interviewer. The candidate solved this problem: ${problem}
Their ${lang} code:
"""
${code}
"""
Write exactly 2 short follow-up questions about THEIR solution, the way interviewers do: one on time/space complexity or a better approach, one on an edge case or what changes if the input changes. ${speak} Each under 200 characters.
Reply with JSON only: ["question 1","question 2"]`;
        for (let i = 0; i < 2; i++) {
          const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 400, temperature: 0.6 });
          const list = (json<unknown[]>(text, "[") ?? []).map((x) => s(x, 300)).filter((x) => x.length > 8);
          if (list.length) return NextResponse.json({ questions: list.slice(0, 2) });
        }
        return NextResponse.json({ error: "failed" }, { status: 502 });
      }

      const passed = Math.max(0, Number(b.passed) || 0);
      const total = Math.max(0, Number(b.total) || 0);
      const mins = Math.round((Number(b.seconds) || 0) / 60);
      const events = (Array.isArray(b.events) ? b.events : []).slice(0, 30).map((x) => x as { t?: unknown; ok?: unknown; text?: unknown }).map((x) => ({ t: Math.max(0, Number(x.t) || 0), ok: !!x.ok, text: s(x.text, 160) }));
      const cands = (Array.isArray(b.candidates) ? b.candidates : []).slice(0, 30).map((x) => x as { id?: unknown; title?: unknown; level?: unknown; topics?: unknown[] }).map((x) => ({ id: s(x.id, 40), line: `${s(x.id, 40)}: ${s(x.title, 60)} (${s(x.level, 10)}; ${(x.topics ?? []).map((t) => s(t, 20)).join(", ")})` }));
      const prompt = `You are an experienced interviewer writing feedback after a live coding round for a candidate who is ${level}. ${style.score}
Problem: ${problem}
Language: ${lang}. Time used: ${mins} min. Hidden + visible tests passed: ${passed} of ${total}.
Final code:
"""
${code || "(empty)"}
"""
Conversation (from speech-to-text, ignore small errors):
${hist || "(none)"}
Events (t = seconds from start):
${events.map((e, i) => `${i}. t=${e.t} ${e.text}`).join("\n") || "(none)"}

Score these 4 areas 0–100 with one short, specific sentence each: problem (understanding, approach, correctness), communication (explaining the plan and thinking aloud), quality (readable, idiomatic code), testing (edge cases, running tests before submitting).
Pick the 4–6 events that mattered most as "moments": keep their t, set ok true if it was a good sign, write "text" (what happened, under 70 characters) and "sub" (why it matters, under 90 characters). Use only events from the list or lines from the conversation; never invent times.
Suggest exactly 3 things to practise next. When a coding problem fits, use one of these ids exactly as "problemId":
${cands.map((c) => c.line).join("\n") || "(none)"}
${hindi ? 'Write "verdict", "summary", notes, moments and practice in simple Hindi (Devanagari), keeping technical words in English letters.' : ""}
Reply with JSON only:
{"overall":0-100,"verdict":"one of: Strong hire, Hire, Lean hire, Lean no hire, No hire","summary":"2 short sentences",
"rubric":[{"key":"problem","score":0,"note":""},{"key":"communication","score":0,"note":""},{"key":"quality","score":0,"note":""},{"key":"testing","score":0,"note":""}],
"moments":[{"t":0,"ok":true,"text":"","sub":""}],
"practice":[{"title":"","detail":"one line","minutes":20,"problemId":"optional"}]}`;
      const ids = new Set(cands.map((c) => c.id));
      for (let i = 0; i < 2; i++) {
        const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 2500, temperature: 0.3 });
        const r = json<{ overall?: unknown; verdict?: unknown; summary?: unknown; rubric?: { key?: unknown; score?: unknown; note?: unknown }[]; moments?: { t?: unknown; ok?: unknown; text?: unknown; sub?: unknown }[]; practice?: { title?: unknown; detail?: unknown; minutes?: unknown; problemId?: unknown }[] }>(text, "{");
        if (!r || !Array.isArray(r.rubric)) continue;
        const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
        const rubric = (["problem", "communication", "quality", "testing"] as const).map((k) => {
          const x = r.rubric!.find((y) => y.key === k);
          return { key: k, score: pct(x?.score), note: s(x?.note, 200) };
        });
        return NextResponse.json({
          overall: pct(r.overall),
          verdict: s(r.verdict, 30),
          summary: s(r.summary, 400),
          rubric,
          moments: (r.moments ?? []).slice(0, 6).map((m) => ({ t: Math.max(0, Math.round(Number(m.t) || 0)), ok: !!m.ok, text: s(m.text, 100), sub: s(m.sub, 140) })).filter((m) => m.text).sort((a, b2) => a.t - b2.t),
          practice: (r.practice ?? []).slice(0, 3).map((p) => ({ title: s(p.title, 80), detail: s(p.detail, 140), minutes: Math.max(5, Math.min(60, Math.round(Number(p.minutes) || 20))), ...(ids.has(s(p.problemId, 40)) ? { problemId: s(p.problemId, 40) } : {}) })).filter((p) => p.title),
        });
      }
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    if (b.action === "evaluate") {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10).map((x) => x as { q?: unknown; a?: unknown }).map((x) => ({ q: s(x.q, 300), a: s(x.a, 2500) }));
      if (!items.length) return NextResponse.json({ error: "failed" }, { status: 400 });
      const prompt = `You are an experienced interviewer giving feedback after a mock interview for the role "${role}". The candidate is ${level}. Interview type: ${kindText}.
Answers may be in English, Hindi or Hinglish and may come from speech-to-text (ignore small transcription errors). An empty answer means the candidate skipped it.

${items.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a || "(skipped)"}`).join("\n\n")}

Score each answer 0–10 fairly (a skipped answer is 0; a correct but very short answer is 4–6; a clear, structured, specific answer with an example is 8–10). ${style.score} Be specific.
Reply with JSON only:
{"overall": 0-100, "verdict": "2–4 words, e.g. Almost ready", "summary": "2 sentences", "strengths": ["...", "..."], "tips": ["3 most useful things to improve"],
 "items": [{"score": 0-10, "good": "one sentence on what worked", "improve": "one sentence on what to improve", "better": "a strong model answer in 2–4 sentences, in ${hindi ? "simple Hindi (Devanagari)" : "English"}"}]}${hindi ? `
Write "verdict", "summary", "strengths", "tips", "good" and "improve" in simple Hindi (Devanagari) too.` : ""}
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
