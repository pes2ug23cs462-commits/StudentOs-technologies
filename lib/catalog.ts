/* Personalised courses. Nothing is fixed to one background: the courses are made
   for each student from their profile setup (degree, interests, skills, goals) and
   the assessment level. The AI writes them (/api/courses); if it can't, a simple
   set is built here from the student's interests. Each module's video is the most
   viewed YouTube video for its search topic. */

import type { Course, CourseLevel, Module, QuizQuestion } from "./learn";
import { areasFromAcademics } from "./learn";
import { AREAS, INTERESTS, PRIMARY_GOALS, studentLine, type SetupData } from "./setup";
import type { Goal } from "./types";
import { TOPICS } from "./youtube";

type GoalLike = Pick<Goal, "title" | "course" | "topics" | "progressPct" | "type">;

/** What a goal is about, e.g. "Operating Systems" (platform names and "Your course" removed). */
export function goalSubject(g: Pick<Goal, "title" | "course">) {
  const raw = g.course && g.course !== "Your course" ? g.course : g.title;
  return raw.replace(/\s*[·—-]\s*(harvard|on edx|edx|coursera|udemy|nptel|youtube).*$/i, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Goals still being worked on, most recent first (at most 4). */
export function activeGoals(goals: GoalLike[] | undefined) {
  return (goals ?? []).filter((g) => (g.progressPct ?? 0) < 100 && goalSubject(g).length > 1).slice(-4).reverse();
}

const stem = (w: string) => w.replace(/(ies|es|s)$/, "");
const sigWords = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9+#\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !["the", "and", "for", "of", "to", "in", "with", "course", "full", "basics", "learn", "complete", "exam", "prep", "my"].includes(w)).map(stem);

/** True when a course is about this goal's subject (all its key words appear in the course). */
export function coversGoal(c: Course, g: Pick<Goal, "title" | "course">) {
  const want = sigWords(goalSubject(g));
  if (!want.length) return true;
  const have = new Set(sigWords(`${c.title} ${c.modules.map((m) => `${m.title} ${m.topic}`).join(" ")}`));
  return want.every((w) => have.has(w));
}

/** A course built straight from a goal: its chosen topics, or the full course plus a revision. */
export function goalCourse(g: GoalLike, level: CourseLevel): Course {
  const subject = goalSubject(g);
  const topics = (g.topics ?? []).filter((t) => t.selected).map((t) => clean(t.label, 50)).filter(Boolean).slice(0, 4);
  const modules: Module[] =
    topics.length >= 2
      ? topics.map((t, i) => ({ id: `m${i + 1}`, title: t, yt: "", topic: `${subject} ${t}`.slice(0, 90), channel: "", length: "", about: `${t} in ${subject}.` }))
      : [
          { id: "m1", title: `${subject} full course`, yt: "", topic: `${subject} full course`.slice(0, 90), channel: "", length: "", about: `The most viewed complete course on ${subject}.` },
          { id: "m2", title: `${subject} revision`, yt: "", topic: `${subject} one shot revision`.slice(0, 90), channel: "", length: "", about: `Revise the important topics of ${subject} in one go.` },
        ];
  return { id: `ai-${slug(subject)}`, title: subject, blurb: `Videos for your goal: ${subject}.`, why: "You set this as a goal.", areas: [], skills: [], level, modules, quiz: [] };
}

/** Puts a course for every goal first, adding one wherever the suggestions missed a goal. */
export function withGoalCourses(courses: Course[], goals: GoalLike[] | undefined, level: CourseLevel): Course[] {
  const first: Course[] = [];
  let rest = [...courses];
  for (const g of activeGoals(goals)) {
    const hit = rest.find((c) => coversGoal(c, g));
    if (hit) {
      first.push(hit);
      rest = rest.filter((c) => c !== hit);
    } else {
      const made = goalCourse(g, level);
      if (!first.some((c) => c.id === made.id)) first.push({ ...made, id: rest.some((c) => c.id === made.id) ? `${made.id}-goal` : made.id });
    }
  }
  return [...first, ...rest].slice(0, 8);
}

const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

/** Plain-text profile sent to the AI (no name, email or college). */
export function profileForCourses(setup: SetupData | undefined, goals?: GoalLike[]) {
  if (!setup) return null;
  const goalLines = activeGoals(goals).map((x) => {
    const t = (x.topics ?? []).filter((y) => y.selected).map((y) => y.label).slice(0, 6);
    return `- ${goalSubject(x)}${t.length ? ` (topics: ${t.join(", ")})` : ""}`;
  });
  const a = setup.academic;
  const g = setup.goals;
  const k = setup.skills;
  const lines = [
    goalLines.length ? `GOALS they set (most important):\n${goalLines.join("\n")}` : "",
    `Student type: ${a.type || "college"}`,
    a.type && a.type !== "college" ? `About: ${studentLine(a)}` : "",
    [a.course, a.field, a.specialization].filter(Boolean).length ? `Studying: ${[a.course, a.field, a.specialization].filter(Boolean).join(", ")}` : "",
    a.year ? `Year: ${a.year}` : "",
    g.primary ? `Main goal: ${label(PRIMARY_GOALS, g.primary)}` : "",
    g.interests.length ? `Interests: ${g.interests.map((i) => label(INTERESTS, i)).join(", ")}` : "",
    g.opportunities.length ? `Looking for: ${g.opportunities.join(", ")}` : "",
    g.hours ? `Time per week: ${g.hours}` : "",
    g.formats.length ? `Likes to learn by: ${g.formats.join(", ")}` : "",
    k.familiar.length ? `Already knows: ${k.familiar.join(", ")}` : "",
    Object.keys(k.areaLevels).length ? `Self-rated: ${Object.entries(k.areaLevels).map(([area, lv]) => `${label(AREAS, area)} ${lv}`).join(", ")}` : "",
    k.tools.length ? `Tools used: ${k.tools.join(", ")}` : "",
    k.experience.length ? `Experience: ${k.experience.join(", ")}${k.experienceNote ? ` (${k.experienceNote.slice(0, 200)})` : ""}` : "",
    `Assessment result: ${setup.level ?? k.level ?? "beginner"}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Changes when the parts of the profile that decide the courses change. */
export function profileKey(setup: SetupData | undefined, goals?: GoalLike[]) {
  if (!setup) return "";
  const a = setup.academic;
  const g = activeGoals(goals).map((x) => goalSubject(x).toLowerCase()).sort().join("+");
  return [a.course, a.field, a.specialization, a.year, setup.goals.primary, [...setup.goals.interests].sort().join("+"), [...setup.skills.familiar].sort().join("+"), setup.level ?? "", g].join("|");
}

const LEVELS: CourseLevel[] = ["beginner", "intermediate", "advanced"];
const toLevel = (v: unknown, fallback: CourseLevel): CourseLevel => (LEVELS.includes(v as CourseLevel) ? (v as CourseLevel) : fallback);
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "course";

/** Keeps only well-formed courses from the AI's JSON and gives them stable ids. */
export function sanitizeCourses(raw: unknown, level: CourseLevel = "beginner"): Course[] {
  const list = (raw as { courses?: unknown[] })?.courses;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list
    .slice(0, 6)
    .map((x) => x as { title?: unknown; blurb?: unknown; level?: unknown; why?: unknown; modules?: unknown[] })
    .map((c) => {
      const title = clean(c.title, 70);
      const modules: Module[] = (Array.isArray(c.modules) ? c.modules : [])
        .slice(0, 4)
        .map((m) => m as { title?: unknown; topic?: unknown; about?: unknown })
        .map((m, i) => ({ id: `m${i + 1}`, title: clean(m.title, 60), yt: "", topic: clean(m.topic, 90), channel: "", length: "", about: clean(m.about, 200) }))
        .filter((m) => m.title && m.topic);
      let id = `ai-${slug(title)}`;
      while (seen.has(id)) id += "-2";
      seen.add(id);
      return { id, title, blurb: clean(c.blurb, 220), why: clean(c.why, 160), areas: [], skills: [], level: toLevel(c.level, level), modules, quiz: [] } as Course;
    })
    .filter((c) => c.title && c.modules.length >= 2);
}

/** Courses built from the student's interests and degree when the AI isn't available. */
export function fallbackCourses(setup: SetupData | undefined, goals?: GoalLike[]): Course[] {
  const level = toLevel(setup?.level, "beginner");
  return withGoalCourses(interestCourses(setup, level), goals, level);
}

function interestCourses(setup: SetupData | undefined, level: CourseLevel): Course[] {
  const areas = [...new Set([...(setup?.goals.interests ?? []), ...areasFromAcademics(setup)])].filter((a) => a !== "other");
  const picked = (areas.length ? areas : ["tech"]).slice(0, 4);
  return picked
    .map((area): Course | null => {
      const topics = TOPICS.filter((t) => t.area === area);
      if (!topics.length) return null;
      const name = label(INTERESTS, area);
      return {
        id: `ai-${slug(name)}`,
        title: `${name} essentials`,
        blurb: `Start with ${topics.map((t) => t.label.toLowerCase()).join(" and ")}, picked from your interests.`,
        areas: [area],
        skills: [],
        level,
        modules: topics.map((t, i) => ({ id: `m${i + 1}`, title: t.label, yt: "", topic: t.q, channel: "", length: "", about: `The most viewed full course on ${t.label.toLowerCase()}.` })),
        quiz: [],
      };
    })
    .filter((c): c is Course => !!c);
}

/** Keeps only valid multiple-choice questions. */
export function sanitizeQuiz(raw: unknown): QuizQuestion[] {
  const start = typeof raw === "string" ? raw.indexOf("[") : -1;
  let arr: unknown = raw;
  if (typeof raw === "string") {
    const end = raw.lastIndexOf("]");
    try {
      arr = start >= 0 && end > start ? JSON.parse(raw.slice(start, end + 1)) : [];
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => x as { q?: unknown; options?: unknown[]; answer?: unknown; hint?: unknown; module?: unknown })
    .map((x) => {
      const hint = clean(x.hint, 200);
      const module = Number(x.module);
      return {
        q: clean(x.q, 200),
        options: (Array.isArray(x.options) ? x.options : []).map((o) => clean(o, 120)).slice(0, 4),
        answer: Number(x.answer),
        ...(hint ? { hint } : {}),
        ...(Number.isInteger(module) && module >= 0 && module < 12 ? { module } : {}),
      };
    })
    .filter((x) => x.q && x.options.length === 4 && x.options.every(Boolean) && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4);
}
