/* Video courses that play inside StudentOS with YouTube’s official embedded player.
   Each course is a short track of modules (one YouTube video or playlist each),
   followed by a timed quiz. Passing the quiz unlocks a StudentOS certificate.
   Every YouTube ID below was checked against its public YouTube listing; to add a
   module, copy the part after “watch?v=” (video) or “list=” (playlist). */

import type { SetupData } from "./setup";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface Module {
  id: string;
  title: string;
  /** Fallback video: “v:<videoId>” or “p:<playlistId>” (used when the most-viewed search is unavailable) */
  yt: string;
  /** YouTube search for the most viewed video on this module’s topic */
  topic: string;
  channel: string;
  /** e.g. “4 h 27 min” */
  length: string;
  about: string;
  /** part of a longer video (seconds): used for popular videos split into modules */
  from?: number;
  to?: number;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  /** index into options */
  answer: number;
  /** a nudge that doesn't give the answer away */
  hint?: string;
  /** index of the module the question comes from */
  module?: number;
}

/** Hints a student can use in one quiz attempt. */
export const QUIZ_HINTS = 2;

export interface Course {
  id: string;
  title: string;
  blurb: string;
  /** matches INTERESTS values in setup.ts */
  areas: string[];
  /** matches FAMILIAR names in setup.ts */
  skills: string[];
  level: CourseLevel;
  modules: Module[];
  /** question pool; each attempt draws QUIZ_SIZE of them (empty for personalised courses: written when the quiz opens) */
  quiz: QuizQuestion[];
  /** why it was suggested to this student */
  why?: string;
}

/** Questions per attempt, seconds for the whole quiz, and correct answers needed. */
export const QUIZ_SIZE = 5;
export const QUIZ_SECONDS = 90;
export const QUIZ_PASS = 5;
/** Certificates a free-plan student can earn. */
export const FREE_CERT_LIMIT = 2;
/** A lesson counts as finished once this share of it was really watched. */
export const WATCHED_SHARE = 0.9;

export const COURSES: Course[] = [
  {
    id: "python-foundations",
    title: "Python Foundations",
    blurb: "Variables, loops, functions and files, then practice by building small Python projects.",
    areas: ["tech", "projects", "data"],
    skills: ["Python"],
    level: "beginner",
    modules: [
      { id: "m1", title: "Python basics", yt: "v:rfscVS0vtbw", topic: "python full course for beginners", channel: "freeCodeCamp.org", length: "4 h 27 min", about: "Install Python, then learn variables, strings, lists, conditions, loops, functions and classes." },
      { id: "m2", title: "Practice with mini-projects", yt: "v:qwAFL1597eM", topic: "python projects for beginners", channel: "freeCodeCamp.org", length: "8 h 42 min", about: "Revise the basics and use them in small, complete Python programs." },
    ],
    quiz: [
      { q: "Which keyword defines a function in Python?", options: ["func", "def", "function", "lambda"], answer: 1 },
      { q: "What does len([4, 8, 15]) return?", options: ["2", "3", "15", "An error"], answer: 1 },
      { q: "Which of these is immutable?", options: ["list", "dict", "set", "tuple"], answer: 3 },
      { q: "What is printed by print(7 // 2)?", options: ["3.5", "3", "4", "1"], answer: 1 },
      { q: "How do you start a comment in Python?", options: ["//", "#", "/*", "--"], answer: 1 },
      { q: "Which loop runs over every item of a list?", options: ["for item in my_list:", "foreach (item in my_list)", "loop my_list:", "for (i = 0; i < n; i++)"], answer: 0 },
      { q: "What type is the value True?", options: ["str", "int", "bool", "None"], answer: 2 },
      { q: "Which statement handles an error without crashing?", options: ["if / else", "try / except", "with / as", "break"], answer: 1 },
    ],
  },
  {
    id: "web-basics",
    title: "Web Development Basics",
    blurb: "Build web pages with HTML and CSS, then make a complete website and a landing page.",
    areas: ["tech", "design", "projects"],
    skills: ["Web Development", "UI/UX Design", "JavaScript"],
    level: "beginner",
    modules: [
      { id: "m1", title: "HTML & CSS from zero", yt: "v:a_iQb1lnAEQ", topic: "html css full course", channel: "freeCodeCamp.org", length: "5 h 22 min", about: "Page structure, text, links, images, the box model, Flexbox and layouts." },
      { id: "m2", title: "Build a simple website", yt: "v:krfUjg0S2uI", topic: "build a website html css javascript", channel: "freeCodeCamp.org", length: "7 h 13 min", about: "Put HTML, CSS and a little JavaScript together into a working multi-section site." },
      { id: "m3", title: "Landing page project", yt: "v:aoQ6S1a32j8", topic: "responsive landing page html css", channel: "freeCodeCamp.org", length: "5 h 5 min", about: "Design and code a responsive landing page step by step." },
    ],
    quiz: [
      { q: "Which HTML tag creates a link?", options: ["<link>", "<a>", "<href>", "<url>"], answer: 1 },
      { q: "Which CSS property changes text colour?", options: ["font-color", "text-color", "color", "foreground"], answer: 2 },
      { q: "In the box model, what sits between the content and the border?", options: ["margin", "padding", "outline", "gap"], answer: 1 },
      { q: "Which value of display turns on Flexbox?", options: ["display: grid", "display: block", "display: flex", "display: inline"], answer: 2 },
      { q: "Which tag holds the main heading of a page?", options: ["<head>", "<h1>", "<header>", "<title>"], answer: 1 },
      { q: "What does a CSS media query let you do?", options: ["Load videos", "Apply styles at certain screen sizes", "Add JavaScript", "Compress images"], answer: 1 },
      { q: "Which selector targets an element with id=\"menu\"?", options: [".menu", "#menu", "menu", "*menu"], answer: 1 },
      { q: "Which attribute gives an image text for screen readers?", options: ["title", "src", "alt", "name"], answer: 2 },
    ],
  },
  {
    id: "full-stack-web",
    title: "Full-Stack Web Development",
    blurb: "Go deeper on JavaScript and the frontend, then connect it to a Node.js and MongoDB backend.",
    areas: ["tech", "projects", "entrepreneurship"],
    skills: ["JavaScript", "Web Development"],
    level: "intermediate",
    modules: [
      { id: "m1", title: "Frontend bootcamp", yt: "v:zJSY8tbf_ys", topic: "javascript full course", channel: "freeCodeCamp.org", length: "21 h 15 min", about: "Modern HTML, CSS and JavaScript, the DOM, and building interactive pages." },
      { id: "m2", title: "Backend with Node.js and MongoDB", yt: "v:nu_pCVPKzTk", topic: "node js mongodb full course", channel: "freeCodeCamp.org", length: "7 h 29 min", about: "Servers, routes, databases and joining frontend and backend into one app." },
    ],
    quiz: [
      { q: "Which keyword declares a variable that cannot be reassigned?", options: ["var", "let", "const", "static"], answer: 2 },
      { q: "What does DOM stand for?", options: ["Document Object Model", "Data Output Method", "Digital Order Module", "Document Order Map"], answer: 0 },
      { q: "Which HTTP method is normally used to create new data?", options: ["GET", "POST", "HEAD", "OPTIONS"], answer: 1 },
      { q: "What is Node.js?", options: ["A CSS framework", "A JavaScript runtime outside the browser", "A database", "A browser"], answer: 1 },
      { q: "MongoDB stores data as…", options: ["Tables and rows", "Documents (JSON-like)", "Plain text files", "Spreadsheets"], answer: 1 },
      { q: "What does JSON.parse() do?", options: ["Turns an object into text", "Turns JSON text into an object", "Sends a request", "Sorts an array"], answer: 1 },
      { q: "Which array method makes a new array by transforming each item?", options: ["forEach", "map", "push", "find"], answer: 1 },
      { q: "What status code means “Not Found”?", options: ["200", "301", "404", "500"], answer: 2 },
    ],
  },
  {
    id: "data-analysis",
    title: "Data Analysis Essentials",
    blurb: "Learn what analysts do, then clean and chart data with Python and query it with SQL.",
    areas: ["data", "business", "commerce"],
    skills: ["Data Analysis", "Python"],
    level: "beginner",
    modules: [
      { id: "m1", title: "Data analytics crash course", yt: "v:jcTj6FgWOpo", topic: "data analytics for beginners", channel: "freeCodeCamp.org", length: "38 min", about: "What data analysts do, the tools they use and how a project flows." },
      { id: "m2", title: "Data analysis with Python", yt: "v:r-uOLxNrNk8", topic: "pandas data analysis python full course", channel: "freeCodeCamp.org", length: "4 h 22 min", about: "NumPy, Pandas, Matplotlib and Seaborn on real datasets." },
      { id: "m3", title: "SQL for analytics", yt: "v:mXW7JHJM34k", topic: "sql full course", channel: "freeCodeCamp.org", length: "11 h", about: "SELECT, filters, grouping, joins and the queries analysts use daily." },
    ],
    quiz: [
      { q: "Which SQL clause filters rows?", options: ["ORDER BY", "WHERE", "GROUP BY", "SELECT"], answer: 1 },
      { q: "Which Pandas object is a table with rows and columns?", options: ["Series", "DataFrame", "ndarray", "Index"], answer: 1 },
      { q: "Which SQL function counts rows?", options: ["SUM()", "COUNT()", "TOTAL()", "LEN()"], answer: 1 },
      { q: "What does df.head() show by default?", options: ["The last 5 rows", "The first 5 rows", "The column names only", "A summary of statistics"], answer: 1 },
      { q: "Which chart is best for a trend over time?", options: ["Pie chart", "Line chart", "Scatter of random points", "Word cloud"], answer: 1 },
      { q: "Which SQL keyword combines rows from two tables?", options: ["MERGE", "JOIN", "UNION ALL only", "LINK"], answer: 1 },
      { q: "A missing value in Pandas usually shows as…", options: ["0", "NaN", "\"\"", "False"], answer: 1 },
      { q: "What does GROUP BY do?", options: ["Sorts rows", "Collects rows with the same value so you can aggregate them", "Deletes duplicates", "Renames columns"], answer: 1 },
    ],
  },
  {
    id: "machine-learning",
    title: "Machine Learning Starter",
    blurb: "Understand how models learn, train your first models, and use scikit-learn properly.",
    areas: ["data", "tech"],
    skills: ["Python", "Data Analysis"],
    level: "intermediate",
    modules: [
      { id: "m1", title: "Machine learning for everybody", yt: "v:i_LwzRVP7bg", topic: "machine learning full course", channel: "freeCodeCamp.org", length: "3 h 54 min", about: "Supervised and unsupervised learning, with models built in Python." },
      { id: "m2", title: "ML projects for beginners", yt: "v:bmmQA8A-yUA", topic: "machine learning projects python", channel: "freeCodeCamp.org", length: "4 h 20 min", about: "Work through the full process from data to a trained, tested model." },
      { id: "m3", title: "Scikit-learn in depth", yt: "v:pqNCD_5r0IU", topic: "scikit-learn full course", channel: "freeCodeCamp.org", length: "2 h 54 min", about: "Pipelines, preprocessing, metrics and tuning with scikit-learn." },
    ],
    quiz: [
      { q: "Predicting a house price is which kind of task?", options: ["Classification", "Regression", "Clustering", "Reinforcement"], answer: 1 },
      { q: "Why do we keep a separate test set?", options: ["To train faster", "To check performance on data the model has not seen", "To store backups", "To add more features"], answer: 1 },
      { q: "Grouping customers with no labels is…", options: ["Supervised learning", "Unsupervised learning", "Regression", "Labelling"], answer: 1 },
      { q: "Overfitting means the model…", options: ["Does well on training data but poorly on new data", "Is too simple", "Trains too slowly", "Has no features"], answer: 0 },
      { q: "In scikit-learn, which method trains a model?", options: [".predict()", ".fit()", ".score()", ".transform()"], answer: 1 },
      { q: "Accuracy is a metric mainly for…", options: ["Regression", "Classification", "Clustering", "Data cleaning"], answer: 1 },
      { q: "What does feature scaling do?", options: ["Removes rows", "Puts features on similar ranges", "Adds labels", "Shuffles the data"], answer: 1 },
      { q: "k-means is an algorithm for…", options: ["Clustering", "Regression", "Sorting", "Encryption"], answer: 0 },
    ],
  },
  {
    id: "dsa-python",
    title: "Data Structures & Algorithms",
    blurb: "Arrays, linked lists, trees, sorting and searching in Python, for interviews and exams.",
    areas: ["tech", "exams"],
    skills: ["Python"],
    level: "intermediate",
    modules: [
      { id: "m1", title: "DSA in Python", yt: "v:pkYVOmU3MgA", topic: "data structures and algorithms python full course", channel: "freeCodeCamp.org", length: "12 h 31 min", about: "Binary search, linked lists, trees, hashing, sorting and complexity." },
    ],
    quiz: [
      { q: "Time complexity of binary search on a sorted list?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], answer: 1 },
      { q: "Which structure is Last-In-First-Out?", options: ["Queue", "Stack", "Heap", "Graph"], answer: 1 },
      { q: "Average lookup time in a hash table?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 0 },
      { q: "Which sort has O(n log n) worst-case time?", options: ["Bubble sort", "Merge sort", "Insertion sort", "Selection sort"], answer: 1 },
      { q: "A binary tree node has at most how many children?", options: ["1", "2", "3", "Any number"], answer: 1 },
      { q: "Recursion needs…", options: ["A loop", "A base case", "A global variable", "A class"], answer: 1 },
      { q: "Breadth-first search usually uses a…", options: ["Stack", "Queue", "Heap", "Set only"], answer: 1 },
      { q: "Getting an item by index in a Python list is…", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], answer: 0 },
    ],
  },
];

/** Long videos are split into short lessons of about this length. */
export const LESSON_SECONDS = 25 * 60;

export interface Lesson {
  start: number;
  /** 0 = to the end of the video */
  end: number;
}

/** “4 h 27 min” → seconds (0 for a playlist) */
export function parseLength(s: string) {
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  return (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0);
}

/** Lessons of one module. A module can be a part of a longer video (from–to). */
export function moduleLessons(m: Pick<Module, "from" | "to">, secs: number): Lesson[] {
  if (m.to == null) return lessonsFor(secs);
  const from = m.from ?? 0;
  return lessonsFor(m.to - from).map((l) => ({ start: l.start + from, end: l.end ? l.end + from : m.to! }));
}

/** Splits a video into equal lessons of about LESSON_SECONDS. */
export function lessonsFor(seconds: number): Lesson[] {
  if (!seconds) return [{ start: 0, end: 0 }];
  const n = Math.max(1, Math.round(seconds / LESSON_SECONDS));
  const len = seconds / n;
  return Array.from({ length: n }, (_, i) => ({ start: Math.round(i * len), end: i === n - 1 ? 0 : Math.round((i + 1) * len) }));
}

export const clock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

export const courseById = (id: string) => COURSES.find((c) => c.id === id);
export const moduleKey = (courseId: string, moduleId: string) => `${courseId}/${moduleId}`;

export function parseYt(key: string) {
  const id = key.slice(2);
  return key.startsWith("p:") ? { video: "", list: id } : { video: id, list: "" };
}
export function thumb(key: string) {
  const { video } = parseYt(key);
  return video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : "";
}

/** Interest areas implied by the student's degree/field (e.g. B.Com → commerce). */
export function areasFromAcademics(setup: SetupData | undefined) {
  const a = setup?.academic;
  const text = `${a?.course ?? ""} ${a?.field ?? ""} ${a?.specialization ?? ""}`.toLowerCase();
  const out: string[] = [];
  if (/b\.?com|m\.?com|commerce|account|finance|ca\b|cma/.test(text)) out.push("commerce", "business");
  if (/bba|mba|management|business/.test(text)) out.push("business", "entrepreneurship");
  if (/b\.?tech|b\.?e\.|bca|mca|m\.?tech|computer|engineering|technology|\bit\b/.test(text)) out.push("tech");
  if (/b\.?sc|m\.?sc|science|statistic|math/.test(text)) out.push("data");
  if (/design/.test(text)) out.push("design");
  return out;
}

/** Shuffled draw of QUIZ_SIZE questions with shuffled options. */
export function drawQuiz(pool: QuizQuestion[]): QuizQuestion[] {
  const shuffle = <T,>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  return shuffle(pool)
    .slice(0, QUIZ_SIZE)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { q: q.q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
}

/* ---------- saved progress (inside AppState.learning) ---------- */

export interface ModuleProgress {
  /** seconds watched up to */
  t: number;
  /** length in seconds once the player knows it */
  d: number;
  done: boolean;
  notes: string;
  /** the video this student is watching for the module, kept so it doesn’t change mid-way */
  yt?: string;
  /** that video’s length, fixed once started, used to split it into lessons */
  secs?: number;
  /** lesson indexes finished */
  lessonsDone?: number[];
  /** lesson the student is on */
  lesson?: number;
  /** seconds really watched per lesson (skipping ahead doesn’t count) */
  watched?: Record<string, number>;
  ytTitle?: string;
  ytChannel?: string;
  /** when the video’s details were last fetched from YouTube (ms); refreshed after 30 days */
  ytAt?: number;
}

export interface CourseProgress {
  startedAt: string;
  attempts: number;
  best: number;
  passedAt?: string;
  /** set when a certificate was issued */
  certId?: string;
  /** true once the certificate is saved to the public verification list */
  published?: boolean;
  /** last time the course was opened (ms), for “recently watched” */
  lastAt?: number;
  /** pinned to the top of My courses */
  pinned?: boolean;
  /** removed from My courses by the student (comes back if they open it again) */
  hidden?: boolean;
  /** quiz questions written for a personalised course (made once, from its modules) */
  quizPool?: QuizQuestion[];
}

export interface Learning {
  modules: Record<string, ModuleProgress>;
  courses: Record<string, CourseProgress>;
  /** popular videos the student opened; each becomes a small course in My courses */
  videos?: Record<string, VideoMeta>;
  /** courses made for this student from their profile and assessment (AI, or built from their interests) */
  catalog?: Course[];
  /** profile the catalog was made for; a change makes new suggestions */
  catalogFor?: string;
}

export interface VideoMeta {
  title: string;
  channel: string;
  secs: number;
  chapters?: { t: number; title: string }[];
  /** search it came from, for “more like this” */
  q?: string;
  addedAt: number;
  /** when the details were last fetched from YouTube (ms); refreshed after 30 days */
  refreshedAt?: number;
  /** the video was deleted or made private on YouTube */
  gone?: boolean;
}

/** YouTube’s Developer Policies: stored API data must be refreshed or deleted within 30 days. */
export const YT_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

export const emptyLearning = (): Learning => ({ modules: {}, courses: {} });

export function courseStats(course: Course, l: Learning) {
  const done = course.modules.filter((m) => l.modules[moduleKey(course.id, m.id)]?.done).length;
  return { done, total: course.modules.length, ready: done === course.modules.length, progress: l.courses[course.id] };
}

/** How much of a course is finished, 0–100. Counts lessons inside a module, so it moves while watching. */
export function coursePercent(course: Course, l: Learning) {
  if (!course.modules.length) return 0;
  const parts = course.modules.map((m) => {
    const p = l.modules[moduleKey(course.id, m.id)];
    if (!p) return 0;
    if (p.done) return 1;
    const lessons = moduleLessons(m, p.secs ?? parseLength(m.length)).length;
    return Math.min(0.99, (p.lessonsDone?.length ?? 0) / lessons);
  });
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

/* ---------- popular videos as small courses ---------- */

export const VIDEO_MODULE_SECONDS = 45 * 60;
export const videoCourseId = (videoId: string) => `yt-${videoId}`;

/** A popular video split into modules (by its chapters when it has them) and lessons. */
export function videoCourse(videoId: string, v: VideoMeta): Course {
  if (!v.secs) {
    // length not known yet: one module, split into lessons once the player knows the length
    return { id: videoCourseId(videoId), title: v.title || "Video", blurb: v.channel, areas: [], skills: [], level: "beginner", quiz: [], modules: [{ id: "m1", title: v.title || "Video", yt: `v:${videoId}`, topic: "", channel: v.channel, length: "", about: "" }] };
  }
  const secs = v.secs;
  const n = Math.max(1, Math.min(12, Math.round(secs / VIDEO_MODULE_SECONDS)));
  const chapters = v.chapters ?? [];
  // module boundaries: evenly spaced, moved to the nearest chapter start when there are chapters
  const cuts = [0];
  for (let i = 1; i < n; i++) {
    const ideal = (i * secs) / n;
    const near = chapters.length ? chapters.reduce((a, c) => (Math.abs(c.t - ideal) < Math.abs(a.t - ideal) ? c : a)).t : Math.round(ideal);
    if (near > cuts[cuts.length - 1] + 300 && near < secs - 300) cuts.push(near);
  }
  cuts.push(secs);
  const modules: Module[] = cuts.slice(0, -1).map((from, i) => {
    const to = cuts[i + 1];
    const inside = chapters.filter((c) => c.t >= from && c.t < to);
    const title = inside.length ? inside[0].title + (inside.length > 1 ? ` + ${inside.length - 1} more` : "") : cuts.length > 2 ? `Part ${i + 1}` : v.title;
    return {
      id: `m${i + 1}`,
      title,
      yt: `v:${videoId}`,
      topic: "",
      channel: v.channel,
      length: `${Math.round((to - from) / 60)} min`,
      about: inside.length > 1 ? `Covers: ${inside.map((c) => c.title).slice(0, 8).join(" · ")}${inside.length > 8 ? " …" : ""}` : `${clock(from)} – ${clock(to)} of the video.`,
      from,
      to,
    };
  });
  return { id: videoCourseId(videoId), title: v.title, blurb: `${v.channel} · popular video split into short lessons`, areas: [], skills: [], level: "beginner", modules, quiz: [] };
}

export const isVideoCourse = (c: Course) => c.id.startsWith("yt-");

/** Any course this student can open: personalised, built-in, or a popular video they added. */
export function findCourse(id: string, l: Learning | undefined) {
  const own = l?.catalog?.find((c) => c.id === id);
  if (own) return own;
  const c = courseById(id);
  if (c) return c;
  const vid = id.startsWith("yt-") ? id.slice(3) : "";
  const meta = vid ? l?.videos?.[vid] : undefined;
  return meta ? videoCourse(vid, meta) : undefined;
}

/** Courses that can be linked to goals and sessions: the personalised ones, plus built-in ones already started. */
export function linkableCourses(l: Learning | undefined): Course[] {
  const started = COURSES.filter((c) => l?.courses[c.id] || Object.keys(l?.modules ?? {}).some((k) => k.startsWith(`${c.id}/`)));
  return [...(l?.catalog ?? []), ...started];
}

/** Every course with progress or a certificate (for certificates, resume and the assistant). */
export function allCourses(l: Learning | undefined): Course[] {
  const videos = Object.entries(l?.videos ?? {}).map(([id, v]) => videoCourse(id, v));
  return [...linkableCourses(l), ...videos];
}

/** Quiz questions for a course: its own pool, or the one written for a personalised course. */
export const quizPool = (c: Course, l: Learning | undefined) => (c.quiz.length ? c.quiz : (l?.courses[c.id]?.quizPool ?? []));

/** The course a goal is learned with: chosen on the goal, or the best match among the student's courses. */
export function courseForGoal(g: { courseId?: string; course: string; title: string }, l: Learning | undefined) {
  if (g.courseId === "none") return undefined;
  if (g.courseId) return findCourse(g.courseId, l);
  return matchCourse(`${g.title} ${g.course}`, l);
}

export const certCount = (l: Learning) => Object.values(l.courses).filter((c) => c.certId).length;

/** e.g. “2026-7KQ2M9”; printed as STOS/CER/2026-7KQ2M9 */
export function newCertId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${new Date().getFullYear()}-${s}`;
}
export const certLabel = (id: string) => `STOS/CER/${id}`;

/** Adds up module lengths, e.g. “13 h 9 min”; “+ lectures” when a module is a playlist. */
export function courseDuration(course: Course, l?: Learning) {
  // real length of the videos when we know them
  const secs = course.modules.map((m) => {
    const p = l?.modules[moduleKey(course.id, m.id)];
    return m.to != null ? m.to - (m.from ?? 0) : (p?.secs ?? p?.d ?? 0);
  });
  if (secs.every(Boolean)) {
    const total = Math.round(secs.reduce((a, b) => a + b, 0) / 60);
    return total >= 60 ? `${Math.floor(total / 60)} h${total % 60 ? ` ${total % 60} min` : ""}` : `${total} min`;
  }
  let mins = 0;
  let playlist = false;
  for (const m of course.modules) {
    const h = m.length.match(/(\d+)\s*h/);
    const mi = m.length.match(/(\d+)\s*min/);
    if (!h && !mi) playlist = true;
    mins += (h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0);
  }
  const text = mins >= 60 ? `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}` : `${mins} min`;
  return playlist ? `${text} + lectures` : text;
}

/* ---------- linking study sessions to courses ---------- */

const STOP = new Set(["the", "and", "for", "with", "from", "into", "your", "my", "learn", "learning", "course", "full", "basics", "beginners", "beginner", "introduction", "intro", "week", "session", "practice", "revision", "finish", "complete", "of", "to", "in", "on", "a", "an", "how", "what"]);
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Best matching course among the student's courses for free text like “Tally · Week 2”. */
export function matchCourse(text: string, l: Learning | undefined): Course | undefined {
  const want = new Set(words(text));
  if (!want.size) return undefined;
  let best: { c: Course; score: number } | undefined;
  for (const c of linkableCourses(l)) {
    const title = words(c.title);
    const rest = words(c.modules.map((m) => `${m.title} ${m.topic}`).join(" "));
    const score = title.filter((w) => want.has(w)).length * 2 + new Set(rest.filter((w) => want.has(w))).size;
    if (score >= 2 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c;
}

/** The course a session should open: chosen on the session, then on its goal, then guessed from the names. */
export function courseForSession(s: { courseId?: string; title: string; goalId: string }, goals: { id: string; courseId?: string; course: string; title: string }[], l: Learning | undefined) {
  if (s.courseId === "none") return undefined;
  if (s.courseId) return findCourse(s.courseId, l);
  const g = goals.find((x) => x.id === s.goalId);
  if (g?.courseId === "none") return undefined;
  if (g?.courseId) return findCourse(g.courseId, l);
  return matchCourse(`${s.title} ${g?.course ?? ""} ${g?.title ?? ""}`, l);
}
