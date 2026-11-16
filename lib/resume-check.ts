/* How complete a resume is for placements: a quick checklist, worked out on the device. */

import type { AppState } from "@/lib/store";

export type ResumeCheck = { score: number; items: { ok: boolean; text: string }[] };
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export function resumeCheck(state: AppState): ResumeCheck {
  const r = state.resume;
  const ids = r?.entryIds ?? [];
  const picked = (state.entries ?? []).filter((e) => ids.includes(e.id));
  const bullets = picked.map((e) => r?.bullets?.[e.id] ?? e.description).join(" ");
  const skills = (r?.skills ?? "").split(/[,\n•|]/).map((x) => x.trim()).filter(Boolean);
  const items = [
    { ok: !!(r?.name.trim() && r.email.trim() && r.phone.trim()), text: "Name, email and phone at the top" },
    { ok: !!r && words(r.summary) >= 25 && words(r.summary) <= 90, text: "A summary of 25–90 words" },
    { ok: !!(r?.education.school.trim() && r.education.degree.trim()), text: "Your college and degree" },
    { ok: skills.length >= 6, text: "At least 6 skills listed" },
    { ok: picked.length >= 2, text: "Two or more projects or experiences" },
    { ok: /\d/.test(bullets), text: "Numbers in your points (users, %, time saved)" },
    { ok: /github|linkedin/i.test(r?.links ?? "") || picked.some((e) => e.github || e.link), text: "A GitHub or LinkedIn link" },
    { ok: !!r?.target?.trim(), text: "Tailored to a target role" },
  ];
  return { score: Math.round((items.filter((i) => i.ok).length / items.length) * 100), items };
}

