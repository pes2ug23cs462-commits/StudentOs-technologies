import type { ResumeData } from "./free";
import { AREAS } from "./setup";
import type { AppState } from "./store";

/** First-time resume, filled from the profile, setup answers and projects. */
export function starterResume(state: AppState): ResumeData {
  const a = state.setup?.academic;
  const s = state.setup?.skills;
  const skills = [
    ...(s?.familiar ?? []).filter((x) => x !== "No specific skills yet" && x !== "Other"),
    ...(s?.tools ?? []).filter((x) => x !== "None yet" && x !== "Other"),
    ...Object.keys(s?.areaLevels ?? {}).map((k) => AREAS.find((x) => x.value === k)?.label.split(" / ")[0] ?? ""),
  ].filter(Boolean);
  return {
    name: state.profile.name,
    headline:
      a?.type === "school"
        ? [a.year ? `${a.year} student` : "School student", a.field && a.field !== "Not chosen yet" ? a.field : ""].filter(Boolean).join(" · ")
        : a?.type === "professional"
          ? a.specialization || "Working professional"
          : [a?.course || state.profile.degree, a?.specialization].filter(Boolean).join(" · ") || "Student",
    email: state.profile.email,
    phone: "",
    location: "",
    links: "",
    summary: "",
    education: {
      school: a?.college || state.profile.college,
      degree:
        a?.type === "school"
          ? [a.year, a.field && a.field !== "Not chosen yet" ? a.field : "", a.course].filter(Boolean).join(", ")
          : a?.type === "professional" || a?.type === "other"
            ? a.course
            : [a?.course, a?.specialization || a?.field].filter(Boolean).join(", ") || state.profile.degree,
      years: a?.graduation ? `Expected ${a.graduation}` : "",
      score: "",
    },
    skills: [...new Set(skills)].join(", "),
    entryIds: (state.entries ?? []).map((e) => e.id),
    template: "professional",
  };
}

