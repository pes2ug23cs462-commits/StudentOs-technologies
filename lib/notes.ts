/* Premium · AI notes and revision: short notes + flashcards made from a topic,
   pasted text, an uploaded file or a study material, and a spaced-revision
   schedule (1 → 3 → 7 → 14 → 30 → 60 days). */

import { AssistantError, postAi } from "./assistant";
import { sanitizeScenes, scenesFromNotes, type Scene } from "./explainer";

export type NoteSource = "topic" | "text" | "file" | "material";
export type Flashcard = { q: string; a: string };

export interface NoteSet {
  id: string;
  at: number;
  title: string;
  source: NoteSource;
  /** file or material name */
  from?: string;
  summary: string;
  sections: { heading: string; points: string[] }[];
  terms: { term: string; meaning: string }[];
  cards: Flashcard[];
  /** spaced revision */
  rev: { step: number; due: number; last?: number; count: number };
  /** “Explain with AI” lesson, made once and kept */
  explainer?: Scene[];
}

export const MAX_NOTES = 25;
/** Text sent to the AI from a file, material or paste. */
export const NOTE_INPUT_CHARS = 18_000;
const DAY = 86_400_000;
export const STEPS = [1, 3, 7, 14, 30, 60];

const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const isDue = (n: NoteSet, now = Date.now()) => n.rev.due <= startOfDay(now) + DAY - 1;

/** Days until the next revision (0 = today, negative = overdue). */
export const dueIn = (n: NoteSet, now = Date.now()) => Math.round((startOfDay(n.rev.due) - startOfDay(now)) / DAY);

export function dueLabel(n: NoteSet) {
  const d = dueIn(n);
  if (d < 0) return `Overdue by ${-d} day${d < -1 ? "s" : ""}`;
  if (d === 0) return "Revise today";
  if (d === 1) return "Revise tomorrow";
  return `Revise in ${d} days`;
}

/** New schedule after a revision. "hard" goes back a step, "good" moves on, "easy" skips one. */
export function afterRevision(n: NoteSet, rating: "hard" | "good" | "easy", now = Date.now()): NoteSet["rev"] {
  const step = rating === "hard" ? Math.max(0, n.rev.step - 1) : rating === "good" ? Math.min(STEPS.length - 1, n.rev.step + 1) : Math.min(STEPS.length - 1, n.rev.step + 2);
  return { step, due: startOfDay(now) + STEPS[step] * DAY, last: now, count: n.rev.count + 1 };
}

/** A new note set is first due for revision tomorrow. */
export const firstRevision = (now = Date.now()): NoteSet["rev"] => ({ step: 0, due: startOfDay(now) + DAY, count: 0 });

export type NotesReply = Pick<NoteSet, "title" | "summary" | "sections" | "terms" | "cards">;

/** Animated lesson script for a set of notes (AI); falls back to one built from the notes. */
export async function explainNotes(n: NoteSet, profile: string): Promise<{ scenes: Scene[]; fromAi: boolean }> {
  try {
    const j = await postAi<{ scenes?: unknown }>("/api/notes-explain", { title: n.title, summary: n.summary, sections: n.sections, terms: n.terms, profile });
    const scenes = sanitizeScenes(j);
    if (scenes.length >= 3) return { scenes, fromAi: true };
  } catch (e) {
    if (e instanceof AssistantError && /premium|session/i.test(e.message)) throw e;
  }
  return { scenes: scenesFromNotes(n), fromAi: false };
}

export async function makeNotes(o: { topic?: string; text?: string; title?: string; level: string; profile: string }) {
  return postAi<NotesReply>("/api/notes", o);
}

/** Notes as plain text, for copying. */
export function notesText(n: NoteSet) {
  return [
    n.title,
    "",
    n.summary,
    "",
    ...n.sections.flatMap((s) => [s.heading, ...s.points.map((p) => `• ${p}`), ""]),
    n.terms.length ? "Key terms" : "",
    ...n.terms.map((t) => `${t.term}: ${t.meaning}`),
    "",
    n.cards.length ? "Flashcards" : "",
    ...n.cards.map((c, i) => `Q${i + 1}. ${c.q}\nA. ${c.a}`),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
