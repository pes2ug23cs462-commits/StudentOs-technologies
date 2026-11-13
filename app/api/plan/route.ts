/* POST /api/plan  { goal, course, progress, degree, year, target, weeks, perWeek, minutes, language? }
   The AI writes a week-by-week study plan. Dates and times are fitted in the browser
   (lib/planner.ts) so they always respect the student's commitments.
   Returns { weeks: [{ title, sessions: [{ title, objective, tasks[] }] }] }. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { sanitizeOutline } from "@/lib/planner";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max = 160) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function parse(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const weeks = Math.min(12, Math.max(1, Number(b.weeks) || 8));
  const perWeek = Math.min(7, Math.max(1, Number(b.perWeek) || 3));
  const minutes = [45, 60, 90].includes(Number(b.minutes)) ? Number(b.minutes) : 60;
  if (!s(b.goal) && !s(b.course)) return NextResponse.json({ error: "failed" }, { status: 400 });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const prompt = `You are a study planner for an Indian college student. Write a realistic plan.
Student: ${s(b.year, 30) || "college student"}${s(b.degree) ? `, ${s(b.degree)}` : ""}.
Goal: ${s(b.goal) || "finish the course"}.
Course or exam: ${s(b.course) || "not given"}.
Where they are now: ${s(b.progress) || "just starting"}.
Target date: ${s(b.target, 20) || "none"}.

Make exactly ${weeks} weeks, each with exactly ${perWeek} sessions of ${minutes} minutes.
Rules:
- Follow the real order of topics for this course/exam/skill, starting from where the student is now. Use the real names of topics, chapters or lectures where you know them.
- The last session of each week is practice or revision. The final week finishes the goal (revision, mock test or final project).
- Session titles are short (under 45 characters), e.g. "Week 3 · Loops and lists".
- Each session has a one-sentence objective and 2–3 short concrete tasks that fit in ${minutes} minutes.
- Write in English.
Reply with JSON only, no other text:
{"weeks":[{"title":"short week theme","sessions":[{"title":"...","objective":"...","tasks":["...","..."]}]}]}`;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 8000, temperature: 0.4 });
      const outline = sanitizeOutline(parse(text), weeks, perWeek);
      if (outline) return NextResponse.json(outline);
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
