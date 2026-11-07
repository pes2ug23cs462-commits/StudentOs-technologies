/* ------------------------------------------------------------------
   Assistant + planner API — MOCK for now.
   Replace with calls to your AI backend later; keep the same shapes.
------------------------------------------------------------------ */

import type { OnboardingAnswers } from "./types";
import { wait } from "./utils";

export class OfflineError extends Error {
  constructor() {
    super("offline");
  }
}

/** Canned replies so the chat feels real until the AI backend exists. */
export async function askAssistant(message: string): Promise<string> {
  await wait(1300);
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
  const m = message.toLowerCase();
  if (m.includes("saturday") && /\b(10|11|after)\b/.test(m))
    return "Done — Saturday sessions will start at 10:00 AM or later. That still fits all 9 weeks, so your finish date doesn’t move.";
  if (m.includes("reschedule") || m.includes("move") || m.includes("missed"))
    return "I can move it. Your next session fits best tomorrow at 7:00 PM — want me to open the reschedule options?";
  if (m.includes("progress") || m.includes("where am i"))
    return "You’re early in your plan. Open your Study Plan to see this week’s sessions and what comes next.";
  if (m.includes("plan my week") || m.includes("plan"))
    return "This week’s sessions are planned around your commitments, with your rest day kept free. Open your Study Plan to see them, or tell me what to change.";
  return "Got it. I’ll keep that in mind when I suggest your next sessions. Anything else you want me to change?";
}

export type PlanResult = { ok: true } | { ok: false; reason: "timeout" };

/** Mock planner. Like the design’s failure state, it “times out” when every
 *  preferred time window is selected on the first try; a retry succeeds. */
export async function generatePlan(answers: OnboardingAnswers, attempt: number): Promise<PlanResult> {
  await wait(3800);
  if (attempt === 1 && answers.times.length >= 4) return { ok: false, reason: "timeout" };
  return { ok: true };
}
