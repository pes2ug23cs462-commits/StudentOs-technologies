/* POST /api/project-plan  { title, description, skills[], profile }
     → { stack: string[], steps: [{ title, detail }] }
   A step-by-step plan to build one project, for this student's level. */

import { NextResponse } from "next/server";
import { sanitizePlan } from "@/lib/project-shared";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

export const maxDuration = 60;
const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

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
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = s(b.title, 100);
  if (!title) return NextResponse.json({ error: "failed" }, { status: 400 });
  const skills = (Array.isArray(b.skills) ? b.skills : []).map((x) => s(x, 30)).filter(Boolean).slice(0, 10);

  const prompt = `You are a mentor helping an Indian student build a portfolio project on their own.
Project: ${title}
${s(b.description, 600) ? `About it: ${s(b.description, 600)}` : ""}
${skills.length ? `Skills planned: ${skills.join(", ")}` : ""}
Student: ${s(b.profile, 1200) || "college student"}

Write a build plan of 5–7 steps in order, from an empty folder to a finished project on GitHub with a good README. Each step: a short "title" and a "detail" of 1–3 sentences saying exactly what to do and what "done" looks like (name concrete tools, files, functions or features; no vague advice). Match their level. Include making the GitHub repository early and committing often. "stack": 3–6 free tools or libraries to use.
Reply with JSON only: {"stack":["..."],"steps":[{"title":"...","detail":"..."}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1800, temperature: 0.4 });
      const plan = sanitizePlan(parse(text));
      if (plan) return NextResponse.json({ stack: plan.stack, steps: plan.steps });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
