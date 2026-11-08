/* ------------------------------------------------------------------
   Assistant client. Sends the chat to /api/assistant (server), which
   calls the AI provider. generatePlan asks /api/plan.
------------------------------------------------------------------ */

import { auth } from "./firebase";
import type { Attachment } from "./attachments";
import type { Milestone, OnboardingAnswers, StudySession } from "./types";
import { fallbackCourses, profileForCourses, sanitizeCourses, sanitizeQuiz } from "./catalog";
import { moduleKey, type Course, type Learning, type QuizQuestion } from "./learn";
import type { SetupData } from "./setup";
import { type PlanOutline, fallbackOutline, planShape, sanitizeOutline, scheduleOutline } from "./planner";

export class OfflineError extends Error {
  constructor() {
    super("offline");
  }
}

/** A failure we can explain to the student in the chat. */
export class AssistantError extends Error {}

export type ChatTurn = { role: "user" | "assistant"; content: string };

const MESSAGES: Record<string, string> = {
  "signed-out": "Your session has expired. Please log in again.",
  "daily-limit": "You’ve reached today’s free limit for the assistant. It resets tomorrow.",
  "slow-down": "That’s a lot of messages in a minute. Wait a few seconds and try again.",
  busy: "The AI is busy right now. Try again in a minute.",
  failed: "I couldn’t get an answer right now. Please try again.",
  "no-key":
    process.env.NODE_ENV === "development"
      ? "The AI isn’t connected yet. Add GROQ_API_KEY to .env.local and restart npm run dev."
      : "The assistant isn’t available right now. Please try again later.",
};

export async function askAssistant(message: string, opts: { history?: ChatTurn[]; context?: string; tone?: string; files?: Attachment[] } = {}): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (!token) throw new AssistantError(MESSAGES["signed-out"]);
  let res: Response;
  try {
    res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: [...(opts.history ?? []), { role: "user", content: message }],
        context: opts.context ?? "",
        tone: opts.tone ?? "encouraging",
        attachments: (opts.files ?? []).map((f) => ({ name: f.name, kind: f.kind, text: f.text, dataUrl: f.dataUrl, truncated: f.truncated })),
      }),
    });
  } catch {
    throw new OfflineError();
  }
  const j = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (res.ok && j.reply) return j.reply;
  throw new AssistantError(MESSAGES[j.error ?? "failed"] ?? MESSAGES.failed);
}

export type PlanResult =
  | { ok: true; sessions: StudySession[]; milestones: Milestone[]; fromAi: boolean }
  | { ok: false; reason: "offline" | "signed-out" };

/** Real planner: the AI writes the plan, then it is fitted into the student's week.
 *  If the AI is busy or has no key, a simple plan is built locally instead. */
export async function generatePlan(answers: OnboardingAnswers): Promise<PlanResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, reason: "offline" };
  const { weeks, perWeek } = planShape(answers);
  let outline: PlanOutline | null = null;
  try {
    const j = await postAi<PlanOutline>("/api/plan", {
      goal: answers.goal,
      course: answers.course,
      progress: answers.progress,
      degree: answers.degree,
      year: answers.year,
      target: answers.target,
      weeks,
      perWeek,
      minutes: answers.sessionLength,
    });
    outline = sanitizeOutline(j, weeks, perWeek);
  } catch (e) {
    if (e instanceof AssistantError && e.message === MESSAGES["signed-out"]) return { ok: false, reason: "signed-out" };
  }
  const fromAi = !!outline;
  const plan = scheduleOutline(outline ?? fallbackOutline(answers, weeks, perWeek), answers, "");
  return { ok: true, ...plan, fromAi };
}

/* ---------- other AI calls (study materials) ---------- */

export async function postAi<T>(path: string, body: unknown): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new AssistantError("You seem to be offline.");
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (!token) throw new AssistantError(MESSAGES["signed-out"]);
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  } catch {
    throw new AssistantError("You seem to be offline.");
  }
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.ok) return j;
  throw new AssistantError(j.error === "too-short" ? "There isn’t enough text in this file to make a quiz." : (MESSAGES[j.error ?? "failed"] ?? MESSAGES.failed));
}

/** Text from a photo of notes (vision AI). */
export async function readImageText(dataUrl: string): Promise<string> {
  const j = await postAi<{ text?: string }>("/api/ocr", { image: dataUrl });
  return (j.text ?? "").trim();
}

export type RevisionQuestion = { q: string; options: string[]; answer: number; why: string };

/** A short multiple-choice quiz made from the student's own notes. */
export async function makeRevisionQuiz(text: string, title: string, count = 5): Promise<RevisionQuestion[]> {
  const j = await postAi<{ questions?: RevisionQuestion[] }>("/api/quiz", { text, title, count });
  return j.questions ?? [];
}

/* ---------- personalised courses ---------- */

/** Courses made for this student from their profile; falls back to ones built from their interests. */
export async function suggestCourses(setup: SetupData | undefined): Promise<{ courses: Course[]; fromAi: boolean }> {
  const profile = profileForCourses(setup);
  if (profile) {
    try {
      const j = await postAi<{ courses?: unknown }>("/api/courses", { profile, level: setup?.level ?? "beginner" });
      const courses = sanitizeCourses(j, (setup?.level as Course["level"]) ?? "beginner");
      if (courses.length >= 3) return { courses, fromAi: true };
    } catch {
      /* use the fallback below */
    }
  }
  return { courses: fallbackCourses(setup), fromAi: false };
}

/** Final-quiz questions for a personalised course, written from its modules and the videos watched. */
export async function writeCourseQuiz(course: Course, l: Learning): Promise<QuizQuestion[]> {
  const j = await postAi<{ questions?: unknown }>("/api/course-quiz", {
    title: course.title,
    level: course.level,
    modules: course.modules.map((m) => ({ title: m.title, about: m.about, video: l.modules[moduleKey(course.id, m.id)]?.ytTitle ?? "" })),
  });
  return sanitizeQuiz(j.questions ?? []);
}
