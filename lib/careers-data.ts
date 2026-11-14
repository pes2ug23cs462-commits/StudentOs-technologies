/* Careers data shared by the page, the team console and the server (no Firebase here). */

export const CAREER_TEAMS = ["Engineering", "Design", "Marketing", "Content", "Operations"] as const;
export type CareerTeam = (typeof CAREER_TEAMS)[number];
export type CareerRole = {
  id: string;
  title: string;
  team: CareerTeam;
  where: string; // Remote / Bengaluru / Hybrid
  pay: string; // Unpaid / ₹5,000 a month
  length: string; // 3 months / Full-time
  tags: string[];
  does: string[];
  wants: string[];
  paused?: boolean;
  postedAt: number;
  /** AI interview after applying (default on) */
  ai?: boolean;
  /** days to finish the interview after applying (default 3) */
  within?: number;
  /** or one fixed window for everyone (ms), used when set */
  windowStart?: number;
  windowEnd?: number;
  /** how many questions the AI asks (default 6) */
  questions?: number;
  /** what the AI interview should check, in the team’s words */
  ivFocus?: string;
};

export type CareersDoc = { open: boolean; roles: CareerRole[]; updatedAt: number };

const r = (id: string, title: string, team: CareerTeam, tags: string[], does: string[], wants: string[]): CareerRole => ({ id, title, team, where: "Remote", pay: "Unpaid", length: "3 months", tags, does, wants, postedAt: 0 });

export const DEFAULT_ROLES: CareerRole[] = [
  r("fullstack", "Full-stack Developer Intern", "Engineering", ["Next.js", "React", "Firebase"],
    ["Build features students and colleges use every day", "Fix bugs and make pages faster on phones", "Work with the technical co-founder on code reviews"],
    ["You’ve built something with React or Next.js", "Comfortable with Git and reading other people’s code", "A GitHub link or a project we can look at"]),
  r("aiml", "AI/ML Intern", "Engineering", ["AI", "LLMs", "Python"],
    ["Improve the AI tutor, study planner and mock interviews", "Write and test prompts, measure answer quality", "Try new models and tell us what works"],
    ["Python basics and curiosity about LLMs", "You can explain a model’s mistake in plain words", "A notebook, project or write-up to share"]),
  r("design", "UI/UX Design Intern", "Design", ["Figma", "UX", "Mobile"],
    ["Design new screens in Figma, light and dark", "Talk to students and turn feedback into fixes", "Keep our design system tidy"],
    ["A Figma file or portfolio with real screens", "You care about spacing, contrast and small phones", "Open to feedback and quick changes"]),
  r("marketing", "Marketing Intern", "Marketing", ["Growth", "Social", "Campus"],
    ["Bring StudentOS to your campus and others", "Run Instagram, LinkedIn and WhatsApp campaigns", "Track what works with simple numbers"],
    ["You know how students find and share apps", "Good at writing short, clear posts", "Comfortable talking to college clubs and staff"]),
  r("content", "Content & Graphics Intern", "Content", ["Content", "Canva", "Video"],
    ["Make posts, reels and short explainers", "Write help pages and app text", "Keep our look the same everywhere"],
    ["Samples of posts, designs or videos you made", "Clear English; Hindi or Kannada is a plus", "Eye for detail"]),
];

export const DEFAULT_CAREERS: CareersDoc = { open: true, roles: DEFAULT_ROLES, updatedAt: 0 };


/* ---------- applications ---------- */
export type CareerDecision = "" | "shortlisted" | "rejected" | "offer-sent" | "hired";
export type CareerStage = "invited" | "in-progress" | "completed" | "missed";
export type CareerReport = { overall: number; verdict: string; summary: string; strengths: string[]; concerns: string[]; items: { score: number; note: string }[] };
export type CareerApp = {
  token: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  roleId: string;
  role: string;
  links: string;
  /** link to their resume (Google Drive, Dropbox, a PDF) */
  resume: string;
  why: string;
  appliedAt: number;
  start: number;
  end: number;
  ai: boolean;
  stage: CareerStage;
  questions: string[];
  answers: { a: string; secs: number }[];
  flags: { tabs: number; pastes: number };
  startedAt?: number;
  completedAt?: number;
  report: CareerReport | null;
  decision: CareerDecision;
  note: string;
};
export const DECISION_LABEL: Record<Exclude<CareerDecision, "">, string> = { shortlisted: "Shortlisted", rejected: "Not selected", "offer-sent": "Offer sent", hired: "Hired" };
/** "missed" is worked out from the time, so it is always current */
export const stageOf = (a: Pick<CareerApp, "stage" | "end" | "ai">, now = Date.now()): CareerStage => (a.ai && a.stage !== "completed" && now > a.end ? "missed" : a.stage);
export const fmtWhen = (ms: number) => new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
