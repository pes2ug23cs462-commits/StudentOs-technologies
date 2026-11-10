/* Projects & Experience with AI:
   · project ideas picked for this student from their skills, experience,
     interests and level (AI, with a fallback from the built-in list);
   · a step-by-step build plan for any project, which they tick off as they go. */

import { postAi } from "./assistant";
import { PROJECT_IDEAS, type Entry, type ProjectPlan } from "./free";
import type { SetupData } from "./setup";
import { sanitizeIdeas, sanitizePlan, type ProjectIdea } from "./project-shared";

export { sanitizeIdeas, sanitizePlan, type ProjectIdea };

/** What the ideas are based on (no name, email or college). */
export function ideasProfile(setup: SetupData | undefined, entries: Entry[], resumeSkills: string[] = []) {
  const a = setup?.academic;
  const skills = [...new Set([...(setup?.skills.familiar ?? []), ...resumeSkills, ...entries.flatMap((e) => e.skills)])].slice(0, 20);
  return [
    a ? `Studying: ${[a.course, a.specialization || a.field, a.year].filter(Boolean).join(", ")}` : "",
    setup?.goals.interests.length ? `Interests: ${setup.goals.interests.join(", ")}` : "",
    skills.length ? `Skills: ${skills.join(", ")}` : "",
    entries.length ? `Already did: ${entries.slice(0, 8).map((e) => `${e.kind} “${e.title}”${e.skills.length ? ` (${e.skills.slice(0, 4).join(", ")})` : ""}`).join("; ")}` : "No projects yet",
    `Level: ${setup?.level ?? setup?.skills.level ?? "beginner"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Changes when the parts the ideas depend on change. */
export const ideasKey = (profile: string) => {
  let h = 0;
  for (let i = 0; i < profile.length; i++) h = (Math.imul(h, 31) + profile.charCodeAt(i)) | 0;
  return String(h);
};

/** The built-in ideas that match the student's interests, their level first. */
export function fallbackIdeas(setup: SetupData | undefined): ProjectIdea[] {
  const interests = setup?.goals.interests ?? [];
  const level = setup?.level ?? "beginner";
  return PROJECT_IDEAS.filter((p) => p.areas.some((a) => interests.includes(a)) || !interests.length)
    .sort((a, b) => Number(b.level === level) - Number(a.level === level))
    .slice(0, 4)
    .map((p) => ({ title: p.title, sub: p.sub, level: p.level as ProjectIdea["level"], skills: p.skills }));
}

export async function suggestIdeas(profile: string): Promise<ProjectIdea[]> {
  const j = await postAi<{ ideas?: unknown }>("/api/project-ideas", { profile });
  return sanitizeIdeas(j);
}

/** A simple plan when the AI isn't available. */
export function fallbackPlan(e: Pick<Entry, "title" | "skills">): ProjectPlan {
  return {
    stack: e.skills.slice(0, 5),
    at: Date.now(),
    steps: [
      { title: "Write down what it should do", detail: `List the 3–5 things “${e.title}” must do for a first version. Keep it small.` },
      { title: "Create the GitHub repository", detail: "Make a new repository with a README that explains the idea. Commit after every small step." },
      { title: "Build the smallest working version", detail: "Get one feature working end to end before adding more." },
      { title: "Add the remaining features", detail: "Add the rest one at a time, testing each as you go." },
      { title: "Polish and write the README", detail: "Add screenshots, how to run it, and what you learned." },
      { title: "Share it", detail: "Deploy it if you can, add the link here, and put it on your resume." },
    ],
  };
}

export async function makePlan(e: Pick<Entry, "title" | "description" | "skills">, profile: string): Promise<ProjectPlan | null> {
  const j = await postAi<unknown>("/api/project-plan", { title: e.title, description: e.description, skills: e.skills, profile });
  return sanitizePlan(j);
}

/** "github.com/you/repo" or a full URL → https URL, or "" when it isn't a GitHub link. */
export function githubUrl(v: string | undefined) {
  const t = (v ?? "").trim();
  if (!t) return "";
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(url);
    return /(^|\.)github\.com$/i.test(u.hostname) && u.pathname.split("/").filter(Boolean).length >= 1 ? u.toString() : "";
  } catch {
    return "";
  }
}
export const githubLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "");
