/* Premium · AI resume writer and ATS check: calls to /api/resume and the local checklist. */

import { postAi } from "./assistant";
import { ENTRY_KINDS, monthLabel, type Entry, type ResumeData } from "./free";

export type AiDraft = { headline: string; summary: string; skills: string[]; suggested: string[]; bullets: { id: string; points: string[] }[] };
export type AiCheck = { matched: string[]; missing: string[]; tips: string[] };

/** Resume points for an entry: the resume-only version if there is one, else what the student wrote. */
export const entryPoints = (r: ResumeData, e: Entry) => r.bullets?.[e.id] ?? e.description;

export async function writeResume(r: ResumeData, entries: Entry[], target: string, profile: string) {
  return postAi<AiDraft>("/api/resume", {
    action: "write",
    target,
    resume: {
      name: r.name,
      headline: r.headline,
      education: [r.education.degree, r.education.school, r.education.years, r.education.score && `Score ${r.education.score}`].filter(Boolean).join(", "),
      skills: r.skills,
      summary: r.summary,
      profile,
      entries: entries.map((e) => ({
        id: e.id,
        kind: ENTRY_KINDS.find((k) => k.value === e.kind)?.label ?? e.kind,
        title: e.title,
        org: e.org,
        dates: `${monthLabel(e.start)} – ${monthLabel(e.end)}`,
        description: entryPoints(r, e),
        skills: e.skills.join(", "),
      })),
    },
  });
}

/** The resume as plain text (for the ATS check). */
export function resumeText(r: ResumeData, entries: Entry[], certs: string[]) {
  return [
    r.name,
    r.headline,
    [r.email, r.phone, r.location, r.links].filter(Boolean).join(" | "),
    "SUMMARY",
    r.summary,
    "EDUCATION",
    [r.education.degree, r.education.school, r.education.years, r.education.score].filter(Boolean).join(", "),
    "SKILLS",
    r.skills,
    "PROJECTS AND EXPERIENCE",
    ...entries.flatMap((e) => [`${e.title}${e.org ? `, ${e.org}` : ""}`, entryPoints(r, e), e.skills.length ? `Tools: ${e.skills.join(", ")}` : ""]),
    certs.length ? "CERTIFICATIONS" : "",
    ...certs,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function checkResume(text: string, target: string) {
  return postAi<AiCheck>("/api/resume", { action: "check", text, target });
}

const VERBS = /^(built|developed|designed|created|led|managed|analy[sz]ed|implemented|improved|increased|reduced|organi[sz]ed|launched|automated|wrote|researched|conducted|prepared|coordinated|delivered|achieved|won|trained|optimi[sz]ed|handled|maintained|presented|planned|collaborated|engineered|deployed|tested|streamlined|initiated|established|drove|generated|mentored|taught|volunteered|assisted|supported|produced|curated|edited|audited|reconciled|filed|calculated|modelled|modeled|forecast(ed)?|negotiated|sold|marketed|promoted|ran|hosted|secured|completed|solved|integrated|migrated|refactored|documented|reviewed|evaluated|surveyed|interviewed|recruited|recorded|tracked|logged|verified|compiled|drafted|scheduled|guided|volunteered|contributed|participated|represented|demonstrated|identified|resolved|executed|prepared)\b/i;

export type CheckItem = { label: string; ok: boolean; tip: string; weight: number };

/** Simple checks that don't need the AI. */
export function localChecks(r: ResumeData, entries: Entry[]): CheckItem[] {
  const points = entries.flatMap((e) => entryPoints(r, e).split("\n").map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean));
  const verbs = points.filter((p) => VERBS.test(p)).length;
  const numbers = points.filter((p) => /\d/.test(p)).length;
  const skills = r.skills.split(",").map((x) => x.trim()).filter(Boolean);
  const sum = r.summary.trim().split(/\s+/).filter(Boolean).length;
  return [
    { label: "Email and phone number", ok: !!r.email.trim() && !!r.phone.trim(), tip: "Recruiters need both to contact you.", weight: 10 },
    { label: "Summary of 25–70 words", ok: sum >= 25 && sum <= 70, tip: sum ? `Your summary has ${sum} words.` : "Add a 2–3 line summary at the top.", weight: 15 },
    { label: "Education with years and score", ok: !!r.education.degree.trim() && !!r.education.years.trim() && !!r.education.score.trim(), tip: "Add your years and CGPA / percentage.", weight: 10 },
    { label: "At least 6 skills", ok: skills.length >= 6, tip: `You have ${skills.length} skill${skills.length === 1 ? "" : "s"}.`, weight: 10 },
    { label: "At least 2 projects or experiences", ok: entries.length >= 2, tip: "Add projects, internships, clubs or competitions.", weight: 15 },
    { label: "Points start with action verbs", ok: points.length > 0 && verbs / points.length >= 0.7, tip: points.length ? `${verbs} of ${points.length} points start with one (Built, Led, Analysed…).` : "Describe what you did in each project.", weight: 15 },
    { label: "Results with numbers", ok: points.length > 0 && numbers / points.length >= 0.3, tip: points.length ? `${numbers} of ${points.length} points have a number (users, %, marks, time saved).` : "Show results with numbers where you can.", weight: 15 },
    { label: "LinkedIn, GitHub or portfolio link", ok: !!r.links.trim(), tip: "Add at least one link recruiters can open.", weight: 10 },
  ];
}

/** Score out of 100: the checklist, mixed with keyword match when there is a job description. */
export function atsScore(items: CheckItem[], check?: AiCheck | null) {
  const total = items.reduce((a, x) => a + x.weight, 0);
  const local = Math.round((items.filter((x) => x.ok).reduce((a, x) => a + x.weight, 0) / total) * 100);
  const n = (check?.matched.length ?? 0) + (check?.missing.length ?? 0);
  if (!check || !n) return { score: local, local, match: null as number | null };
  const match = Math.round((check.matched.length / n) * 100);
  return { score: Math.round(local * 0.6 + match * 0.4), local, match };
}
