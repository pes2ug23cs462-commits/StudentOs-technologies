/* Placement preparation: the student's readiness, a resume check, this week's
   plan, and how the big campus recruiters usually hire. */

import { aptitudeScore, topicStats, TOPIC, TOPICS, type TopicId } from "@/lib/aptitude";
import { readinessFromParts, type PlacementPart } from "@/lib/college";
import { resumeCheck } from "@/lib/resume-check";
export { resumeCheck, type ResumeCheck } from "@/lib/resume-check";
import type { AppState } from "@/lib/store";

/* ---------- readiness ---------- */

export function myReadiness(state: AppState) {
  const iv = state.interviews ?? [];
  const parts: Record<PlacementPart, number> = {
    Aptitude: aptitudeScore(state.aptitude),
    Coding: Math.min(100, Object.keys(state.coding?.solved ?? {}).length * 10),
    Interviews: iv.length ? Math.round(iv.slice(0, 5).reduce((n, i) => n + i.feedback.overall, 0) / Math.min(5, iv.length)) : 0,
    Projects: Math.min(100, (state.entries ?? []).filter((e) => e.kind === "project").length * 34),
    Resume: resumeCheck(state).score,
  };
  return { parts, overall: readinessFromParts(parts) };
}

/* ---------- this week's plan ---------- */

export type PlanTask = { part: PlacementPart; text: string; href: string };
export function weekPlan(state: AppState): PlanTask[] {
  const { parts } = myReadiness(state);
  const order = (Object.keys(parts) as PlacementPart[]).sort((a, b) => parts[a] - parts[b]);
  const stats = topicStats(state.aptitude);
  const weakTopic = TOPICS.map((t) => t.id).sort((a, b) => (stats[a]?.pct ?? -1) - (stats[b]?.pct ?? -1))[0] as TopicId;
  const resume = resumeCheck(state).items.find((i) => !i.ok);
  const solved = Object.keys(state.coding?.solved ?? {}).length;
  const make: Record<PlacementPart, PlanTask[]> = {
    Aptitude: [
      { part: "Aptitude", text: `Practise ${TOPIC[weakTopic].name.toLowerCase()} (10 questions)`, href: `/placement?tab=aptitude&topic=${weakTopic}` },
      { part: "Aptitude", text: "Take one full aptitude mock (30 questions, 30 min)", href: "/placement?tab=aptitude&mock=1" },
    ],
    Coding: [{ part: "Coding", text: solved < 5 ? "Solve 3 Easy coding problems" : "Solve 2 Medium coding problems", href: "/code" }],
    Interviews: [{ part: "Interviews", text: "Do one mock interview in strict mode", href: "/interview" }],
    Projects: [{ part: "Projects", text: "Add a project you built, with what it does and the tools you used", href: "/projects" }],
    Resume: [{ part: "Resume", text: resume ? `Resume: ${resume.text.charAt(0).toLowerCase()}${resume.text.slice(1)}` : "Tailor your resume to your next drive", href: "/resume" }],
  };
  return order.slice(0, 3).flatMap((p) => make[p]).slice(0, 5);
}

/* ---------- companies ---------- */

export type PracticeLink = { label: string; href: string };
export type Company = {
  id: string;
  name: string;
  program: string;
  steps: { name: string; what: string }[];
  practice: PracticeLink[];
  tip: string;
  url: string;
  sources: { title: string; url: string }[];
};
const APT = (t: TopicId | "mock"): PracticeLink => (t === "mock" ? { label: "Aptitude mock", href: "/placement?tab=aptitude&mock=1" } : { label: TOPIC[t].name, href: `/placement?tab=aptitude&topic=${t}` });
const CODE: PracticeLink = { label: "Coding problems", href: "/code" };
const IV: PracticeLink = { label: "Mock interview", href: "/interview" };
const HR: PracticeLink = { label: "HR mock interview", href: "/interview" };

/** How each company usually hires freshers, from public guides. Patterns change between drives: the invite is the final word. */
export const COMPANIES: Company[] = [
  {
    id: "tcs",
    name: "TCS",
    program: "National Qualifier Test (NQT)",
    steps: [
      { name: "NQT: Foundation", what: "Verbal, reasoning and numerical ability. Everyone takes it." },
      { name: "NQT: Advanced", what: "Advanced aptitude and coding, needed for the higher Digital and Prime roles." },
      { name: "Interview", what: "Technical, managerial and HR questions, often in one sitting." },
    ],
    practice: [APT("mock"), APT("series"), CODE, IV],
    tip: "The NQT is about 190 minutes with no negative marking, so attempt every question.",
    url: "https://www.tcs.com/careers",
    sources: [{ title: "FACE Prep: TCS NQT exam pattern 2026", url: "https://www.faceprep.in/article/tcs-exam-pattern/" }],
  },
  {
    id: "infosys",
    name: "Infosys",
    program: "Systems Engineer, DSE and Specialist Programmer tracks",
    steps: [
      { name: "Online test", what: "Aptitude, reasoning and verbal; harder coding for the DSE and Specialist Programmer tracks." },
      { name: "Technical interview", what: "Your projects, one programming language, DBMS and OOP basics." },
      { name: "HR interview", what: "Communication, relocation and shifts." },
    ],
    practice: [APT("mock"), APT("profit"), CODE, IV],
    tip: "Pick your track early: the Systems Engineer route rewards aptitude, the higher tracks reward DSA.",
    url: "https://www.infosys.com/careers/",
    sources: [{ title: "FACE Prep: Infosys recruitment pattern 2026", url: "https://www.faceprep.in/article/infosys-recruitment-pattern-2018/" }],
  },
  {
    id: "wipro",
    name: "Wipro",
    program: "Elite National Talent Hunt",
    steps: [
      { name: "Online assessment", what: "Aptitude, a written essay and two coding problems." },
      { name: "Technical interview", what: "Projects, coding basics and core CS subjects." },
      { name: "HR interview", what: "Fit, location, service agreement and documents." },
    ],
    practice: [APT("mock"), APT("errors"), CODE, IV],
    tip: "Practise writing a short, clean essay: grammar and structure are marked.",
    url: "https://careers.wipro.com/",
    sources: [{ title: "FACE Prep: Wipro recruitment process 2026", url: "https://faceprep.in/article/wipro-recruitment-process-2025-complete-guide-to-placement-rounds/" }],
  },
  {
    id: "accenture",
    name: "Accenture",
    program: "Associate Software Engineer",
    steps: [
      { name: "Cognitive & technical", what: "Reasoning, verbal and abstract questions, plus pseudocode and CS basics." },
      { name: "Coding", what: "Usually two easy-to-medium problems." },
      { name: "Communication", what: "A spoken English test, graded automatically." },
      { name: "Interview", what: "Technical and HR together." },
    ],
    practice: [APT("syllogism"), APT("odd"), CODE, HR],
    tip: "The spoken English test catches many students. Practise answering out loud with the voice mock interview.",
    url: "https://www.accenture.com/in-en/careers",
    sources: [{ title: "PlacementPreparation.io: Accenture recruitment process 2026", url: "https://www.placementpreparation.io/accenture/recruitment-process/" }],
  },
  {
    id: "cognizant",
    name: "Cognizant",
    program: "GenC",
    steps: [
      { name: "Communication", what: "An automated English test: reading, repeating and answering." },
      { name: "Aptitude", what: "Quantitative, logical and verbal questions." },
      { name: "Technical / coding", what: "Coding or technical questions based on the role." },
      { name: "Interview", what: "Technical and HR panel." },
    ],
    practice: [APT("mock"), APT("blanks"), CODE, HR],
    tip: "Every round eliminates, so don't skip the English practice.",
    url: "https://careers.cognizant.com/",
    sources: [{ title: "PlacementPreparation.io: Cognizant GenC recruitment 2026", url: "https://www.placementpreparation.io/cognizant-genc/recruitment-process/" }],
  },
  {
    id: "capgemini",
    name: "Capgemini",
    program: "Exceller",
    steps: [
      { name: "Technical & pseudocode", what: "Programming basics, OOP, DBMS, networks and pseudocode." },
      { name: "English", what: "Grammar, reading and a short written answer." },
      { name: "Game-based aptitude", what: "Puzzles that test speed, memory and patterns, not multiple choice." },
      { name: "Interviews", what: "Technical and HR." },
    ],
    practice: [APT("series"), APT("coding"), CODE, IV],
    tip: "The game-based round scores speed and accuracy together. Timed series and coding–decoding practice helps.",
    url: "https://www.capgemini.com/in-en/careers/",
    sources: [{ title: "FACE Prep: Capgemini 2026 recruitment pattern", url: "https://www.faceprep.in/article/capgemini-recruitment-pattern-and-about-the-company/" }],
  },
];
