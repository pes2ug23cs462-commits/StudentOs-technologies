/* Changes the assistant can suggest for other pages. The assistant never changes
   anything itself: it adds a small JSON block to its reply, the chat shows it as a
   card, and nothing happens until the student presses Apply. Every action is checked
   here before it is shown, so a bad or made-up block is simply ignored.

   Reply format (one block per change, at most 3):
   ```action
   {"type":"add_session","title":"Revise DBMS joins","date":"2026-11-12","start":"19:00","minutes":45}
   ```
   Once applied, the block is rewritten as ```action-applied so it shows as done. */

import { ENTRY_KINDS, type Entry, type EntryKind, type ResumeData, type TimelineEvent, type TimelineKind } from "./free";
import type { RestDay, StudyPrefs, StudySession } from "./types";
import { downloadDocx, downloadPdf, type DocBlock } from "./doc-export";
import { docTitle } from "./action-blocks";

export type AssistantAction =
  | { type: "add_session"; title: string; date: string; start: string; minutes: number }
  | { type: "add_entry"; kind: EntryKind; title: string; org: string; start: string; end: string; description: string; skills: string[] }
  | { type: "add_resume_skills"; skills: string[] }
  | { type: "set_prefs"; restDay?: RestDay; sessionLength?: StudyPrefs["sessionLength"] }
  | { type: "add_event"; kind: TimelineKind; title: string; date: string; note: string }
  | { type: "download_doc"; title: string; format: "pdf" | "docx" }
  | { type: "open_page"; page: string; label: string };

const EVENT_KINDS: TimelineKind[] = ["exam", "internship", "hackathon", "placement", "milestone", "personal"];

/** Pages the assistant may link to. */
export const PAGES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assistant": "AI Assistant",
  "/study-plan": "Study Plan",
  "/paper": "Question Paper",
  "/schedule": "Schedule",
  "/timeline": "College timeline",
  "/learn": "Learning",
  "/learn?tab=materials&m=notes": "AI Notes",
  "/learn?tab=materials": "Study materials",
  "/learn?tab=goals": "My goals",
  "/learn?tab=videos": "Popular videos",
  "/exam-prep": "Exam Prep",
  "/placement": "Placement",
  "/projects": "Projects & Experience",
  "/resume": "Resume Creator",
  "/tests": "Practice Arena",
  "/interview": "Mock Interview",
  "/code": "Coding practice",
  "/certificates": "Certificates",
  "/join": "My college",
  "/premium": "Premium",
  "/settings": "Settings",
  "/settings/profile": "Profile settings",
  "/settings/account": "Plan & account",
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isMonth = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

function check(raw: unknown): AssistantAction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  switch (o.type) {
    case "add_session": {
      const title = str(o.title, 80);
      const date = str(o.date, 10);
      const start = str(o.start, 5);
      const minutes = Math.round(Number(o.minutes));
      if (!title || !isDate(date) || !isTime(start) || !(minutes >= 15 && minutes <= 240)) return null;
      return { type: "add_session", title, date, start, minutes };
    }
    case "add_entry": {
      const kind = ENTRY_KINDS.some((k) => k.value === o.kind) ? (o.kind as EntryKind) : "project";
      const title = str(o.title, 90);
      if (!title) return null;
      const start = str(o.start, 7);
      const end = str(o.end, 7);
      const skills = Array.isArray(o.skills) ? o.skills.map((s) => str(s, 30)).filter(Boolean).slice(0, 8) : [];
      const description = typeof o.description === "string" ? o.description.trim().slice(0, 600) : "";
      return { type: "add_entry", kind, title, org: str(o.org, 80), start: isMonth(start) ? start : "", end: isMonth(end) ? end : "", description, skills };
    }
    case "add_resume_skills": {
      const skills = Array.isArray(o.skills) ? [...new Set(o.skills.map((s) => str(s, 30)).filter(Boolean))].slice(0, 12) : [];
      return skills.length ? { type: "add_resume_skills", skills } : null;
    }
    case "set_prefs": {
      const restDay = ["sunday", "saturday", "none"].includes(o.restDay as string) ? (o.restDay as RestDay) : undefined;
      const len = Number(o.sessionLength);
      const sessionLength = len === 45 || len === 60 || len === 90 ? (len as StudyPrefs["sessionLength"]) : undefined;
      return restDay || sessionLength ? { type: "set_prefs", ...(restDay ? { restDay } : {}), ...(sessionLength ? { sessionLength } : {}) } : null;
    }
    case "add_event": {
      const title = str(o.title, 90);
      const date = str(o.date, 10);
      if (!title || !isDate(date)) return null;
      const kind = EVENT_KINDS.includes(o.kind as TimelineKind) ? (o.kind as TimelineKind) : "milestone";
      return { type: "add_event", kind, title, date, note: str(o.note, 200) };
    }
    case "download_doc": {
      const title = str(typeof o.title === "string" ? o.title.replace(/_/g, " ") : "", 90); // "" = take it from the answer
      return { type: "download_doc", title, format: o.format === "docx" || o.format === "word" ? "docx" : "pdf" };
    }
    case "open_page": {
      const page = str(o.page, 60);
      return PAGES[page] ? { type: "open_page", page, label: PAGES[page] } : null;
    }
  }
  return null;
}

export type ParsedAction = { action: AssistantAction; applied: boolean; index: number };

const BLOCK = /```(action|action-applied)\s*\n([\s\S]*?)```/g;

/** Splits a reply into the text to show and the checked actions in it. */
export function parseActions(reply: string): { text: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  let n = 0;
  const text = reply.replace(BLOCK, (_m, tag: string, body: string) => {
    const index = n++;
    if (actions.length >= 3) return "";
    try {
      const a = check(JSON.parse(body));
      if (a) actions.push({ action: a, applied: tag === "action-applied", index });
    } catch {
      /* not JSON: drop it */
    }
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), actions };
}

/** The same reply with block number `index` marked as applied. */
export function markApplied(reply: string, index: number) {
  let n = 0;
  return reply.replace(BLOCK, (m, tag: string, body: string) => (n++ === index && tag === "action" ? "```action-applied\n" + body + "```" : m));
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** Title and detail lines for the card. */
export function describe(a: AssistantAction): { title: string; where: string; lines: string[]; button: string } {
  switch (a.type) {
    case "add_session":
      return { title: `Add study session: ${a.title}`, where: "Schedule", lines: [`${fmtDate(a.date)} · ${fmtTime(a.start)} · ${a.minutes} min`], button: "Add to schedule" };
    case "add_entry":
      return {
        title: `Add ${ENTRY_KINDS.find((k) => k.value === a.kind)?.label.toLowerCase() ?? "entry"}: ${a.title}`,
        where: "Projects & Experience",
        lines: [a.org, a.description.split("\n")[0], a.skills.length ? `Skills: ${a.skills.join(", ")}` : ""].filter(Boolean),
        button: "Add to projects",
      };
    case "add_resume_skills":
      return { title: "Add skills to your resume", where: "Resume Creator", lines: [a.skills.join(", ")], button: "Add skills" };
    case "set_prefs":
      return {
        title: "Change study settings",
        where: "Settings",
        lines: [a.restDay ? `Rest day: ${a.restDay === "none" ? "no rest day" : a.restDay[0].toUpperCase() + a.restDay.slice(1)}` : "", a.sessionLength ? `Session length: ${a.sessionLength} min` : ""].filter(Boolean),
        button: "Save settings",
      };
    case "add_event":
      return { title: `Add to timeline: ${a.title}`, where: "College timeline", lines: [`${a.kind[0].toUpperCase() + a.kind.slice(1)} · ${fmtDate(a.date)}`, a.note].filter(Boolean), button: "Add to timeline" };
    case "download_doc":
      return { title: a.title || "Your notes from this chat", where: a.format === "pdf" ? "PDF" : "Word file", lines: ["The explanation above, as a file you can keep, print or share."], button: a.format === "pdf" ? "Download PDF" : "Download Word file" };
    case "open_page":
      return { title: `Open ${a.label}`, where: a.label, lines: [], button: "Open" };
  }
}

type Ctx = {
  today: string;
  resume: ResumeData;
  entries: Entry[];
  timeline: TimelineEvent[];
  /** the text of the reply the action came from (for download_doc) */
  reply?: string;
  addSession: (s: StudySession) => void;
  setPrefs: (p: Partial<StudyPrefs>) => void;
  patch: (p: { entries?: Entry[]; resume?: ResumeData; timeline?: TimelineEvent[] }) => void;
  go: (href: string) => void;
  id: (prefix: string) => string;
};

/** Does the change. Returns a message for the toast, or an error to show on the card. */
export function applyAction(a: AssistantAction, c: Ctx): { ok: true; message: string } | { ok: false; error: string } {
  switch (a.type) {
    case "add_session": {
      if (a.date < c.today) return { ok: false, error: "That date has already passed." };
      c.addSession({
        id: c.id("s"),
        goalId: "",
        title: a.title,
        short: a.title,
        summary: "Added from the assistant",
        objective: "Suggested by StudentOS Assistant.",
        week: 1,
        date: a.date,
        start: a.start,
        minutes: a.minutes,
        priority: "Core",
        status: "planned",
        tasks: [],
        notes: "",
        countsToward: "No goal",
      });
      return { ok: true, message: `Added “${a.title}” on ${fmtDate(a.date)} at ${fmtTime(a.start)}.` };
    }
    case "add_entry": {
      const entry: Entry = { id: c.id("e"), kind: a.kind, title: a.title, org: a.org, start: a.start, end: a.end, description: a.description, skills: a.skills, link: "" };
      c.patch({ entries: [...c.entries, entry], resume: { ...c.resume, entryIds: [...c.resume.entryIds, entry.id] } });
      return { ok: true, message: `Added “${a.title}” to Projects & Experience and your resume.` };
    }
    case "add_resume_skills": {
      const have = c.resume.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const lower = new Set(have.map((s) => s.toLowerCase()));
      const add = a.skills.filter((s) => !lower.has(s.toLowerCase()));
      if (!add.length) return { ok: false, error: "Those skills are already on your resume." };
      c.patch({ resume: { ...c.resume, skills: [...have, ...add].join(", ") } });
      return { ok: true, message: `Added ${add.length} skill${add.length > 1 ? "s" : ""} to your resume.` };
    }
    case "set_prefs":
      c.setPrefs({ ...(a.restDay ? { restDay: a.restDay } : {}), ...(a.sessionLength ? { sessionLength: a.sessionLength } : {}) });
      return { ok: true, message: "Study settings saved." };
    case "add_event": {
      if (c.timeline.some((e) => e.date === a.date && e.title.toLowerCase() === a.title.toLowerCase())) return { ok: false, error: "That’s already on your timeline." };
      const ev: TimelineEvent = { id: c.id("t"), kind: a.kind, title: a.title, date: a.date, note: a.note, done: false };
      c.patch({ timeline: [...c.timeline, ev].sort((x, y) => x.date.localeCompare(y.date)) });
      return { ok: true, message: `Added “${a.title}” on ${fmtDate(a.date)} to your timeline.` };
    }
    case "download_doc": {
      const title = a.title || docTitle(c.reply ?? "");
      const blocks = replyToBlocks(title, c.reply ?? "");
      if (blocks.length < 3) return { ok: false, error: "There’s nothing to put in the file yet. Ask for the explanation first." };
      void (a.format === "pdf" ? downloadPdf(title, blocks) : downloadDocx(title, blocks));
      return { ok: true, message: `Downloading “${title}”…` };
    }
    case "open_page":
      c.go(a.page);
      return { ok: true, message: `Opening ${a.label}…` };
  }
}

/** Text for a file made from message `id`: that reply if it has real content, else the
    nearest earlier assistant reply that does (for "now give me a PDF of that"). */
export function docSource(list: { id: number; role: string; text: string }[], id: number): string {
  const body = (t: string) => t.replace(/```[\s\S]*?```/g, "").trim();
  const i = list.findIndex((m) => m.id === id);
  if (i < 0) return "";
  if (body(list[i].text).length >= 350) return list[i].text;
  for (let j = i - 1; j >= 0; j--) if (list[j].role === "assistant" && body(list[j].text).length >= 350) return list[j].text;
  return list[i].text;
}

/** The assistant's reply (markdown) as document blocks: headings, paragraphs, list items. */
export function replyToBlocks(title: string, reply: string): DocBlock[] {
  const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[(.+?)\]\([^)]*\)/g, "$1").trim();
  const out: DocBlock[] = [
    { kind: "title", text: title },
    { kind: "sub", text: `Explained by Asha, StudentOS · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` },
  ];
  const body = reply.replace(/```[\s\S]*?```/g, "").split("\n");
  for (const raw of body) {
    const line = raw.trim();
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue;
    if (/^\|/.test(line)) {
      // a markdown table row: skip the |---|---| line, write cells side by side
      if (/^\|[\s:|-]+\|?$/.test(line)) continue;
      out.push({ kind: "p", text: line.replace(/^\||\|$/g, "").split("|").map((c) => plain(c)).join("   |   ") });
      continue;
    }
    if (/(press|tap|click) (apply|download)|download (it|this|the)\b|as a (pdf|word)|here('|’)s (your|the) (pdf|file)/i.test(line) && line.length < 100) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      if (plain(h[1]).toLowerCase() !== title.toLowerCase()) out.push({ kind: "h", text: plain(h[1]) });
    }
    else if (/^\*\*[^*]+\*\*:?$/.test(line)) out.push({ kind: "h", text: plain(line).replace(/:$/, "") });
    else if (/^[-*•]\s+/.test(line)) out.push({ kind: "li", text: plain(line.replace(/^[-*•]\s+/, "")) });
    else if (/^\d+[.)]\s+/.test(line)) out.push({ kind: "p", text: `${line.match(/^\d+/)![0]}. ${plain(line.replace(/^\d+[.)]\s+/, ""))}` });
    else out.push({ kind: "p", text: plain(line) });
  }
  return out;
}

/** What the assistant is told it can do (added to its instructions on the server). */
export const ACTIONS_PROMPT = `You can suggest changes to the student's StudentOS pages. You never change anything yourself: the student sees a card and presses Apply.
Whenever the student asks you to do something in the app (add, plan, schedule, remember, change, open, start), do it with a block instead of telling them where to click. Write your normal short reply first, then one block per change (at most 3), exactly like this:
\`\`\`action
{"type":"add_session","title":"Revise DBMS joins","date":"YYYY-MM-DD","start":"19:00","minutes":45}
\`\`\`
Allowed types:
- add_session: title, date (YYYY-MM-DD, today or later, use "Today" from the details), start (24h HH:MM), minutes (15-240). Avoid their commitments and keep their rest day free.
- add_entry: kind (project | internship | hackathon | achievement | volunteering), title, org, start and end (YYYY-MM or ""), description (resume points, one per line), skills (list). Only with facts the student gave you.
- add_resume_skills: skills (list). Only skills the student says they have.
- set_prefs: restDay (sunday | saturday | none) and/or sessionLength (45 | 60 | 90).
- add_event: an exam, deadline or date to remember on their college timeline. kind (exam | internship | hackathon | placement | milestone | personal), title, date (YYYY-MM-DD), note (short, optional).
- download_doc: when they ask for a PDF, Word file, document, handout or notes to download. title (short), format (pdf | docx). Write the whole content in your reply first, as long as they asked for (a 2–3 page explanation is about 900–1300 words), with "## " headings, short paragraphs and bullet points; the file is made from your reply. Never say you can't make a PDF or Word file.
- open_page: page, one of ${Object.keys(PAGES).join(", ")}. Use it whenever they ask to open, show or go to something, or when a page does what they want (e.g. mock interview → /interview, make notes → /learn?tab=materials&m=notes, coding practice → /code, a full question paper or model paper → /paper (and still write a short sample in the reply), placement drives → /placement).
Never say a change is done; say "Press Apply to add it". Don't put blocks in answers that only explain something.`;
