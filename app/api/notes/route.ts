/* POST /api/notes  (Premium)
   { topic? | text?, title?, level, profile? }
     → { title, summary, sections: [{ heading, points[] }], terms: [{ term, meaning }], cards: [{ q, a }] }
   With text (pasted, a file or a study material) the notes stick to that text;
   with only a topic the AI writes exam-ready notes on it. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LEVELS: Record<string, string> = {
  beginner: "simple language for a beginner",
  intermediate: "standard college exam level",
  advanced: "detailed, for advanced study and competitive exams",
};

type Raw = { title?: unknown; summary?: unknown; sections?: { heading?: unknown; points?: unknown[] }[]; terms?: { term?: unknown; meaning?: unknown }[]; cards?: { q?: unknown; a?: unknown }[] };

function parse(raw: string): Raw | null {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1)) as Raw;
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
  const topic = s(b.topic, 200);
  const text = String(b.text ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 18_000);
  const title = s(b.title, 120);
  if (!topic && text.length < 80) return NextResponse.json({ error: text ? "too-short" : "failed" }, { status: 400 });
  const level = LEVELS[String(b.level)] ?? LEVELS.intermediate;

  const prompt = `You are an expert teacher in India making revision notes for a student (${s(b.profile, 300) || "college student"}). Write ${level}.
${text ? `Make notes ONLY from this study material${title ? ` ("${title}")` : ""}. Do not add facts that are not in it.\n---\n${text}\n---` : `Topic: ${topic}\nWrite accurate, exam-ready notes covering the most important ideas of this topic.`}

Make them short and easy to revise: 3–7 sections, each with 2–6 crisp bullet points (one idea each, include formulas, examples or numbers where useful); 3–8 key terms with one-line meanings; 6–12 flashcards (a short question and a short answer) that test the most important points. Plain text only, no markdown symbols.
Reply with JSON only:
{"title":"short title","summary":"2–3 sentence overview","sections":[{"heading":"...","points":["..."]}],"terms":[{"term":"...","meaning":"..."}],"cards":[{"q":"...","a":"..."}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text: out } = await chat([{ role: "user", content: prompt }], { maxTokens: 3500, temperature: 0.4 });
      const r = parse(out);
      if (!r) continue;
      const sections = (Array.isArray(r.sections) ? r.sections : [])
        .map((x) => ({ heading: s(x?.heading, 80), points: (Array.isArray(x?.points) ? x.points : []).map((p) => s(p, 260)).filter(Boolean).slice(0, 7) }))
        .filter((x) => x.heading && x.points.length)
        .slice(0, 8);
      const cards = (Array.isArray(r.cards) ? r.cards : []).map((c) => ({ q: s(c?.q, 200), a: s(c?.a, 300) })).filter((c) => c.q && c.a).slice(0, 15);
      if (!sections.length || cards.length < 3) continue;
      return NextResponse.json({
        title: s(r.title, 80) || title || topic || "My notes",
        summary: s(r.summary, 500),
        sections,
        terms: (Array.isArray(r.terms) ? r.terms : []).map((t) => ({ term: s(t?.term, 60), meaning: s(t?.meaning, 200) })).filter((t) => t.term && t.meaning).slice(0, 10),
        cards,
      });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
