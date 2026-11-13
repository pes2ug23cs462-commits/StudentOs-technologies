/* POST /api/course-quiz  { courseId, title, level, modules: [{ title, about, video }] }
   Writes the final-quiz question pool for a personalised course, from what its
   modules (and the videos the student watched) cover.
   Returns { questions: [{ q, options[4], answer, hint, module }], sig }.
   `sig` signs the pool for this student and course, so the certificate API can
   trust it when the student sends it back (see /api/certificates). */

import { NextResponse } from "next/server";
import { sanitizeQuiz } from "@/lib/catalog";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { signPool } from "@/lib/server/quiz-sign";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { courseId?: string; title?: string; level?: string; modules?: { title?: string; about?: string; video?: string }[] };
  const modules = (b.modules ?? []).slice(0, 6).map((m, i) => `${i}. ${s(m.title, 80)}: ${s(m.about, 200)}${m.video ? ` (video watched: "${s(m.video, 120)}")` : ""}`);
  if (!s(b.title, 80) || !modules.length) return NextResponse.json({ error: "failed" }, { status: 400 });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const prompt = `Write the final quiz for a ${s(b.level, 20) || "beginner"} course "${s(b.title, 80)}". Modules:
${modules.join("\n")}

Write 10 multiple-choice questions spread across the modules. Test core ideas a student who watched these lessons should know — no trick questions, no trivia about the video itself.
Each question has exactly 4 short options and exactly one correct answer. Facts must be correct; for India-specific topics (GST, tax, exams) use current Indian rules.
Also give each question a "hint": one short sentence that nudges the student toward the idea without naming or giving away the correct option, and "module": the number of the module it comes from.
Reply with JSON only: [{"q":"...","options":["a","b","c","d"],"answer":0,"hint":"...","module":0}] where answer is the index (0-3) of the correct option.`;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 3500, temperature: 0.3 });
      const questions = sanitizeQuiz(text);
      if (questions.length >= 6) {
        // cleaned twice so it matches exactly what the app keeps after its own clean-up
        const pool = sanitizeQuiz(questions.slice(0, 10));
        const sig = signPool(uid, s(b.courseId, 80), s(b.title, 80), s(b.level, 20), pool);
        return NextResponse.json({ questions: pool, ...(sig ? { sig } : {}) });
      }
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
