/* A student's resume as data: the same thing the Resume Creator shows. It is copied
   into each placement application, so the college and the company can download
   the resume as it was when the student applied. */

import { monthLabel, type Entry, type ResumeCert, type ResumeData, type ResumeSnapshot } from "./free";
import { allCourses, certLabel } from "./learn";
import { entryPoints } from "./resume-ai";
import { starterResume } from "./resume-starter";
import type { AppState } from "./store";

/** StudentOS certificates go on the resume automatically */
export function resumeCerts(state: AppState): ResumeCert[] {
  return allCourses(state.learning)
    .filter((c) => state.learning?.courses[c.id]?.certId)
    .map((c) => {
      const cp = state.learning!.courses[c.id];
      return { title: c.title, issuer: "StudentOS Technologies", id: certLabel(cp.certId!), date: monthLabel((cp.passedAt ?? "").slice(0, 7)) };
    });
}

export function resumeSnapshot(state: AppState): ResumeSnapshot {
  const r: ResumeData = state.resume ?? starterResume(state);
  const entries: Entry[] = (state.entries ?? [])
    .filter((e) => r.entryIds.includes(e.id))
    .slice(0, 12)
    .map((e) => ({ id: e.id, kind: e.kind, title: e.title, org: e.org, start: e.start, end: e.end, description: entryPoints(r, e), skills: e.skills, link: e.link, ...(e.github ? { github: e.github } : {}) }));
  const { bullets: _b, target: _t, ...rest } = r;
  return { r: rest as ResumeData, entries, certs: resumeCerts(state) };
}

/** For applications made before resumes were copied: a simple resume from what was saved. */
export function fallbackResume(a: { name: string; email: string; branch?: string; batch?: string; cgpa?: number; college?: string; resume: { headline: string; skills: string; links: string; projects: string[] } | null }): ResumeSnapshot {
  const r: ResumeData = {
    name: a.name,
    headline: a.resume?.headline ?? "",
    email: a.email,
    phone: "",
    location: "",
    links: a.resume?.links ?? "",
    summary: "",
    education: { school: a.college ?? "", degree: a.branch ?? "", years: a.batch ? `Batch of ${a.batch}` : "", score: a.cgpa ? `CGPA ${a.cgpa}` : "" },
    skills: a.resume?.skills ?? "",
    entryIds: [],
    template: "professional",
  };
  const entries: Entry[] = (a.resume?.projects ?? []).map((t, i) => ({ id: `p${i}`, kind: "project", title: t, org: "", start: "", end: "", description: "", skills: [], link: "" }));
  return { r: { ...r, entryIds: entries.map((e) => e.id) }, entries, certs: [] };
}
