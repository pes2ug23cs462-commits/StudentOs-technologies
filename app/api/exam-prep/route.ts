/* POST /api/exam-prep  (free, normal AI limit)
   { action: "notes" | "quiz", exam, subject, chapter }
     notes → { summary, points[], formulas[], mistakes[] }
     quiz  → { questions: [{ q, options[4], answer, explain }] }
   Short revision notes and exam-style practice for one Class 10, 11 or 12 chapter. */

import { NextResponse } from "next/server";
import { EXAMS, chaptersFor, gradeLabel, sanitizeNotes, sanitizeQuestions, type Grade, type Subject } from "@/lib/exam-prep";
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
  sslc: "Karnataka SSLC (Class 10) board exam: 1-mark MCQs and one-word answers, 2/3-mark short answers and 4/5-mark long answers",
  puc: "Karnataka PUC board exam (NCERT syllabus): 1-mark definitions, 2/3-mark short answers and 5-mark derivations or problems",
  cbse: "CBSE board exam (NCERT): MCQs, assertion–reason and case-based questions",
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
  const g = Number(b.grade);
  const grade: Grade = g === 10 || g === 11 ? g : 12;
  if (!exam || !chaptersFor(grade, subject)?.includes(chapter)) return NextResponse.json({ error: "failed" }, { status: 400 });
  const cls = `Class ${grade}`;
  const lang = subject === "Hindi" ? "Simple Hindi (Devanagari)" : "Simple English";
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const notes = b.action === "notes";
  const prompt = notes
    ? `You are an experienced Indian ${subject} teacher. Write short revision notes for the NCERT ${cls} ${subject} chapter “${chapter}”, for a ${gradeLabel(exam.id, grade)} student preparing for the ${STYLE[exam.id]}.
${lang} a ${cls} student understands. Only what is in the NCERT chapter; accurate.
- "summary": 2 sentences on what the chapter is about.
- "points": 6–10 must-know points for the exam, one idea each, short.
- "formulas": the important formulas, equations, dates or key terms to remember, as plain text (e.g. "F = q1q2 / (4πε0 r²)"); empty if there are none.
- "mistakes": 2–4 common mistakes students make in this chapter.
Reply with JSON only: {"summary":"...","points":["..."],"formulas":["..."],"mistakes":["..."]}`
    : `You are setting a practice test for a ${gradeLabel(exam.id, grade)} student on the NCERT ${cls} ${subject} chapter “${chapter}” in the style of the ${STYLE[exam.id]}.
Write 10 multiple-choice questions${subject === "Hindi" ? " in Hindi (Devanagari)" : ""} that cover the whole chapter, from easy to hard, the kind that come in this exam. Use only NCERT content; every answer must be correct; numericals must have correctly worked values. Do not claim any question is from a real past paper.
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
