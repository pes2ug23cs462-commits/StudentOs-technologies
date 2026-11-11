/* Exam Prep for school / PU students (SSLC, 1st & 2nd PUC, CBSE 10–12, NEET, KCET):
   chapter lists, short notes and exam-style practice per chapter, weak
   chapters first, and a focus timer. Chapters follow the current NCERT
   Class 10, 11 and 12 books. */

import type { SetupData } from "./setup";

/** Class 8–10 start on Class 10, Class 11 on 1st PUC / Class 11, everyone else on Class 12. */
export function defaultGrade(setup: SetupData | undefined): Grade {
  const y = setup?.academic.year ?? "";
  if (/\b(8|9|10)\b/.test(y)) return 10;
  return /\b11\b/.test(y) ? 11 : 12;
}
/** Exam Prep is only for school students (Class 10, 11, 12 / PU). */
export const showExamPrep = (setup: SetupData | undefined) => setup?.academic.type === "school";

export type ExamId = "sslc" | "puc" | "cbse" | "neet" | "kcet";
export type Grade = 10 | 11 | 12;
export type Subject =
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Maths"
  | "Science"
  | "Social Science"
  | "English"
  | "Hindi"
  | "Accountancy"
  | "Business Studies"
  | "Economics"
  | "History"
  | "Political Science"
  | "Sociology";
/** Class 11–12 stream. */
export type Stream = "science" | "commerce" | "arts";
export const STREAMS: { id: Stream; label: string }[] = [
  { id: "science", label: "Science" },
  { id: "commerce", label: "Commerce" },
  { id: "arts", label: "Arts" },
];
/** Stream from setup ("Commerce", "Arts / Humanities"…); Science otherwise. */
export function defaultStream(setup: SetupData | undefined): Stream {
  const f = setup?.academic.field ?? "";
  return /commerce/i.test(f) ? "commerce" : /arts|humanities/i.test(f) ? "arts" : "science";
}

export const EXAMS: { id: ExamId; label: string; sub: string; subjects: Subject[] }[] = [
  { id: "sslc", label: "SSLC", sub: "Karnataka Class 10", subjects: ["Maths", "Science", "Social Science"] },
  { id: "puc", label: "PUC", sub: "Karnataka board", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
  { id: "cbse", label: "CBSE", sub: "Board exam", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
  { id: "neet", label: "NEET", sub: "Medical entrance", subjects: ["Physics", "Chemistry", "Biology"] },
  { id: "kcet", label: "KCET", sub: "Karnataka CET", subjects: ["Physics", "Chemistry", "Maths", "Biology"] },
];

/** Class 11 / 1st PUC (current NCERT books). */
export const CHAPTERS_11: Partial<Record<Subject, string[]>> = {
  Physics: [
    "Units and Measurements",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work, Energy and Power",
    "System of Particles and Rotational Motion",
    "Gravitation",
    "Mechanical Properties of Solids",
    "Mechanical Properties of Fluids",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Kinetic Theory",
    "Oscillations",
    "Waves",
  ],
  Chemistry: [
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "Classification of Elements and Periodicity in Properties",
    "Chemical Bonding and Molecular Structure",
    "Thermodynamics",
    "Equilibrium",
    "Redox Reactions",
    "Organic Chemistry: Some Basic Principles and Techniques",
    "Hydrocarbons",
  ],
  Biology: [
    "The Living World",
    "Biological Classification",
    "Plant Kingdom",
    "Animal Kingdom",
    "Morphology of Flowering Plants",
    "Anatomy of Flowering Plants",
    "Structural Organisation in Animals",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
    "Photosynthesis in Higher Plants",
    "Respiration in Plants",
    "Plant Growth and Development",
    "Breathing and Exchange of Gases",
    "Body Fluids and Circulation",
    "Excretory Products and their Elimination",
    "Locomotion and Movement",
    "Neural Control and Coordination",
    "Chemical Coordination and Integration",
  ],
  Maths: [
    "Sets",
    "Relations and Functions",
    "Trigonometric Functions",
    "Complex Numbers and Quadratic Equations",
    "Linear Inequalities",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequences and Series",
    "Straight Lines",
    "Conic Sections",
    "Introduction to Three Dimensional Geometry",
    "Limits and Derivatives",
    "Statistics",
    "Probability",
  ],
};

Object.assign(CHAPTERS_11, {
  Accountancy: [
    "Introduction to Accounting",
    "Theory Base of Accounting",
    "Recording of Transactions I",
    "Recording of Transactions II",
    "Bank Reconciliation Statement",
    "Trial Balance and Rectification of Errors",
    "Depreciation, Provisions and Reserves",
    "Financial Statements I",
    "Financial Statements II",
  ],
  "Business Studies": [
    "Business, Trade and Commerce",
    "Forms of Business Organisation",
    "Private, Public and Global Enterprises",
    "Business Services",
    "Emerging Modes of Business",
    "Social Responsibilities of Business and Business Ethics",
    "Sources of Business Finance",
    "Small Business and Entrepreneurship",
    "Internal Trade",
    "International Business",
  ],
  Economics: [
    "Statistics: Introduction",
    "Statistics: Collection of Data",
    "Statistics: Organisation of Data",
    "Statistics: Presentation of Data",
    "Statistics: Measures of Central Tendency",
    "Statistics: Correlation",
    "Statistics: Index Numbers",
    "Indian Economy on the Eve of Independence",
    "Indian Economy 1950–1990",
    "Liberalisation, Privatisation and Globalisation: An Appraisal",
    "Human Capital Formation in India",
    "Rural Development",
    "Employment: Growth, Informalisation and Other Issues",
    "Environment and Sustainable Development",
    "Comparative Development Experiences of India and its Neighbours",
  ],
  History: [
    "Writing and City Life",
    "An Empire Across Three Continents",
    "Nomadic Empires",
    "The Three Orders",
    "Changing Cultural Traditions",
    "Displacing Indigenous Peoples",
    "Paths to Modernisation",
  ],
  "Political Science": [
    "Constitution: Why and How?",
    "Rights in the Indian Constitution",
    "Election and Representation",
    "Executive",
    "Legislature",
    "Judiciary",
    "Federalism",
    "Local Governments",
    "Constitution as a Living Document",
    "The Philosophy of the Constitution",
    "Political Theory: An Introduction",
    "Freedom",
    "Equality",
    "Social Justice",
    "Rights",
    "Citizenship",
    "Nationalism",
    "Secularism",
  ],
  Sociology: [
    "Sociology, Society and its Relationship with Other Social Sciences",
    "Terms, Concepts and their Use in Sociology",
    "Understanding Social Institutions",
    "Culture and Socialisation",
    "Doing Sociology: Research Methods",
    "Social Structure, Stratification and Social Processes in Society",
    "Social Change and Social Order in Rural and Urban Society",
    "Introducing Western Sociologists",
    "Indian Sociologists",
  ],
} satisfies Partial<Record<Subject, string[]>>);

/** Class 12 / 2nd PUC (current NCERT books). */
export const CHAPTERS: Partial<Record<Subject, string[]>> = {
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

Object.assign(CHAPTERS, {
  Accountancy: [
    "Accounting for Partnership: Basic Concepts",
    "Reconstitution of a Partnership Firm: Admission of a Partner",
    "Reconstitution of a Partnership Firm: Retirement and Death of a Partner",
    "Dissolution of Partnership Firm",
    "Accounting for Share Capital",
    "Issue and Redemption of Debentures",
    "Financial Statements of a Company",
    "Analysis of Financial Statements",
    "Accounting Ratios",
    "Cash Flow Statement",
  ],
  "Business Studies": [
    "Nature and Significance of Management",
    "Principles of Management",
    "Business Environment",
    "Planning",
    "Organising",
    "Staffing",
    "Directing",
    "Controlling",
    "Financial Management",
    "Financial Markets",
    "Marketing",
    "Consumer Protection",
  ],
  Economics: [
    "Microeconomics: Introduction",
    "Theory of Consumer Behaviour",
    "Production and Costs",
    "The Theory of the Firm under Perfect Competition",
    "Market Equilibrium",
    "Macroeconomics: Introduction",
    "National Income Accounting",
    "Money and Banking",
    "Determination of Income and Employment",
    "Government Budget and the Economy",
    "Open Economy Macroeconomics",
  ],
  History: [
    "Bricks, Beads and Bones",
    "Kings, Farmers and Towns",
    "Kinship, Caste and Class",
    "Thinkers, Beliefs and Buildings",
    "Through the Eyes of Travellers",
    "Bhakti–Sufi Traditions",
    "An Imperial Capital: Vijayanagara",
    "Peasants, Zamindars and the State",
    "Colonialism and the Countryside",
    "Rebels and the Raj",
    "Mahatma Gandhi and the Nationalist Movement",
    "Understanding Partition",
    "Framing the Constitution",
  ],
  "Political Science": [
    "The End of Bipolarity",
    "New Centres of Power",
    "Contemporary South Asia",
    "International Organisations",
    "Security in the Contemporary World",
    "Environment and Natural Resources",
    "Globalisation",
    "Challenges of Nation Building",
    "Era of One-Party Dominance",
    "Politics of Planned Development",
    "India’s External Relations",
    "Challenges to and Restoration of the Congress System",
    "The Crisis of Democratic Order",
    "Regional Aspirations",
    "Recent Developments in Indian Politics",
  ],
  Sociology: [
    "The Demographic Structure of Indian Society",
    "Social Institutions: Continuity and Change",
    "The Market as a Social Institution",
    "Patterns of Social Inequality and Exclusion",
    "The Challenges of Cultural Diversity",
    "Structural Change",
    "Cultural Change",
    "Change and Development in Rural Society",
    "Change and Development in Industrial Society",
    "Globalisation and Social Change",
    "Mass Media and Communications",
    "Social Movements",
  ],
} satisfies Partial<Record<Subject, string[]>>);

/** Class 10 (current NCERT books). */
export const CHAPTERS_10: Partial<Record<Subject, string[]>> = {
  Maths: [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  Science: [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity",
    "Light: Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment",
  ],
  "Social Science": [
    "History: The Rise of Nationalism in Europe",
    "History: Nationalism in India",
    "History: The Making of a Global World",
    "History: The Age of Industrialisation",
    "History: Print Culture and the Modern World",
    "Geography: Resources and Development",
    "Geography: Forest and Wildlife Resources",
    "Geography: Water Resources",
    "Geography: Agriculture",
    "Geography: Minerals and Energy Resources",
    "Geography: Manufacturing Industries",
    "Geography: Lifelines of National Economy",
    "Political Science: Power Sharing",
    "Political Science: Federalism",
    "Political Science: Gender, Religion and Caste",
    "Political Science: Political Parties",
    "Political Science: Outcomes of Democracy",
    "Economics: Development",
    "Economics: Sectors of the Indian Economy",
    "Economics: Money and Credit",
    "Economics: Globalisation and the Indian Economy",
  ],
  English: [
    "A Letter to God",
    "Nelson Mandela: Long Walk to Freedom",
    "Two Stories about Flying",
    "From the Diary of Anne Frank",
    "Glimpses of India",
    "Mijbil the Otter",
    "Madam Rides the Bus",
    "The Sermon at Benares",
    "The Proposal",
    "Poems: Dust of Snow and Fire and Ice",
    "Poems: A Tiger in the Zoo and How to Tell Wild Animals",
    "Poems: The Ball Poem and Amanda!",
    "Poems: The Trees and Fog",
    "Poems: The Tale of Custard the Dragon and For Anne Gregory",
    "Supplementary: A Triumph of Surgery",
    "Supplementary: The Thief’s Story",
    "Supplementary: The Midnight Visitor",
    "Supplementary: A Question of Trust",
    "Supplementary: Footprints without Feet",
    "Supplementary: The Making of a Scientist",
    "Supplementary: The Necklace",
    "Supplementary: Bholi",
    "Supplementary: The Book That Saved the Earth",
    "Grammar and Writing",
  ],
  Hindi: [
    "पद (सूरदास)",
    "राम-लक्ष्मण-परशुराम संवाद",
    "आत्मकथ्य",
    "उत्साह और अट नहीं रही है",
    "यह दंतुरित मुसकान और फसल",
    "संगतकार",
    "नेताजी का चश्मा",
    "बालगोबिन भगत",
    "लखनवी अंदाज़",
    "एक कहानी यह भी",
    "नौबतखाने में इबादत",
    "संस्कृति",
    "माता का अँचल",
    "साना-साना हाथ जोड़ि",
    "मैं क्यों लिखता हूँ?",
    "व्याकरण और लेखन",
  ],
};

const BY_GRADE: Record<Grade, Partial<Record<Subject, string[]>>> = { 10: CHAPTERS_10, 11: CHAPTERS_11, 12: CHAPTERS };
export const chaptersFor = (grade: Grade, subject: Subject): string[] => BY_GRADE[grade]?.[subject] ?? [];

const SCHOOL_10: Subject[] = ["Maths", "Science", "Social Science", "English", "Hindi"];
const BY_STREAM: Record<Exclude<Stream, "science">, Subject[]> = {
  commerce: ["Accountancy", "Business Studies", "Economics", "Maths"],
  arts: ["History", "Political Science", "Economics", "Sociology"],
};
/** Exams for a class: SSLC / CBSE for Class 10; PUC / CBSE (+ NEET / KCET for Science) for 11 and 12. */
export const examsFor = (grade: Grade, stream: Stream = "science") =>
  EXAMS.filter((e) => (grade === 10 ? e.id === "sslc" || e.id === "cbse" : e.id !== "sslc" && (stream === "science" || e.id === "puc" || e.id === "cbse")));
export const subjectsFor = (exam: ExamId, grade: Grade, stream: Stream = "science"): Subject[] =>
  grade === 10 ? SCHOOL_10 : stream !== "science" ? BY_STREAM[stream] : (EXAMS.find((e) => e.id === exam)?.subjects ?? []);
/** The exam to show: the saved one if it fits the class and stream, else the first that does. */
export const examFor = (saved: ExamId | undefined, grade: Grade, stream: Stream = "science") => examsFor(grade, stream).find((e) => e.id === saved) ?? examsFor(grade, stream)[0];

/** "Physics/Atoms" for Class 12 (kept as before), "11:Physics/Waves" for Class 11, "10:Science/Heredity" for Class 10. */
export const chapterKey = (subject: Subject, chapter: string, grade: Grade = 12) => `${grade === 12 ? "" : `${grade}:`}${subject}/${chapter}`;
export function parseKey(key: string): { grade: Grade; subject: Subject; chapter: string } {
  const m = /^(10|11):/.exec(key);
  const grade = (m ? Number(m[1]) : 12) as Grade;
  const [subject, chapter] = key.replace(/^(10|11):/, "").split(/\/(.+)/) as [Subject, string];
  return { grade, subject, chapter };
}
/** "1st PUC", "Class 12"… for an exam and class. */
export const gradeLabel = (exam: ExamId, grade: Grade) => (exam === "puc" && grade !== 10 ? (grade === 11 ? "1st PUC" : "2nd PUC") : `Class ${grade}`);

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
  /** the last few test scores, newest last (status uses their average) */
  recent?: number[];
}
export interface ExamPrepState {
  exam?: ExamId;
  scores?: Record<string, ChapterScore>;
  notes?: Record<string, ChapterNotes>;
  /** days with at least one finished focus session (YYYY-MM-DD) and minutes per day */
  focus?: Record<string, number>;
  /** class shown: 10, 11 (1st PUC) or 12 (2nd PUC) */
  grade?: Grade;
  /** stream shown for Class 11–12 */
  stream?: Stream;
  /** per video: modules finished and the student's notes */
  videos?: Record<string, { done: number[]; notes: string }>;
  /** what the student has opened per chapter (ms) */
  seen?: Record<string, { video?: number; notes?: number }>;
}

export type Status = "new" | "weak" | "ok" | "strong";
/** A chapter's level: the average of its last (up to 3) test scores, so one lucky or bad test doesn't swing it. */
export function levelOf(s: ChapterScore | undefined) {
  if (!s) return null;
  const r = s.recent?.length ? s.recent : [s.last];
  return Math.round(r.reduce((a, b) => a + b, 0) / r.length);
}
export function statusOf(s: ChapterScore | undefined): Status {
  const v = levelOf(s);
  if (v == null) return "new";
  if (v < 60) return "weak";
  if (v < 80) return "ok";
  return "strong";
}

/** How ready a subject is: average level over all its chapters (untested = 0). */
export function readiness(subject: Subject, scores: Record<string, ChapterScore> | undefined, grade: Grade = 12) {
  const list = chaptersFor(grade, subject);
  const levels = list.map((c) => levelOf(scores?.[chapterKey(subject, c, grade)]));
  const tested = levels.filter((v) => v != null).length;
  return {
    pct: list.length ? Math.round(levels.reduce<number>((a, v) => a + (v ?? 0), 0) / list.length) : 0,
    tested,
    total: list.length,
    weak: levels.filter((v) => v != null && v < 60).length,
    strong: levels.filter((v) => v != null && v >= 80).length,
  };
}

export interface NextUp {
  grade?: Grade;
  subject: Subject;
  chapter: string;
  why: string;
  tab: "videos" | "notes" | "practice";
}
/** Up to `n` things to do next: weakest chapters to revise, chapters studied but not tested, then the next new chapter of each subject. */
export function nextUp(exam: ExamId, st: ExamPrepState, n = 3, grade: Grade = st.grade ?? 12, stream: Stream = st.stream ?? "science"): NextUp[] {
  const subjects = subjectsFor(exam, grade, stream);
  const out: NextUp[] = [];
  const key = (s: Subject, c: string) => chapterKey(s, c, grade);
  const CH = (s: Subject) => chaptersFor(grade, s);
  const weak = subjects
    .flatMap((s) => CH(s).map((c) => ({ s, c, v: levelOf(st.scores?.[key(s, c)]) })))
    .filter((x) => x.v != null && x.v < 60)
    .sort((a, b) => a.v! - b.v!);
  for (const w of weak) out.push({ subject: w.s, chapter: w.c, why: `Weak (${w.v}%): watch the one-shot again, then retake the test`, tab: "videos" });
  for (const s of subjects)
    for (const c of CH(s)) {
      const seen = st.seen?.[key(s, c)];
      if (seen && !st.scores?.[key(s, c)]) out.push({ subject: s, chapter: c, why: "You studied this. Take the test to check", tab: "practice" });
    }
  for (const s of subjects) {
    const c = CH(s).find((x) => !st.scores?.[key(s, x)] && !st.seen?.[key(s, x)]);
    if (c) out.push({ subject: s, chapter: c, why: "Next new chapter in " + s, tab: "videos" });
  }
  const seenKeys = new Set<string>();
  return out
    .filter((x) => (seenKeys.has(key(x.subject, x.chapter)) ? false : (seenKeys.add(key(x.subject, x.chapter)), true)))
    .slice(0, n)
    .map((x) => ({ ...x, grade }));
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
