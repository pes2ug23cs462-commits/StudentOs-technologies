/* AI Notes → “Explain with AI”: a short animated lesson made from a student's notes.
   Each scene has a few spoken lines (read aloud by the narrator voice) and one
   visual that builds up while the lines are spoken. Shared by the server route
   (/api/notes-explain) and the player, so both clean the data the same way. */

import type { NoteSet } from "./notes";

export type VisualType = "title" | "flow" | "cycle" | "compare" | "cards" | "formula" | "steps";
export interface VisualItem {
  label: string;
  note?: string;
}
export interface Side {
  label: string;
  points: string[];
}
export interface Scene {
  title: string;
  /** spoken one after another; each short enough for one voice request */
  lines: string[];
  visual: { type: VisualType; items: VisualItem[]; formula?: string; left?: Side; right?: Side };
}

/** The narrator voice reads at most this many characters per request. */
export const LINE_MAX = 190;
export const MAX_SCENES = 9;
const TYPES: VisualType[] = ["title", "flow", "cycle", "compare", "cards", "formula", "steps"];

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").replace(/[*_#`]/g, "").trim().slice(0, max);

/** Splits text into spoken lines under LINE_MAX, at sentence ends, then commas, then words. */
export function toLines(text: string): string[] {
  const out: string[] = [];
  const sentences = clean(text, 4000).match(/[^.!?]+[.!?]*/g) ?? [];
  for (let s of sentences.map((x) => x.trim()).filter(Boolean)) {
    while (s.length > LINE_MAX) {
      const cut = Math.max(s.lastIndexOf(", ", LINE_MAX), s.lastIndexOf("; ", LINE_MAX), s.lastIndexOf(" ", LINE_MAX));
      const at = cut > 60 ? cut + 1 : LINE_MAX;
      out.push(s.slice(0, at).trim());
      s = s.slice(at).trim();
    }
    if (s) {
      // join very short sentences so the voice doesn't stop every few words
      const last = out[out.length - 1];
      if (last && last.length + s.length < 90) out[out.length - 1] = `${last} ${s}`;
      else out.push(s);
    }
  }
  return out;
}

const items = (v: unknown, n: number): VisualItem[] =>
  (Array.isArray(v) ? v : [])
    .map((x) => (typeof x === "string" ? { label: x } : (x as { label?: unknown; note?: unknown })))
    .map((x) => ({ label: clean(x?.label, 70), note: clean(x?.note, 130) || undefined }))
    .filter((x) => x.label)
    .slice(0, n);

const side = (v: unknown): Side | undefined => {
  const x = v as { label?: unknown; points?: unknown[] } | undefined;
  const label = clean(x?.label, 50);
  const points = (Array.isArray(x?.points) ? x.points : []).map((p) => clean(p, 110)).filter(Boolean).slice(0, 4);
  return label && points.length ? { label, points } : undefined;
};

/** Keeps only well-formed scenes from the AI's JSON. */
export function sanitizeScenes(raw: unknown): Scene[] {
  const list = (raw as { scenes?: unknown[] })?.scenes;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_SCENES)
    .map((r) => r as { title?: unknown; lines?: unknown[]; say?: unknown[]; visual?: { type?: unknown; items?: unknown; formula?: unknown; left?: unknown; right?: unknown } })
    .map((r): Scene | null => {
      const title = clean(r.title, 70);
      const lines = (Array.isArray(r.lines) ? r.lines : Array.isArray(r.say) ? r.say : []).flatMap((l) => toLines(String(l ?? ""))).slice(0, 6);
      if (!title || !lines.length) return null;
      let type = TYPES.includes(r.visual?.type as VisualType) ? (r.visual!.type as VisualType) : "cards";
      const v: Scene["visual"] = { type, items: items(r.visual?.items, type === "cycle" ? 6 : 5) };
      if (type === "formula") {
        v.formula = clean(r.visual?.formula, 80);
        if (!v.formula) type = v.type = "cards";
      }
      if (type === "compare") {
        v.left = side(r.visual?.left);
        v.right = side(r.visual?.right);
        if (!v.left || !v.right) type = v.type = "cards";
      }
      if (type !== "title" && type !== "compare" && type !== "formula" && v.items.length < 2) v.type = "title";
      return { title, lines, visual: v };
    })
    .filter((s): s is Scene => !!s);
}

/** A lesson built straight from the notes, used when the AI can't make one. */
export function scenesFromNotes(n: Pick<NoteSet, "title" | "summary" | "sections" | "terms">): Scene[] {
  const out: Scene[] = [];
  out.push({
    title: n.title,
    lines: toLines(`Let's understand ${n.title} together. ${n.summary}`).slice(0, 4),
    visual: { type: "title", items: n.sections.slice(0, 4).map((s) => ({ label: s.heading })) },
  });
  for (const s of n.sections.slice(0, 6)) {
    const pts = s.points.slice(0, 4);
    out.push({
      title: s.heading,
      lines: pts.flatMap((p) => toLines(p)).slice(0, 5),
      visual: { type: "cards", items: pts.map((p) => ({ label: p.length > 70 ? `${p.slice(0, 67).replace(/\s+\S*$/, "")}…` : p })) },
    });
  }
  if (n.terms.length >= 2) {
    const t = n.terms.slice(0, 4);
    out.push({
      title: "Key terms",
      lines: t.flatMap((x) => toLines(`${x.term}: ${x.meaning}`)).slice(0, 5),
      visual: { type: "cards", items: t.map((x) => ({ label: x.term, note: x.meaning.slice(0, 130) })) },
    });
  }
  out.push({
    title: "Quick recap",
    lines: toLines(`That's ${n.title} in a nutshell. Revise these points once more, then test yourself with the flashcards.`),
    visual: { type: "steps", items: n.sections.slice(0, 5).map((s) => ({ label: s.heading })) },
  });
  return out.filter((s) => s.lines.length);
}

/** Narrator voices (Orpheus on Groq). */
export const VOICES = [
  { id: "hannah", label: "Hannah", sub: "Warm, female" },
  { id: "autumn", label: "Autumn", sub: "Friendly, female" },
  { id: "diana", label: "Diana", sub: "Clear, female" },
  { id: "daniel", label: "Daniel", sub: "Calm, male" },
  { id: "austin", label: "Austin", sub: "Lively, male" },
  { id: "troy", label: "Troy", sub: "Deep, male" },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];
export const isVoice = (v: unknown): v is VoiceId => VOICES.some((x) => x.id === v);
