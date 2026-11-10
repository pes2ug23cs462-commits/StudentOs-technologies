/* AI Notes → “Explain with AI”: a short animated lesson made from a student's notes.
   Each scene has a few spoken lines (read aloud by the narrator voice) and one
   visual that builds up while the lines are spoken. Shared by the server route
   (/api/notes-explain) and the player, so both clean the data the same way. */

import type { NoteSet } from "./notes";

export type VisualType = "title" | "flow" | "cycle" | "compare" | "cards" | "formula" | "steps" | SimType;
/** Simulations: a real worked example that moves, one frame per spoken line. */
export type SimType = "bars" | "array" | "stack" | "gantt" | "graph" | "calc";
export const SIM_TYPES: SimType[] = ["bars", "array", "stack", "gantt", "graph", "calc"];
export interface VisualItem {
  label: string;
  note?: string;
}
export interface Side {
  label: string;
  points: string[];
}
export interface Sim {
  /** bars: one bar per label; each frame gives the values */
  labels?: string[];
  unit?: string;
  /** stack: "stack" (last in, first out) or "queue" (first in, first out) */
  mode?: "stack" | "queue";
  /** gantt: tasks on a time axis */
  tasks?: { label: string; start: number; end: number }[];
  /** graph: nodes on a 0–100 canvas and the links between them */
  nodes?: { id: string; label: string; x: number; y: number }[];
  edges?: [string, string][];
  directed?: boolean;
  /** calc: worked steps with real numbers, then the answer */
  steps?: string[];
  result?: string;
  frames?: SimFrame[];
}
export interface SimFrame {
  note?: string;
  /** bars */
  values?: number[];
  /** array / stack */
  items?: string[];
  /** array: positions being compared/swapped; positions already final */
  hl?: number[];
  done?: number[];
  /** graph: current node, nodes already visited, link being followed */
  active?: string;
  visited?: string[];
  edge?: [string, string];
}
export interface Scene {
  title: string;
  /** spoken one after another; each short enough for one voice request */
  lines: string[];
  visual: { type: VisualType; items: VisualItem[]; formula?: string; left?: Side; right?: Side; sim?: Sim };
}

/** The narrator voice reads at most this many characters per request. */
export const LINE_MAX = 190;
export const MAX_SCENES = 9;
const TYPES: VisualType[] = ["title", "flow", "cycle", "compare", "cards", "formula", "steps", ...SIM_TYPES];
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** Cleans a simulation; returns undefined when it can't be drawn. */
export function sanitizeSim(type: SimType, raw: unknown): Sim | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const frames = arr(r.frames).slice(0, 8).map((f) => (f ?? {}) as Record<string, unknown>);
  const note = (f: Record<string, unknown>) => clean(f.note, 90) || undefined;
  switch (type) {
    case "bars": {
      const labels = arr(r.labels).map((x) => clean(x, 24)).filter(Boolean).slice(0, 8);
      const fr = frames.map((f) => ({ note: note(f), values: arr(f.values).slice(0, labels.length).map(num) })).filter((f) => f.values.length === labels.length && f.values.every((n) => Number.isFinite(n) && n >= 0));
      return labels.length >= 2 && fr.length ? { labels, unit: clean(r.unit, 12) || undefined, frames: fr } : undefined;
    }
    case "array": {
      const fr = frames
        .map((f) => {
          const items = arr(f.items).map((x) => clean(x, 8)).filter(Boolean).slice(0, 10);
          const idx = (v: unknown) => arr(v).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < items.length);
          return { note: note(f), items, hl: idx(f.hl), done: idx(f.done) };
        })
        .filter((f) => f.items.length >= 2);
      return fr.length ? { frames: fr } : undefined;
    }
    case "stack": {
      const fr = frames.map((f) => ({ note: note(f), items: arr(f.items).map((x) => clean(x, 14)).filter(Boolean).slice(0, 7) }));
      return fr.length ? { mode: r.mode === "queue" ? "queue" : "stack", frames: fr } : undefined;
    }
    case "gantt": {
      const tasks = arr(r.tasks)
        .map((t) => (t ?? {}) as Record<string, unknown>)
        .map((t) => ({ label: clean(t.label, 14), start: num(t.start), end: num(t.end) }))
        .filter((t) => t.label && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start && t.start >= 0)
        .slice(0, 10);
      return tasks.length >= 2 ? { tasks, unit: clean(r.unit, 10) || undefined, frames: frames.map((f) => ({ note: note(f) })) } : undefined;
    }
    case "graph": {
      const nodes = arr(r.nodes)
        .map((n) => (n ?? {}) as Record<string, unknown>)
        .map((n) => ({ id: clean(n.id, 20), label: clean(n.label ?? n.id, 18), x: Math.min(92, Math.max(8, num(n.x))), y: Math.min(90, Math.max(10, num(n.y))) }))
        .filter((n) => n.id && Number.isFinite(n.x) && Number.isFinite(n.y))
        .slice(0, 9);
      const ids = new Set(nodes.map((n) => n.id));
      const pair = (v: unknown) => {
        const a = arr(v).map((x) => clean(x, 20));
        return a.length === 2 && ids.has(a[0]) && ids.has(a[1]) ? ([a[0], a[1]] as [string, string]) : undefined;
      };
      const edges = arr(r.edges).map(pair).filter((e): e is [string, string] => !!e).slice(0, 14);
      const fr = frames.map((f) => ({
        note: note(f),
        active: ids.has(clean(f.active, 20)) ? clean(f.active, 20) : undefined,
        visited: arr(f.visited).map((x) => clean(x, 20)).filter((x) => ids.has(x)),
        edge: pair(f.edge),
      }));
      return nodes.length >= 2 ? { nodes, edges, directed: r.directed === true, frames: fr.length ? fr : [{ visited: [] }] } : undefined;
    }
    case "calc": {
      const steps = arr(r.steps).map((x) => clean(x, 90)).filter(Boolean).slice(0, 6);
      return steps.length ? { steps, result: clean(r.result, 60) || undefined } : undefined;
    }
  }
}

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
    .map((r) => r as { title?: unknown; lines?: unknown[]; say?: unknown[]; visual?: { type?: unknown; items?: unknown; formula?: unknown; left?: unknown; right?: unknown; sim?: unknown } })
    .map((r): Scene | null => {
      const title = clean(r.title, 70);
      const lines = (Array.isArray(r.lines) ? r.lines : Array.isArray(r.say) ? r.say : []).flatMap((l) => toLines(String(l ?? ""))).slice(0, 6);
      if (!title || !lines.length) return null;
      let type = TYPES.includes(r.visual?.type as VisualType) ? (r.visual!.type as VisualType) : "cards";
      const v: Scene["visual"] = { type, items: items(r.visual?.items, type === "cycle" ? 6 : 5) };
      if ((SIM_TYPES as VisualType[]).includes(type)) {
        // the simulation may sit in visual.sim or straight in visual
        const sim = sanitizeSim(type as SimType, r.visual?.sim ?? r.visual);
        if (sim) return { title, lines, visual: { type, items: [], sim } };
        type = v.type = "cards";
      }
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
