/* Project ideas and build plans: shapes and cleaning, shared by the server
   routes and the browser (no browser-only imports here). */

import type { ProjectPlan } from "./free";

export interface ProjectIdea {
  title: string;
  sub: string;
  level: "beginner" | "intermediate" | "advanced";
  skills: string[];
  /** why it fits this student */
  why?: string;
}

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function sanitizeIdeas(raw: unknown): ProjectIdea[] {
  const list = (raw as { ideas?: unknown[] })?.ideas;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 6)
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .map((x) => ({
      title: clean(x.title, 60),
      sub: clean(x.sub ?? x.description, 160),
      level: (LEVELS as readonly string[]).includes(String(x.level)) ? (x.level as ProjectIdea["level"]) : "beginner",
      skills: (Array.isArray(x.skills) ? x.skills : []).map((s) => clean(s, 24)).filter(Boolean).slice(0, 5),
      why: clean(x.why, 140) || undefined,
    }))
    .filter((x) => x.title && x.sub);
}

export function sanitizePlan(raw: unknown): ProjectPlan | null {
  const r = (raw ?? {}) as { stack?: unknown[]; steps?: unknown[] };
  const steps = (Array.isArray(r.steps) ? r.steps : [])
    .slice(0, 8)
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .map((x) => ({ title: clean(x.title, 70), detail: clean(x.detail, 260) }))
    .filter((x) => x.title);
  if (steps.length < 3) return null;
  return { stack: (Array.isArray(r.stack) ? r.stack : []).map((s) => clean(s, 24)).filter(Boolean).slice(0, 6), steps, at: Date.now() };
}

