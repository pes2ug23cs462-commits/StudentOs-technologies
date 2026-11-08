/* POST /api/course-quiz  { title, level, modules: [{ title, about, video }] }
   Writes the final-quiz question pool for a personalised course, from what its
   modules (and the videos the student watched) cover.
   Returns { questions: [{ q, options[4], answer }] }. */

import { NextResponse } from "next/server";
import { sanitizeQuiz } from "@/lib/catalog";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { title?: string; level?: string; modules?: { title?: string; about?: string; video?: string }[] };
  const modules = (b.modules ?? []).slice(0, 6).map((m) => `- ${s(m.title, 80)}: ${s(m.about, 200)}${m.video ? ` (video watched: "${s(m.video, 120)}")` : ""}`);
  if (!s(b.title, 80) || !modules.length) return NextResponse.json({ error: "failed" }, { status: 400 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const prompt = `Write the final quiz for a ${s(b.level, 20) || "beginner"} course "${s(b.title, 80)}". Modules:
${modules.join("\n")}

Write 10 multiple-choice questions spread across the modules. Test core ideas a student who watched these lessons should know — no trick questions, no trivia about the video itself.
Each question has exactly 4 short options and exactly one correct answer. Facts must be correct; for India-specific topics (GST, tax, exams) use current Indian rules.
Reply with JSON only: [{"q":"...","options":["a","b","c","d"],"answer":0}] where answer is the index (0-3) of the correct option.`;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 3500, temperature: 0.3 });
      const questions = sanitizeQuiz(text);
      if (questions.length >= 6) return NextResponse.json({ questions: questions.slice(0, 10) });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
