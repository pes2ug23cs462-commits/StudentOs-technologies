/* Exam Prep for school / PU students (II PUC, CBSE 12, NEET, KCET):
   chapter lists, short notes and exam-style practice per chapter, weak
   chapters first, and a focus timer. Chapters follow the current NCERT
   Class 12 books, which II PUC (Karnataka), CBSE, NEET and KCET use. */

export type ExamId = "puc" | "cbse" | "neet" | "kcet";
export type Subject = "Physics" | "Chemistry" | "Biology" | "Maths";

export const EXAMS: { id: ExamId; label: string; sub: string; subjects: Subject[] }[] = [
  { id: "puc", label: "II PUC", sub: "Karnataka board", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
  { id: "cbse", label: "CBSE 12", sub: "Board exam", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
  { id: "neet", label: "NEET", sub: "Medical entrance", subjects: ["Physics", "Chemistry", "Biology"] },
  { id: "kcet", label: "KCET", sub: "Karnataka CET", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
];

export const CHAPTERS: Record<Subject, string[]> = {
  Physics: [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics",
  ],
  Chemistry: [
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "The d- and f-Block Elements",
    "Coordination Compounds",
    "Haloalkanes and Haloarenes",
    "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids",
    "Amines",
    "Biomolecules",
  ],
  Biology: [
    "Sexual Reproduction in Flowering Plants",
    "Human Reproduction",
    "Reproductive Health",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Evolution",
    "Human Health and Disease",
    "Microbes in Human Welfare",
    "Biotechnology: Principles and Processes",
    "Biotechnology and its Applications",
    "Organisms and Populations",
    "Ecosystem",
    "Biodiversity and Conservation",
  ],
  Maths: [
    "Relations and Functions",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Application of Derivatives",
    "Integrals",
    "Application of Integrals",
    "Differential Equations",
    "Vector Algebra",
    "Three Dimensional Geometry",
    "Linear Programming",
    "Probability",
  ],
};

export const chapterKey = (subject: Subject, chapter: string) => `${subject}/${chapter}`;

export interface ChapterNotes {
  summary: string;
  points: string[];
  formulas: string[];
  mistakes: string[];
  at: number;
}
export interface PracticeQ {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}
export interface ChapterScore {
  best: number;
  last: number;
  attempts: number;
  at: number;
}
export interface ExamPrepState {
  exam?: ExamId;
  scores?: Record<string, ChapterScore>;
  notes?: Record<string, ChapterNotes>;
  /** days with at least one finished focus session (YYYY-MM-DD) and minutes per day */
  focus?: Record<string, number>;
}

export type Status = "new" | "weak" | "ok" | "strong";
export function statusOf(s: ChapterScore | undefined): Status {
  if (!s) return "new";
  if (s.last < 60) return "weak";
  if (s.last < 80) return "ok";
  return "strong";
}
export const STATUS_LABEL: Record<Status, string> = { new: "Not started", weak: "Weak", ok: "Getting there", strong: "Strong" };

/** Days in a row (up to today) with a finished focus session. */
export function focusStreak(focus: Record<string, number> | undefined, today = new Date()) {
  let n = 0;
  const d = new Date(today);
  for (;;) {
    const k = d.toISOString().slice(0, 10);
    if (!focus?.[k]) {
      if (n === 0 && d.toDateString() === today.toDateString()) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      return n;
    }
    n++;
    d.setDate(d.getDate() - 1);
  }
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => clean(x, max)).filter(Boolean).slice(0, n);

export function sanitizeNotes(raw: unknown): ChapterNotes | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const points = list(r.points, 10, 220);
  if (points.length < 3) return null;
  return { summary: clean(r.summary, 400), points, formulas: list(r.formulas, 8, 140), mistakes: list(r.mistakes, 5, 180), at: Date.now() };
}

export function sanitizeQuestions(raw: unknown): PracticeQ[] {
  const arr = (raw as { questions?: unknown[] })?.questions;
  return (Array.isArray(arr) ? arr : [])
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .map((x) => ({ q: clean(x.q, 400), options: list(x.options, 4, 160), answer: Number(x.answer), explain: clean(x.explain, 400) }))
    .filter((x) => x.q && x.options.length === 4 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4)
    .slice(0, 10);
}
