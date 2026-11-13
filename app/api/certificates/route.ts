/* POST /api/certificates — issues a StudentOS certificate after the server re-checks the quiz.
   Body: { id, courseId, title, level, name, duration, modules, answers: [{ q, a }], pool?, sig? }
     answers: the questions the student got and the option text they chose
     pool + sig: for personalised courses, the question pool exactly as /api/course-quiz signed it
   The server finds each question in the course's real pool, counts the right answers, and only
   then writes certificates/{id} with the service account. Students can't write certificates
   themselves any more (see firestore.rules), so a certificate on /verify means the quiz was passed.
   503 { error: "not-configured" } when the service account isn't set (the app then falls back). */

import { NextResponse } from "next/server";
import { COURSES, QUIZ_PASS, QUIZ_SIZE } from "@/lib/learn";
import { LEVEL_INFO } from "@/lib/setup";
import { verifyIdToken } from "@/lib/server/auth";
import { adminConfigured, adminCreate, adminGet } from "@/lib/server/firestore-admin";
import { checkPool } from "@/lib/server/quiz-sign";

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

type Q = { q: string; options: string[]; answer: number };

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = s(b.id, 20).toUpperCase();
  if (!/^[0-9]{4}-[A-Z0-9]{6}$/.test(id)) return NextResponse.json({ error: "bad-id" }, { status: 400 });
  const courseId = s(b.courseId, 80);

  // The course's real question pool: built-in courses from the code, personalised ones from the signed pool.
  const builtIn = COURSES.find((c) => c.id === courseId && c.quiz.length);
  let pool: Q[];
  let title: string;
  let level: string;
  let modules: number;
  if (builtIn) {
    pool = builtIn.quiz;
    title = builtIn.title;
    level = builtIn.level;
    modules = builtIn.modules.length;
  } else {
    title = s(b.title, 80);
    level = s(b.level, 20);
    pool = (Array.isArray(b.pool) ? b.pool : []).slice(0, 12).map((x) => x as Q);
    if (!title || !checkPool(uid, courseId, title, level, pool, s(b.sig, 200))) return NextResponse.json({ error: "bad-quiz" }, { status: 400 });
    modules = Math.max(1, Math.min(20, Math.round(Number(b.modules) || 1)));
  }

  // Re-mark the attempt.
  const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, QUIZ_SIZE).map((x) => x as { q?: unknown; a?: unknown });
  const seen = new Set<string>();
  let right = 0;
  for (const a of answers) {
    const q = pool.find((p) => p.q === a.q);
    if (!q || seen.has(q.q)) return NextResponse.json({ error: "bad-quiz" }, { status: 400 });
    seen.add(q.q);
    if (q.options[q.answer] === a.a) right++;
  }
  if (answers.length < QUIZ_SIZE || right < QUIZ_PASS) return NextResponse.json({ error: "not-passed" }, { status: 400 });

  // One certificate id belongs to one student; issuing again for the same student is fine.
  const existing = await adminGet(`certificates/${id}`).catch(() => null);
  if (existing) return existing.uid === uid ? NextResponse.json({ ok: true, id }) : NextResponse.json({ error: "bad-id" }, { status: 409 });

  const rec = {
    id,
    uid,
    name: s(b.name, 60) || "StudentOS learner",
    course: title,
    level: LEVEL_INFO[level as keyof typeof LEVEL_INFO]?.label ?? (s(level, 20) || "Beginner"),
    duration: s(b.duration, 20),
    issuedAt: new Date().toISOString(),
    modules,
    score: `${right}/${QUIZ_SIZE}`,
    courseId,
  };
  try {
    const made = await adminCreate("certificates", id, rec);
    if (!made) return NextResponse.json({ error: "bad-id" }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
