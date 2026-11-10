/* Shared types and helpers for “most viewed” YouTube videos.
   The search itself runs on the server (app/api/videos/route.ts) so the
   YouTube API key never reaches the browser. */

export interface YtVideo {
  id: string;
  title: string;
  channel: string;
  views: number;
  likes: number;
  /** length in seconds */
  seconds: number;
  /** chapters from the description (“0:00 Intro”), when the creator added them */
  chapters?: Chapter[];
}

export type Chapter = { t: number; title: string };

/** Reads “0:00 Intro / 12:30 Loops” style timestamps from a video description. */
export function parseChapters(description: string, seconds: number): Chapter[] {
  const out: Chapter[] = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(/^\s*[-•*(\[]?\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[)\]]?\s*[-–—:|]?\s*(.+?)\s*$/);
    if (!m) continue;
    const t = m[1].split(":").reduce((a, b) => a * 60 + Number(b), 0);
    const title = m[2].replace(/^[-–—:|\s]+/, "").slice(0, 80);
    if (title && (!seconds || t < seconds) && (!out.length || t > out[out.length - 1].t)) out.push({ t, title });
  }
  return out.length >= 3 && out[0].t === 0 ? out.slice(0, 120) : [];
}

/** Topics students can explore by interest (for areas without a full course yet too). */
export const TOPICS: { area: string; label: string; q: string }[] = [
  { area: "tech", label: "Programming", q: "programming full course for beginners" },
  { area: "tech", label: "Web development", q: "web development full course" },
  { area: "data", label: "Data analytics", q: "data analytics full course" },
  { area: "data", label: "Excel", q: "excel full course" },
  { area: "design", label: "UI/UX & Figma", q: "figma ui ux design full course" },
  { area: "design", label: "Graphic design", q: "graphic design full course" },
  { area: "business", label: "Business basics", q: "business management full course" },
  { area: "business", label: "Digital marketing", q: "digital marketing full course" },
  { area: "commerce", label: "Accounting", q: "accounting full course for beginners" },
  { area: "commerce", label: "Stock market & finance", q: "stock market full course for beginners" },
  { area: "commerce", label: "Tally & GST", q: "tally prime with gst full course" },
  { area: "commerce", label: "Income tax", q: "income tax full course india" },
  { area: "entrepreneurship", label: "Startups", q: "how to start a startup lecture" },
  { area: "exams", label: "Aptitude", q: "quantitative aptitude full course" },
  { area: "health", label: "Biology", q: "biology full course" },
  { area: "arts", label: "Communication skills", q: "communication skills full course" },
  { area: "social", label: "Public speaking", q: "public speaking full course" },
  { area: "projects", label: "Build projects", q: "build projects full course" },
];

/** Topics for the interests picked. With no matching interest, tech is the fallback,
    except for school students (`school`), who get their class subjects instead. */
export function topicsFor(interests: string[], school = false) {
  const picked = TOPICS.filter((t) => interests.includes(t.area));
  return picked.length || school ? picked : TOPICS.filter((t) => t.area === "tech");
}

const STREAM_SUBJECTS: [RegExp, string[]][] = [
  [/PCMB/i, ["Physics", "Chemistry", "Maths", "Biology"]],
  [/PCM/i, ["Physics", "Chemistry", "Maths"]],
  [/PCB/i, ["Physics", "Chemistry", "Biology"]],
  [/commerce/i, ["Accountancy", "Business Studies", "Economics"]],
  [/arts|humanities/i, ["History", "Political Science", "Economics"]],
];

/** A school student's class subjects as video topics, e.g. “Class 12 Physics full course”. */
export function schoolTopics(academic: { type?: string; year?: string; field?: string; course?: string } | undefined) {
  if (academic?.type !== "school") return [];
  const n = academic.year?.match(/\d+/)?.[0];
  if (!n) return [];
  const cls = `class ${n}`;
  const puc = /karnataka|puc|state/i.test(academic.course ?? "") && (n === "11" || n === "12") ? (n === "12" ? "2nd puc" : "1st puc") : "";
  const subjects =
    n === "11" || n === "12" ? (STREAM_SUBJECTS.find(([re]) => re.test(academic.field ?? ""))?.[1] ?? ["Physics", "Chemistry", "Maths", "Biology"]) : ["Maths", "Science", "Social Science", "English"];
  return subjects.map((sub) => ({ area: "school", label: `${sub}`, q: `${puc || cls} ${sub} full course`.toLowerCase() }));
}

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function hms(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** Most views first, nudged up by a good like-to-view ratio. */
export function rank(list: YtVideo[]) {
  const score = (v: YtVideo) => v.views * (0.6 + Math.min(v.likes / Math.max(v.views, 1), 0.05) * 8);
  return [...list].sort((a, b) => score(b) - score(a));
}

/** ISO 8601 duration (PT4H26M52S) → seconds */
export function isoSeconds(iso: string) {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + +(m[4] ?? 0);
}
