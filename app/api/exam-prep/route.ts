/* POST /api/exam-prep  (free, normal AI limit)
   { action: "notes" | "quiz", exam, subject, chapter }
     notes → { summary, points[], formulas[], mistakes[] }
     quiz  → { questions: [{ q, options[4], answer, explain }] }
   Short revision notes and exam-style practice for one Class 12 chapter. */

import { NextResponse } from "next/server";
import { CHAPTERS, EXAMS, sanitizeNotes, sanitizeQuestions, type Subject } from "@/lib/exam-prep";
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

const STYLE: Record<string, string> = {
  puc: "Karnataka II PUC board exam (NCERT syllabus): 1-mark definitions, 2/3-mark short answers and 5-mark derivations or problems",
  cbse: "CBSE Class 12 board exam (NCERT): MCQs, assertion–reason and case-based questions",
  neet: "NEET (NCERT-based MCQs, conceptual and numerical, NEET difficulty)",
  kcet: "Karnataka CET (NCERT-based MCQs, quick conceptual and numerical)",
};

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const exam = EXAMS.find((e) => e.id === b.exam);
  const subject = String(b.subject) as Subject;
  const chapter = String(b.chapter ?? "");
  if (!exam || !CHAPTERS[subject]?.includes(chapter)) return NextResponse.json({ error: "failed" }, { status: 400 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const notes = b.action === "notes";
  const prompt = notes
    ? `You are an experienced Indian ${subject} teacher. Write short revision notes for the NCERT Class 12 ${subject} chapter “${chapter}”, for a student preparing for the ${STYLE[exam.id]}.
Simple English a Class 12 student understands. Only what is in the NCERT chapter; accurate.
- "summary": 2 sentences on what the chapter is about.
- "points": 6–10 must-know points for the exam, one idea each, short.
- "formulas": the important formulas or equations as plain text (e.g. "F = q1q2 / (4πε0 r²)"); empty if the chapter has none.
- "mistakes": 2–4 common mistakes students make in this chapter.
Reply with JSON only: {"summary":"...","points":["..."],"formulas":["..."],"mistakes":["..."]}`
    : `You are setting a practice test on the NCERT Class 12 ${subject} chapter “${chapter}” in the style of the ${STYLE[exam.id]}.
Write 10 multiple-choice questions that cover the whole chapter, from easy to hard, the kind that come in this exam. Use only NCERT content; every answer must be correct; numericals must have correctly worked values. Do not claim any question is from a real past paper.
Each: "q", 4 "options", "answer" (index 0–3 of the correct option), "explain" (1–2 sentences on why; show the working for numericals).
Reply with JSON only: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"explain":"..."}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: notes ? 1800 : 3500, temperature: 0.3 });
      const j = parse(text);
      if (notes) {
        const n = sanitizeNotes(j);
        if (n) return NextResponse.json(n);
      } else {
        const qs = sanitizeQuestions(j);
        if (qs.length >= 5) return NextResponse.json({ questions: qs });
      }
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
