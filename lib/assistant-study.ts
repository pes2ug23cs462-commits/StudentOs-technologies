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

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !["and", "the", "for", "of", "in", "to", "with", "basics", "intro", "introduction"].includes(w));
const hits = (q: string[], text: string) => {
  const t = text.toLowerCase();
  return q.filter((w) => t.includes(w)).length;
};

/** StudentOS courses about the topic: the student's own suggested ones first, then built-in ones. */
export function findCourses(topic: string, own: Course[] = []): Course[] {
  const q = words(topic);
  if (!q.length) return [];
  const seen = new Set<string>();
  return [...own, ...COURSES]
    .filter((c) => !seen.has(c.id) && seen.add(c.id))
    .map((c) => ({ c, n: hits(q, `${c.title} ${c.blurb} ${c.skills.join(" ")} ${c.modules.map((m) => m.title).join(" ")}`) }))
    .filter((x) => x.n >= Math.min(q.length, 2))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((x) => x.c);
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
