/* "Study" cards in the assistant: when a student asks to learn a topic, the reply
   carries a ```study block and the chat shows courses, notes (with PDF and Word
   download) and practice for that topic, like a study app rather than plain text.
   Links come only from StudentOS's own pages or the trusted list below, never
   from the AI, so they always work. */

import { COURSES, type Course } from "./learn";
import { TOPICS, type TopicId } from "./aptitude";
import type { NotesReply } from "./notes";
import type { DocBlock } from "./doc-export";

export type Study = { topic: string; level: "beginner" | "intermediate" | "advanced"; notes: boolean };

const BLOCK = /```study\s*\n([\s\S]*?)```/g;

/** Takes the study blocks out of a reply. */
export function parseStudy(reply: string): { text: string; study: Study[] } {
  const study: Study[] = [];
  const text = reply.replace(BLOCK, (_m, body: string) => {
    try {
      const o = JSON.parse(body) as Record<string, unknown>;
      const topic = typeof o.topic === "string" ? o.topic.replace(/\s+/g, " ").trim().slice(0, 80) : "";
      const level = o.level === "intermediate" || o.level === "advanced" ? o.level : "beginner";
      if (topic && study.length < 2) study.push({ topic, level, notes: o.notes !== false });
    } catch {
      /* not JSON: drop it */
    }
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), study };
}

const STOP = ["and", "the", "for", "of", "in", "to", "with", "basics", "basic", "intro", "introduction", "course", "full", "learn", "learning", "complete", "beginner", "beginners", "my", "on", "about", "notes", "want", "how"];
const stem = (w: string) => (w.length > 4 ? w.replace(/(ies|es|s)$/, "") : w);
/** Whole words only (so "java" never matches "javascript", "oop" never matches "loops"). */
const words = (s: string) => [...new Set(s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !STOP.includes(w)).map(stem))];

/** StudentOS courses about the topic: the student's own suggested ones first, then built-in ones.
    A course must contain most of the topic's words; ones with the topic in their title come first. */
export function findCourses(topic: string, own: Course[] = []): Course[] {
  const q = words(topic);
  if (!q.length) return [];
  const need = q.length <= 2 ? q.length : Math.ceil(q.length * 0.6);
  const seen = new Set<string>();
  const scored = [...own, ...COURSES]
    .filter((c) => !seen.has(c.id) && seen.add(c.id))
    .map((c) => {
      const title = new Set(words(c.title));
      const all = new Set(words(`${c.title} ${c.blurb} ${c.skills.join(" ")} ${c.modules.map((m) => `${m.title} ${m.topic}`).join(" ")}`));
      return { c, n: q.filter((w) => all.has(w)).length, t: q.filter((w) => title.has(w)).length };
    })
    .filter((x) => x.n >= need)
    .sort((a, b) => b.t - a.t || b.n - a.n);
  // when some courses have the topic in their title, only those
  const best = scored.some((x) => x.t > 0) ? scored.filter((x) => x.t > 0) : scored;
  return best.slice(0, 2).map((x) => x.c);
}

/** A StudentOS course made for any topic: each module plays the most viewed YouTube lesson for it,
    inside StudentOS, with the quiz and certificate like every course. Same id as a goal on that topic. */
export function topicCourse(topic: string, level: Study["level"] = "beginner"): Course {
  const subject = topic.replace(/\s+/g, " ").trim().slice(0, 60);
  const id = `ai-${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "topic"}`;
  const parts = [
    { title: `${subject}: full course`, topic: `${subject} full course ${level === "beginner" ? "for beginners" : ""}`.trim(), about: `The most viewed complete lesson on ${subject}.` },
    { title: "Important concepts with examples", topic: `${subject} important concepts explained with examples`, about: `The key ideas of ${subject}, explained with worked examples.` },
    { title: "One-shot revision", topic: `${subject} one shot revision`, about: `Revise ${subject} quickly before a test or interview.` },
  ];
  return {
    id,
    title: subject,
    blurb: `Made on StudentOS for ${subject}: 3 lessons, a quiz and a certificate.`,
    why: "You asked to learn this.",
    areas: [],
    skills: [],
    level,
    modules: parts.map((p, i) => ({ id: `m${i + 1}`, title: p.title, yt: "", topic: p.topic.slice(0, 90), channel: "", length: "", about: p.about })),
    quiz: [],
  };
}

/** Well-known free courses, checked by hand. Matched by keywords; nothing here is made up by the AI. */
const TRUSTED: { keys: RegExp; title: string; by: string; url: string }[] = [
  { keys: /data struct|dsa|algorithm|linked list|tree|graph|sorting|searching|recursion|dynamic prog/i, title: "Introduction to Algorithms (6.006)", by: "MIT OpenCourseWare", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" },
  { keys: /data struct|dsa|algorithm|programming|computer science|\bc\b|coding/i, title: "CS50x: Introduction to Computer Science", by: "Harvard", url: "https://cs50.harvard.edu/x/" },
  { keys: /python/i, title: "CS50P: Programming with Python", by: "Harvard", url: "https://cs50.harvard.edu/python/" },
  { keys: /web|html|css|javascript|react|frontend|full ?stack/i, title: "CS50W: Web Programming with Python and JavaScript", by: "Harvard", url: "https://cs50.harvard.edu/web/" },
  { keys: /web|html|css|javascript|frontend/i, title: "Learn web development", by: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn" },
  { keys: /sql|dbms|database/i, title: "CS50 SQL: Introduction to Databases", by: "Harvard", url: "https://cs50.harvard.edu/sql/" },
  { keys: /machine learning|\bml\b|\bai\b|artificial intel|deep learning|neural/i, title: "CS50 AI: Artificial Intelligence with Python", by: "Harvard", url: "https://cs50.harvard.edu/ai/" },
  { keys: /machine learning|\bml\b/i, title: "Machine Learning Crash Course", by: "Google", url: "https://developers.google.com/machine-learning/crash-course" },
  { keys: /operating system|\bos\b|process|thread|scheduling|memory management/i, title: "Operating Systems: Three Easy Pieces (free book)", by: "Univ. of Wisconsin", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/" },
  { keys: /math|calculus|algebra|statistic|probability|physics|chemistry|biology|economics|accounting/i, title: "Free courses and practice", by: "Khan Academy", url: "https://www.khanacademy.org/" },
  { keys: /.*/, title: "Free courses from IITs and IISc", by: "NPTEL", url: "https://nptel.ac.in/courses" },
  { keys: /programming|coding|web|javascript|python/i, title: "Free coding certifications", by: "freeCodeCamp", url: "https://www.freecodecamp.org/learn" },
];
export function trustedCourses(topic: string) {
  const out = TRUSTED.filter((t) => t.keys.test(topic));
  // the catch-all (NPTEL) goes last
  return [...out.filter((t) => t.by !== "NPTEL").slice(0, 3), ...out.filter((t) => t.by === "NPTEL")].slice(0, 4);
}

/** Practice inside StudentOS that fits the topic. */
export function practiceFor(topic: string): { label: string; href: string }[] {
  const t = topic.toLowerCase();
  const out: { label: string; href: string }[] = [];
  const apt = TOPICS.find((x) => t.includes(x.name.toLowerCase().split(/[ ,&]/)[0]));
  if (apt) out.push({ label: `${apt.name} practice`, href: `/placement?tab=aptitude&topic=${apt.id as TopicId}` });
  if (/data struct|dsa|algorithm|array|string|linked|tree|graph|sort|search|coding|python|java|c\+\+|program/.test(t)) out.push({ label: "Coding problems", href: "/code" });
  out.push({ label: `Mock test on ${topic}`, href: `/tests?subject=${encodeURIComponent(topic)}` });
  if (/interview|hr|placement|aptitude|resume|data struct|dbms|os|oop|network/.test(t)) out.push({ label: "Mock interview", href: "/interview" });
  return out.slice(0, 3);
}

/** Notes as blocks for the PDF and Word files. */
export function notesBlocks(n: NotesReply, level: string): DocBlock[] {
  return [
    { kind: "title", text: n.title },
    { kind: "sub", text: `${level[0].toUpperCase()}${level.slice(1)} notes · StudentOS` },
    ...(n.summary ? [{ kind: "p" as const, text: n.summary }] : []),
    ...n.sections.flatMap((s) => [{ kind: "h" as const, text: s.heading }, ...s.points.map((p) => ({ kind: "li" as const, text: p }))]),
    ...(n.terms.length ? [{ kind: "h" as const, text: "Key terms" }, ...n.terms.map((t) => ({ kind: "li" as const, text: `${t.term}: ${t.meaning}` }))] : []),
    ...(n.cards.length ? [{ kind: "h" as const, text: "Test yourself" }, ...n.cards.flatMap((c, i) => [{ kind: "p" as const, text: `Q${i + 1}. ${c.q}` }, { kind: "small" as const, text: `Answer: ${c.a}` }])] : []),
  ];
}

/** What the assistant is told (added on the server). */
export const STUDY_PROMPT = `When the student wants to learn or revise a topic, or asks for notes, courses, study material or resources on a topic (for example "I want to learn data structures", "notes on DBMS normalisation", "course for Python"), give a short helpful answer (what it is, what to learn first, in order) and then add ONE block exactly like this:
\`\`\`study
{"topic":"Data structures","level":"beginner","notes":true}
\`\`\`
topic: the subject in a few words. level: beginner | intermediate | advanced (guess from the student details). notes: true if notes would help.
The app shows courses, downloadable notes (PDF and Word) and practice from that block, so never write links or URLs yourself and don't paste long notes in the reply. Don't add the block for quick questions, doubts in a single sum, or chit-chat.`;
