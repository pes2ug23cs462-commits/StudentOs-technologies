/* POST /api/project-ideas  { profile }  → { ideas: [{ title, sub, level, skills[], why }] }
   Project ideas that fit the student's skills, experience, interests and level. */

import { NextResponse } from "next/server";
import { sanitizeIdeas } from "@/lib/project-shared";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

export const maxDuration = 60;

function parse(raw: string): unknown {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  try {
    return a >= 0 && b > a ? JSON.parse(raw.slice(a, b + 1)) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { profile?: unknown };
  const profile = String(b.profile ?? "").slice(0, 2000);
  if (profile.length < 10) return NextResponse.json({ error: "failed" }, { status: 400 });

  const prompt = `Suggest 4 portfolio projects for this Indian student. Use ONLY their profile; do not assume they study tech.
${profile}

Rules: each project must use skills they already have plus at most 1–2 new ones, be a step up from what they already did (never repeat a project they did), be finishable by one student in 1–4 weeks, and be something a recruiter in their field would care about. Mix: 2 at their level, 1 slightly harder, 1 that fills a gap for their goals. Prefer real, local problems (college, small shops, their city). Non-tech students get non-coding projects (e.g. a GST filing tracker in Excel, a marketing campaign plan, a design case study).
"sub": one sentence on what it does. "why": one short sentence on why it fits THIS student (mention their skill or past project). "skills": 3–5. "level": beginner, intermediate or advanced.
Reply with JSON only: {"ideas":[{"title":"...","sub":"...","level":"beginner","skills":["..."],"why":"..."}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1500, temperature: 0.7 });
      const ideas = sanitizeIdeas(parse(text));
      if (ideas.length >= 3) return NextResponse.json({ ideas });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
