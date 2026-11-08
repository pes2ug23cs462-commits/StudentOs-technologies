/* POST /api/courses  { profile: string, level }
   Suggests 4–5 video courses for this student from their profile and assessment.
   Each module is a YouTube search topic; the most viewed video for it is played.
   Returns { courses: [{ title, blurb, why, level, modules: [{ title, topic, about }] }] }. */

import { NextResponse } from "next/server";
import { sanitizeCourses } from "@/lib/catalog";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

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
  const body = (await req.json().catch(() => ({}))) as { profile?: string; level?: string };
  const profile = String(body.profile ?? "").slice(0, 2500);
  if (profile.length < 20) return NextResponse.json({ error: "failed" }, { status: 400 });
  const level = ["beginner", "intermediate", "advanced"].includes(String(body.level)) ? String(body.level) : "beginner";
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const prompt = `You recommend free YouTube-based video courses to an Indian student. Use ONLY their profile below — do not assume they study tech.
Profile:
${profile}

Suggest 5 courses that fit their degree/field, interests, goals and current level (${level}). Mix: 2–3 for their own subject or career path, 1–2 for the interests they picked, at most 1 general skill (e.g. communication, Excel) if it helps their goal. Never suggest programming unless the profile shows tech/computer interest.
Each course has 2–4 modules in a sensible order. Each module has a YouTube search "topic" that finds ONE long, popular, English or Hinglish full-course/lecture video for it (e.g. "tally prime with gst full course", "organic chemistry class 12 one shot"). Indian exam or syllabus names are fine where relevant.
Rules: titles under 45 characters; "blurb" one sentence; "why" one short sentence saying why it fits this student; "level" is beginner, intermediate or advanced.
Reply with JSON only:
{"courses":[{"title":"...","blurb":"...","why":"...","level":"beginner","modules":[{"title":"...","topic":"...","about":"one sentence"}]}]}`;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 5000, temperature: 0.5 });
      const courses = sanitizeCourses(parse(text), level as "beginner");
      if (courses.length >= 3) return NextResponse.json({ courses });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
