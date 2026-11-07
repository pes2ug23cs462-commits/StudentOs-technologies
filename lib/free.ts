/* Free-version features: learning resources, projects & experience,
   college timeline and resume. Data shapes, the resource catalogue and helpers. */

import type { SetupData } from "./setup";

/* ---------------- Learning resources ---------------- */

export type ResourceLevel = "beginner" | "intermediate" | "advanced";
export type ResourceFormat = "Course" | "Video series" | "Interactive" | "Reading";

export interface Resource {
  id: string;
  title: string;
  provider: string;
  url: string;
  /** matches INTERESTS values in setup.ts */
  areas: string[];
  level: ResourceLevel;
  format: ResourceFormat;
  hours: string;
  blurb: string;
}

/** Open, free resources. All link to the provider’s own site. */
export const RESOURCES: Resource[] = [
  { id: "cs50p", title: "CS50’s Introduction to Programming with Python", provider: "Harvard · CS50", url: "https://cs50.harvard.edu/python/", areas: ["tech", "projects"], level: "beginner", format: "Course", hours: "~10 weeks", blurb: "Functions, loops, libraries, tests and OOP in Python, with problem sets." },
  { id: "cs50x", title: "CS50’s Introduction to Computer Science", provider: "Harvard · CS50", url: "https://cs50.harvard.edu/x/", areas: ["tech"], level: "beginner", format: "Course", hours: "~11 weeks", blurb: "The classic intro to computer science: C, Python, SQL and web basics." },
  { id: "fcc-web", title: "Responsive Web Design", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/", areas: ["tech", "design", "projects"], level: "beginner", format: "Interactive", hours: "Self-paced", blurb: "Build web pages with HTML and CSS through hands-on projects." },
  { id: "odin", title: "The Odin Project — Foundations", provider: "The Odin Project", url: "https://www.theodinproject.com/", areas: ["tech", "projects"], level: "beginner", format: "Reading", hours: "Self-paced", blurb: "A full-stack web development path built around real projects." },
  { id: "kaggle-py", title: "Kaggle Learn — Python & Pandas", provider: "Kaggle", url: "https://www.kaggle.com/learn", areas: ["data", "tech"], level: "beginner", format: "Interactive", hours: "~10 hours", blurb: "Short, practical notebooks for Python, pandas and data visualisation." },
  { id: "google-ml", title: "Machine Learning Crash Course", provider: "Google", url: "https://developers.google.com/machine-learning/crash-course", areas: ["data", "tech"], level: "intermediate", format: "Course", hours: "~15 hours", blurb: "A fast-paced introduction to machine learning with exercises." },
  { id: "mit-ocw", title: "MIT OpenCourseWare", provider: "MIT", url: "https://ocw.mit.edu/", areas: ["tech", "data", "business", "arts", "health"], level: "advanced", format: "Course", hours: "Varies", blurb: "Lecture notes, videos and assignments from real MIT courses." },
  { id: "nptel", title: "NPTEL Courses", provider: "IITs & IISc", url: "https://nptel.ac.in/", areas: ["tech", "exams", "business", "health"], level: "intermediate", format: "Course", hours: "4–12 weeks", blurb: "Free university-level courses from Indian institutes, in English and regional languages." },
  { id: "khan", title: "Khan Academy", provider: "Khan Academy", url: "https://www.khanacademy.org/", areas: ["exams", "commerce", "arts", "data"], level: "beginner", format: "Video series", hours: "Self-paced", blurb: "Maths, science, economics and more, with practice exercises." },
  { id: "swayam", title: "SWAYAM", provider: "Government of India", url: "https://swayam.gov.in/", areas: ["exams", "commerce", "arts", "business", "health"], level: "beginner", format: "Course", hours: "Varies", blurb: "Free courses from school to postgraduate level across many subjects." },
  { id: "figma-learn", title: "Figma Learn — Design basics", provider: "Figma", url: "https://help.figma.com/hc/en-us/categories/360002051613", areas: ["design"], level: "beginner", format: "Reading", hours: "Self-paced", blurb: "Learn Figma from the official guides and tutorials." },
  { id: "mdn", title: "MDN Learn web development", provider: "Mozilla", url: "https://developer.mozilla.org/en-US/docs/Learn", areas: ["tech", "projects"], level: "intermediate", format: "Reading", hours: "Self-paced", blurb: "The reference guide to HTML, CSS and JavaScript, from the basics up." },
  { id: "yc-startup", title: "Startup School", provider: "Y Combinator", url: "https://www.startupschool.org/", areas: ["entrepreneurship", "business"], level: "intermediate", format: "Video series", hours: "Self-paced", blurb: "How to start a startup: ideas, users, growth and fundraising." },
  { id: "gdg-ux", title: "Google UX Design (audit)", provider: "Coursera · Google", url: "https://www.coursera.org/professional-certificates/google-ux-design", areas: ["design"], level: "beginner", format: "Course", hours: "~6 months", blurb: "Audit the course videos for free to learn the UX design process." },
  { id: "hbs-online", title: "Introduction to Finance (OpenCourseWare)", provider: "MIT", url: "https://ocw.mit.edu/search/?t=Finance", areas: ["commerce", "business"], level: "intermediate", format: "Course", hours: "Varies", blurb: "Open finance and economics courses with lecture notes and problem sets." },
  { id: "cs50ai", title: "CS50’s Introduction to AI with Python", provider: "Harvard · CS50", url: "https://cs50.harvard.edu/ai/", areas: ["tech", "data"], level: "advanced", format: "Course", hours: "~7 weeks", blurb: "Search, knowledge, optimisation, machine learning and neural networks." },
];

/** Free plan: how many resources can be in “My learning” at once. */
export const FREE_LIBRARY_LIMIT = 3;

export interface Library {
  /** resource id → status */
  items: Record<string, "saved" | "in-progress" | "done">;
}
export const emptyLibrary = (): Library => ({ items: {} });

export function recommend(setup: SetupData | undefined, list = RESOURCES) {
  const interests = setup?.goals.interests ?? [];
  const level = setup?.level ?? "beginner";
  const order: ResourceLevel[] = ["beginner", "intermediate", "advanced"];
  const li = order.indexOf(level);
  return [...list]
    .map((r) => {
      const areaHits = r.areas.filter((a) => interests.includes(a)).length;
      const levelGap = Math.abs(order.indexOf(r.level) - li);
      return { r, score: areaHits * 3 - levelGap * 2 };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

/* ---------------- Projects & experience ---------------- */

export type EntryKind = "project" | "internship" | "hackathon" | "achievement" | "volunteering";
export const ENTRY_KINDS: { value: EntryKind; label: string }[] = [
  { value: "project", label: "Project" },
  { value: "internship", label: "Internship / work" },
  { value: "hackathon", label: "Hackathon / competition" },
  { value: "achievement", label: "Achievement / award" },
  { value: "volunteering", label: "Volunteering / club" },
];

export interface Entry {
  id: string;
  kind: EntryKind;
  title: string;
  org: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM or "" for present
  description: string;
  skills: string[];
  link: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-03" → "Mar 2026", "" → "Present" */
export const monthLabel = (ym: string) => {
  if (!ym) return "Present";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const PROJECT_IDEAS: { title: string; level: ResourceLevel; areas: string[]; sub: string; skills: string[] }[] = [
  { title: "Personal portfolio website", level: "beginner", areas: ["tech", "design", "projects"], sub: "A one-page site with your projects and resume.", skills: ["HTML", "CSS", "Git"] },
  { title: "Expense tracker", level: "beginner", areas: ["tech", "commerce", "data"], sub: "Log spending and see monthly charts.", skills: ["Python", "CSV", "Charts"] },
  { title: "College event app", level: "intermediate", areas: ["tech", "projects", "social"], sub: "List clubs and events with sign-ups.", skills: ["React", "Firebase"] },
  { title: "Placement data dashboard", level: "intermediate", areas: ["data", "business"], sub: "Analyse past placement data and visualise trends.", skills: ["Pandas", "SQL", "Charts"] },
  { title: "App redesign case study", level: "beginner", areas: ["design"], sub: "Redesign a screen of an app you use and explain why.", skills: ["Figma", "UX research"] },
  { title: "Small business landing page", level: "beginner", areas: ["entrepreneurship", "business", "design"], sub: "Help a local shop get online.", skills: ["Design", "Copywriting"] },
  { title: "Study-notes summariser", level: "advanced", areas: ["tech", "data"], sub: "Summarise lecture notes with an open-source model.", skills: ["Python", "NLP", "APIs"] },
  { title: "Open-source contribution", level: "advanced", areas: ["tech", "projects"], sub: "Fix a ‘good first issue’ in a project you use.", skills: ["Git", "GitHub", "Code review"] },
];

/* ---------------- College timeline ---------------- */

export type TimelineKind = "exam" | "internship" | "hackathon" | "placement" | "milestone" | "personal";
export const TIMELINE_KINDS: { value: TimelineKind; label: string; tone: string }[] = [
  { value: "milestone", label: "Milestone", tone: "violet" },
  { value: "exam", label: "Exam", tone: "rose" },
  { value: "internship", label: "Internship", tone: "sky" },
  { value: "hackathon", label: "Hackathon", tone: "amber" },
  { value: "placement", label: "Placement", tone: "emerald" },
  { value: "personal", label: "Personal", tone: "gray" },
];

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  date: string; // YYYY-MM-DD
  note: string;
  done: boolean;
  /** created from the suggested roadmap */
  suggested?: boolean;
}

/** Year number (1–4) from “2nd Year” etc. */
export function yearNumber(year: string | undefined) {
  const m = year?.match(/(\d)/);
  return m ? Math.min(5, Math.max(1, Number(m[1]))) : 1;
}

/** Suggested roadmap for a 4-year degree, dated from the current year of study.
    Academic years run July → June. */
export function suggestedTimeline(currentYear: number, today = new Date()): TimelineEvent[] {
  const ayStart = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1; // July of current academic year
  const yearStart = (y: number) => ayStart + (y - currentYear);
  const d = (y: number, month: number, day = 1) => {
    const yr = yearStart(y) + (month < 7 ? 1 : 0);
    return `${yr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const plan: [number, number, TimelineKind, string, string][] = [
    [1, 8, "milestone", "Join 2 clubs or communities", "Coding, design, debate or entrepreneurship cell."],
    [1, 11, "exam", "Semester 1 exams", "Revise with your study plan from mid-October."],
    [1, 3, "milestone", "Finish your first online course", "Pick one from Learning."],
    [1, 5, "exam", "Semester 2 exams", ""],
    [2, 8, "milestone", "Build your first project", "Add it to Projects & Experience."],
    [2, 10, "hackathon", "Take part in a hackathon", "Online hackathons are a good start."],
    [2, 11, "exam", "Semester 3 exams", ""],
    [2, 1, "internship", "Apply for summer internships", "Most applications open between January and March."],
    [2, 5, "exam", "Semester 4 exams", ""],
    [2, 6, "internship", "Summer internship or project", "Two months of real-world work."],
    [3, 8, "milestone", "Update resume and LinkedIn", "Add your internship and projects."],
    [3, 11, "exam", "Semester 5 exams", ""],
    [3, 1, "internship", "Apply for pre-final year internships", "These often lead to pre-placement offers."],
    [3, 5, "exam", "Semester 6 exams", ""],
    [3, 6, "internship", "Pre-final year internship", ""],
    [4, 7, "placement", "Placement season begins", "Aptitude, coding rounds and interviews."],
    [4, 11, "exam", "Semester 7 exams", ""],
    [4, 2, "milestone", "Final-year project", "Plan it with your Study Plan."],
    [4, 5, "exam", "Final semester exams", ""],
    [4, 6, "milestone", "Graduation", "🎓"],
  ];
  return plan.map(([y, m, kind, title, note], i) => ({ id: `sg${i}`, kind, title, note, date: d(y, m), done: false, suggested: true }));
}

/* ---------------- Resume ---------------- */

export interface ResumeData {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  education: { school: string; degree: string; years: string; score: string };
  skills: string;
  /** ids of Entries to include */
  entryIds: string[];
  template: "classic" | "modern" | "professional"; // only "professional" is used now
}
