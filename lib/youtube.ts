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
  { area: "entrepreneurship", label: "Startups", q: "how to start a startup lecture" },
  { area: "exams", label: "Aptitude", q: "quantitative aptitude full course" },
  { area: "health", label: "Biology", q: "biology full course" },
  { area: "arts", label: "Communication skills", q: "communication skills full course" },
  { area: "social", label: "Public speaking", q: "public speaking full course" },
  { area: "projects", label: "Build projects", q: "build projects full course" },
];

export function topicsFor(interests: string[]) {
  const picked = TOPICS.filter((t) => interests.includes(t.area));
  return picked.length ? picked : TOPICS.filter((t) => t.area === "tech");
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
