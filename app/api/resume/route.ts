/* POST /api/resume  (Premium)
   { action: "write", resume, target? }
     → { headline, summary, skills: string[], suggested: string[], bullets: [{ id, points[] }] }
   { action: "check", text, target? }
     → { matched: string[], missing: string[], tips: string[] }
   The AI only rewrites what the student wrote: it must not invent jobs, tools,
   numbers or results. Skills the student didn't list come back as suggestions. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => s(x, max)).filter(Boolean).slice(0, n);

function json<T>(raw: string): T | null {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

type Entry = { id: string; kind: string; title: string; org: string; dates: string; description: string; skills: string };

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!(await isPremium(uid))) return NextResponse.json({ error: "premium" }, { status: 402 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const target = String(b.target ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);

  try {
    if (b.action === "write") {
      const r = (b.resume ?? {}) as Record<string, unknown>;
      const entries: Entry[] = (Array.isArray(r.entries) ? r.entries : []).slice(0, 8).map((x) => {
        const e = x as Record<string, unknown>;
        return { id: s(e.id, 40), kind: s(e.kind, 20), title: s(e.title, 100), org: s(e.org, 80), dates: s(e.dates, 40), description: s(e.description, 900), skills: s(e.skills, 200) };
      });
      const prompt = `You are an expert resume writer for Indian college students and freshers. Improve this resume${target ? " for the target below" : ""}.

Name: ${s(r.name, 80)}
Headline: ${s(r.headline, 120)}
Education: ${s(r.education, 250)}
Skills: ${s(r.skills, 500)}
Current summary: ${s(r.summary, 600) || "(none)"}
Profile: ${s(r.profile, 300)}
Projects and experience:
${entries.map((e) => `[${e.id}] ${e.kind}: ${e.title}${e.org ? ` at ${e.org}` : ""} (${e.dates})\n  What they wrote: ${e.description || "(nothing)"}\n  Tools: ${e.skills || "-"}`).join("\n") || "(none)"}
${target ? `\nTarget role / job description:\n${target}\n` : ""}
Rules:
- Use ONLY facts given above. Never invent companies, tools, results, numbers or percentages. If a point would be stronger with a number the student didn't give, don't make one up.
- Bullet points: 2–4 per entry, each starts with a strong action verb (Built, Designed, Led, Analysed…), past tense, max 22 words, specific, no "I".
- Summary: 2–3 lines (max 55 words), confident, mentions degree, strongest skills and the target role${target ? " using words from the job description where they are true for this student" : ""}.
- Headline: max 10 words.
- skills: the student's own skills (from Skills and the tools in their projects), most relevant to the target first; do not add skills they didn't show.
- suggested: up to 6 skills/keywords from the target that the student did NOT list (they can choose to learn or add them).
Reply with JSON only:
{"headline":"...","summary":"...","skills":["..."],"suggested":["..."],"bullets":[{"id":"entry id","points":["...","..."]}]}`;
      for (let i = 0; i < 2; i++) {
        const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 2500, temperature: 0.4 });
        const j = json<{ headline?: unknown; summary?: unknown; skills?: unknown; suggested?: unknown; bullets?: { id?: unknown; points?: unknown }[] }>(text);
        if (!j || !s(j.summary, 10)) continue;
        const ids = new Set(entries.map((e) => e.id));
        return NextResponse.json({
          headline: s(j.headline, 100),
          summary: s(j.summary, 500),
          skills: list(j.skills, 30, 40),
          suggested: list(j.suggested, 6, 40),
          bullets: (Array.isArray(j.bullets) ? j.bullets : []).map((x) => ({ id: s(x?.id, 40), points: list(x?.points, 4, 220) })).filter((x) => ids.has(x.id) && x.points.length),
        });
      }
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    if (b.action === "check") {
      const text = String(b.text ?? "").slice(0, 6000);
      if (text.length < 40) return NextResponse.json({ error: "failed" }, { status: 400 });
      const prompt = `You are an ATS (applicant tracking system) and a senior recruiter in India. Review this student resume${target ? " against the job description" : ""}.

RESUME:
${text}
${target ? `\nJOB DESCRIPTION / TARGET ROLE:\n${target}\n` : ""}
${target ? "List the important skills/keywords from the job description that ARE in the resume (matched) and that are NOT (missing), max 12 each, short (1–3 words)." : "Leave matched and missing empty."}
Then give the 4 most useful, specific fixes for this resume (max 25 words each), e.g. weak bullet points, missing numbers, vague summary, missing sections. Don't praise.
Reply with JSON only: {"matched":["..."],"missing":["..."],"tips":["..."]}`;
      const { text: out } = await chat([{ role: "user", content: prompt }], { maxTokens: 900, temperature: 0.2 });
      const j = json<{ matched?: unknown; missing?: unknown; tips?: unknown }>(out);
      if (!j) return NextResponse.json({ error: "failed" }, { status: 502 });
      return NextResponse.json({ matched: target ? list(j.matched, 12, 40) : [], missing: target ? list(j.missing, 12, 40) : [], tips: list(j.tips, 4, 220) });
    }
    return NextResponse.json({ error: "failed" }, { status: 400 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
