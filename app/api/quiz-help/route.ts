/* POST /api/quiz-help  (Free and Premium)
   { action: "hints", course, questions: [{ q, options[] }] }
     → { hints: string[] }   one nudge per question, never the answer
   { action: "review", course, modules: string[], score, total, missed: [{ q, module? }] }
     → { summary, rewatch: string[], tips: string[] }
   The review never names correct options, so a retry still tests the student. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function json<T>(raw: string, open: "{" | "["): T | null {
  const a = raw.indexOf(open);
  const b = raw.lastIndexOf(open === "{" ? "}" : "]");
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
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const course = s(b.course, 100) || "this course";

  try {
    if (b.action === "hints") {
      const qs = (Array.isArray(b.questions) ? b.questions : []).slice(0, 10).map((x) => x as { q?: unknown; options?: unknown[] }).map((x) => ({ q: s(x.q, 300), options: (Array.isArray(x.options) ? x.options : []).map((o) => s(o, 120)).slice(0, 4) }));
      if (!qs.length) return NextResponse.json({ error: "failed" }, { status: 400 });
      const prompt = `You help a student during a quiz on "${course}". For each question write ONE short hint (max 20 words) that reminds them of the idea needed. Never name, quote or point to an option, never say which option is right or wrong, and never give the answer.
${qs.map((x, i) => `${i + 1}. ${x.q} | options: ${x.options.join(" / ")}`).join("\n")}
Reply with JSON only: ["hint for 1", "hint for 2", ...] with exactly ${qs.length} items.`;
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 800, temperature: 0.3 });
      const hints = (json<unknown[]>(text, "[") ?? []).map((h) => s(h, 200));
      return NextResponse.json({ hints: qs.map((_, i) => hints[i] || "Think about the main idea this module explained.") });
    }

    if (b.action === "review") {
      const modules = (Array.isArray(b.modules) ? b.modules : []).slice(0, 12).map((m) => s(m, 100));
      const missed = (Array.isArray(b.missed) ? b.missed : []).slice(0, 10).map((x) => x as { q?: unknown; module?: unknown }).map((x) => ({ q: s(x.q, 300), module: Number.isInteger(Number(x.module)) ? modules[Number(x.module)] : undefined }));
      const score = Number(b.score) || 0;
      const total = Number(b.total) || 0;
      const prompt = `A student took the final quiz of the course "${course}" and scored ${score}/${total}.
Modules: ${modules.map((m, i) => `${i + 1}. ${m}`).join("; ")}
${missed.length ? `Questions they got wrong or skipped:\n${missed.map((x) => `- ${x.q}${x.module ? ` (module: ${x.module})` : ""}`).join("\n")}` : "They got every question right."}

Give short, encouraging study advice. Do NOT reveal or hint at the correct option of any question, because they will retake the quiz; talk about the concepts to revise instead.
Reply with JSON only: {"summary":"1–2 sentences","rewatch":["exact module titles to rewatch, max 3"],"tips":["2–3 specific concepts or study tips"]}`;
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 700, temperature: 0.4 });
      const r = json<{ summary?: unknown; rewatch?: unknown[]; tips?: unknown[] }>(text, "{");
      if (!r) return NextResponse.json({ error: "failed" }, { status: 502 });
      const known = new Set(modules.map((m) => m.toLowerCase()));
      return NextResponse.json({
        summary: s(r.summary, 400),
        rewatch: (r.rewatch ?? []).map((m) => s(m, 100)).filter((m) => known.has(m.toLowerCase())).slice(0, 3),
        tips: (r.tips ?? []).map((t) => s(t, 220)).filter(Boolean).slice(0, 3),
      });
    }
    return NextResponse.json({ error: "failed" }, { status: 400 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
