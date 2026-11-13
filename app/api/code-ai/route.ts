/* POST /api/code-ai  (Free and Premium)
   { action: "help", mode: "hint" | "explain" | "code", problem, lang, code, failing?, question? }
     → { text, code? }     hints never contain code; "code" gives only the next few lines
   { action: "check", problem, lang, code, telemetry }
     → { estimate, reasons[], time, space, review[] }
   The checker estimates how much of the code looks AI-written or copied, using
   the code itself and how it was written (typed vs pasted vs AI-inserted). */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const code = (v: unknown) => String(v ?? "").slice(0, 8000);
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

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = (b.problem ?? {}) as Record<string, unknown>;
  const lang = b.lang === "javascript" ? "JavaScript" : "Python 3";
  const problem = `Problem: ${s(p.title, 100)}\n${s(p.statement, 1200)}`;
  const studentCode = code(b.code);

  try {
    if (b.action === "help") {
      const mode = b.mode === "code" ? "code" : b.mode === "explain" ? "explain" : "hint";
      const task =
        mode === "hint"
          ? "Give ONE short hint (max 3 sentences) that moves the student to the next step of their own approach. Do NOT write any code and do not reveal the full algorithm."
          : mode === "explain"
            ? `Explain in simple words (max 5 sentences) why their code fails${s(b.failing, 600) ? ` on this case: ${s(b.failing, 600)}` : ""}. Point to the line or idea that's wrong. Do NOT write the corrected code.`
            : `Write ONLY the next small piece of code the student needs (at most 5 lines), continuing from their current code and matching its variable names. Never write the whole solution. Explain it in one sentence.${s(p.signature, 200) ? ` The function signature is: ${s(p.signature, 200)}` : ""}`;
      const prompt = `You are a patient coding tutor for an Indian college student practising ${lang}. The student must write most of the solution themselves.
${problem}

Student's current code:
\`\`\`
${studentCode || "(empty)"}
\`\`\`
${s(b.question, 300) ? `Student asks: ${s(b.question, 300)}\n` : ""}
${task}
Reply with JSON only: {"text":"your explanation"${mode === "code" ? ',"code":"the lines of code, using \\n for new lines"' : ""}}`;
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 600, temperature: 0.3 });
      const j = json<{ text?: unknown; code?: unknown }>(text);
      if (!j) return NextResponse.json({ text: s(text, 800) });
      let snippet = mode === "code" ? String(j.code ?? "").replace(/^```\w*\n?|```$/g, "").trimEnd() : "";
      // keep the AI's part small, whatever it wrote
      if (snippet) snippet = snippet.split("\n").slice(0, 6).join("\n").slice(0, 600);
      return NextResponse.json({ text: s(j.text, 800), ...(snippet ? { code: snippet } : {}) });
    }

    if (b.action === "check") {
      const t = (b.telemetry ?? {}) as Record<string, unknown>;
      const n = (k: string) => Math.max(0, Math.round(Number(t[k]) || 0));
      const prompt = `You review a student's accepted ${lang} solution on a practice platform where at most 50% of the code may come from AI.
${problem}

Solution:
\`\`\`
${studentCode}
\`\`\`
How it was written: ${n("typed")} characters typed by hand, ${n("pasted")} characters pasted from outside, ${n("aiLines")} lines inserted from the built-in AI helper, about ${n("minutes")} minutes in the editor. The tracked AI + paste share is ${n("tracked")}%.

1) Estimate what percent (0–100) of this code was most likely produced by AI or copied rather than written by the student. Weigh the writing data most: lots of typing and time means it's likely their own; a big paste with little typing is a strong sign of copying. Code style alone (clean names, comments, idioms) is weak evidence, since good students write clean code too. Never estimate lower than the tracked share.
2) Give the time and space complexity in Big-O.
3) Give 2–3 short, specific tips to improve the code (readability, edge cases, faster approach).
Reply with JSON only: {"estimate":0,"reasons":["1–3 short reasons for the estimate"],"time":"O(n)","space":"O(1)","review":["tip"]}`;
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 700, temperature: 0.2 });
      const j = json<{ estimate?: unknown; reasons?: unknown; time?: unknown; space?: unknown; review?: unknown }>(text);
      if (!j) return NextResponse.json({ error: "failed" }, { status: 502 });
      const estimate = Math.max(n("tracked"), Math.min(100, Math.max(0, Math.round(Number(j.estimate) || 0))));
      return NextResponse.json({ estimate, reasons: list(j.reasons, 3, 200), time: s(j.time, 30), space: s(j.space, 30), review: list(j.review, 3, 220) });
    }
    return NextResponse.json({ error: "failed" }, { status: 400 });
  } catch (e) {
    const c = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: c }, { status: c === "no-key" ? 503 : c === "busy" ? 429 : 502 });
  }
}
