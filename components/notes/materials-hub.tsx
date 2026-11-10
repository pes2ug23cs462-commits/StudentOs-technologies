"use client";

/* Learning → My materials, in four tabs:
   My Files (free uploads) · AI Notes · Flashcards · Revision Plan (Premium).
   AI notes are made from a topic, pasted text, a file or one of the student's
   files, and come back for revision on a spaced schedule (1, 3, 7, 14, 30, 60 days). */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialsSection } from "@/components/learn/materials-section";
import { NoteExplainer } from "@/components/notes/note-explainer";
import { PremiumBadge, PremiumGate } from "@/components/premium/premium-gate";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, BookIcon, CalendarIcon, CheckIcon, FileIcon, FolderIcon, LayersIcon, PaperclipIcon, PencilIcon, PlayIcon, RefreshIcon, RepeatIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { Card, Label } from "@/components/ui/primitives";
import { AssistantError, readImageText } from "@/lib/assistant";
import { ACCEPT, readAttachment } from "@/lib/attachments";
import { loadMaterialText } from "@/lib/materials";
import type { Scene } from "@/lib/explainer";
import { MAX_NOTES, NOTE_INPUT_CHARS, STEPS, afterRevision, dueIn, dueLabel, explainNotes, firstRevision, isDue, makeNotes, notesText, type Flashcard, type NoteSet, type NoteSource } from "@/lib/notes";
import { usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

export type MaterialsTab = "files" | "notes" | "cards" | "plan";
const TABS: { key: MaterialsTab; label: string; Icon: typeof BookIcon; pro?: boolean }[] = [
  { key: "files", label: "My Files", Icon: FolderIcon },
  { key: "notes", label: "AI Notes", Icon: SparkleIcon, pro: true },
  { key: "cards", label: "Flashcards", Icon: LayersIcon, pro: true },
  { key: "plan", label: "Revision Plan", Icon: CalendarIcon, pro: true },
];

const SOURCES: { key: NoteSource; label: string; icon: typeof BookIcon; hint: string }[] = [
  { key: "topic", label: "Topic", icon: SparkleIcon, hint: "Any topic or chapter" },
  { key: "text", label: "Paste text", icon: PencilIcon, hint: "Your class notes" },
  { key: "file", label: "Upload file", icon: PaperclipIcon, hint: "PDF, Word, slides, photo" },
  { key: "material", label: "My files", icon: FolderIcon, hint: "Files saved in My Files" },
];

type View = null | { kind: "note"; id: string } | { kind: "explain"; id: string; scenes: Scene[] } | { kind: "revise"; id: string } | { kind: "practice"; title: string; cards: Flashcard[] };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const dayLabel = (t: number) => {
  const d = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (d <= 0) return "Today";
  if (d === 1) return "Tomorrow";
  return new Date(t).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

export function MaterialsHub() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.find((x) => x.key === params.get("m"))?.key ?? "files") as MaterialsTab;
  const go = (k: MaterialsTab) => {
    setView(null);
    router.replace(k === "files" ? "/learn?tab=materials" : `/learn?tab=materials&m=${k}`);
  };

  const { premium, loading } = usePremium();
  const { state, actions } = useStore();
  const notes = useMemo(() => state.notes ?? [], [state.notes]);
  const materials = state.materials ?? [];
  const due = useMemo(() => notes.filter((n) => isDue(n)).sort((a, b) => a.rev.due - b.rev.due), [notes]);
  const allCards = useMemo(() => notes.flatMap((n) => n.cards), [notes]);

  const [view, setView] = useState<View>(null);
  const [making, setMaking] = useState(false);
  const [source, setSource] = useState<NoteSource>("topic");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [error, setError] = useState("");
  const [explaining, setExplaining] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // ?topic=… (from a course module) opens AI Notes with the topic filled in
  useEffect(() => {
    const t = params.get("topic");
    if (t) {
      setSource("topic");
      setTopic(t.slice(0, 200));
    }
  }, [params]);

  const profile = [state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year].filter(Boolean).join(" · ");
  const save = (list: NoteSet[]) => actions.patch({ notes: list });
  const update = (id: string, patch: Partial<NoteSet>) => save(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const open = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };
  /** Opens the animated lesson, making it the first time. */
  const explain = async (n: NoteSet, remake = false) => {
    if (n.explainer?.length && !remake) return open({ kind: "explain", id: n.id, scenes: n.explainer });
    setExplaining(n.id);
    try {
      const r = await explainNotes(n, profile);
      if (r.fromAi) update(n.id, { explainer: r.scenes });
      else actions.toast("Made a simple lesson from your notes. Try again later for the full AI one.");
      open({ kind: "explain", id: n.id, scenes: r.scenes });
    } catch (e) {
      actions.toast(e instanceof AssistantError ? e.message : "Couldn’t make the lesson. Try again.");
    } finally {
      setExplaining("");
    }
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    setReading(true);
    try {
      const a = await readAttachment(f, { maxChars: NOTE_INPUT_CHARS });
      const t = a.kind === "image" && a.dataUrl ? await readImageText(a.dataUrl) : (a.text ?? "");
      if (t.trim().length < 80) throw new Error("There isn’t enough readable text in this file.");
      setFile({ name: f.name, text: t });
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : "Couldn’t read this file.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const create = async () => {
    setError("");
    let input: { topic?: string; text?: string; title?: string } = {};
    let from: string | undefined;
    try {
      if (source === "topic") {
        if (!topic.trim()) return setError("Write a topic, e.g. “Depreciation methods” or “Normalization in DBMS”.");
        input = { topic: topic.trim() };
      } else if (source === "text") {
        if (text.trim().length < 80) return setError("Paste a little more text (at least a few lines).");
        input = { text: text.trim().slice(0, NOTE_INPUT_CHARS) };
      } else if (source === "file") {
        if (!file) return setError("Choose a file first.");
        input = { text: file.text, title: file.name };
        from = file.name;
      } else {
        const m = materials.find((x) => x.id === materialId);
        if (!m) return setError("Choose one of your files.");
        setMaking(true);
        const t = await loadMaterialText(m.id);
        if (t.trim().length < 80) throw new AssistantError("There isn’t enough text in this file.");
        input = { text: t.slice(0, NOTE_INPUT_CHARS), title: m.name };
        from = m.name;
      }
      setMaking(true);
      const r = await makeNotes({ ...input, level, profile });
      const n: NoteSet = { id: uid("nt"), at: Date.now(), source, ...(from ? { from } : {}), ...r, rev: firstRevision() };
      save([n, ...notes].slice(0, MAX_NOTES));
      setTopic("");
      setText("");
      setFile(null);
      open({ kind: "note", id: n.id });
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t make notes. Try again.");
    } finally {
      setMaking(false);
    }
  };

  const tabs = (
    <div role="tablist" aria-label="My materials" className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
      {TABS.map(({ key, label, Icon, pro }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => go(key)}
          className={cn("flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-medium transition", tab === key ? "bg-violet-500 text-[#ffffff] shadow-[0_6px_20px_-6px_rgba(139,92,246,0.8)]" : "text-white/60 hover:bg-white/[0.05] hover:text-white")}
        >
          <Icon size={14} /> {label}
          {key === "plan" && due.length > 0 && <span className={cn("rounded-full px-1.5 text-[10.5px] font-bold", tab === key ? "bg-[rgba(255,255,255,0.25)] text-[#ffffff]" : "bg-amber-300/20 text-amber-300")}>{due.length}</span>}
          {pro && !premium && tab !== key && <span className="rounded-full bg-violet-500/20 px-1.5 py-px text-[9px] font-semibold text-violet-300">PRO</span>}
        </button>
      ))}
    </div>
  );

  const current = view && view.kind !== "practice" ? notes.find((n) => n.id === view.id) : undefined;
  if (view?.kind === "explain" && current) {
    return (
      <div className="mt-6">
        {tabs}
        <div className="mt-6 max-w-[1040px]">
          <button type="button" onClick={() => setView({ kind: "note", id: current.id })} className="flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white">
            <ArrowLeftIcon size={14} /> Back to notes
          </button>
          <h2 className="mt-3 text-[22px] font-bold tracking-tight text-white">{current.title} · explained</h2>
          <div className="mt-1 mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-white/50">An animated lesson with real examples, read aloud. Space to play or pause, arrow keys to move between scenes.</p>
            <Button size="xs" icon={<RefreshIcon size={12} />} loading={explaining === current.id} onClick={() => void explain(current, true)}>
              Make a new version
            </Button>
          </div>
          <NoteExplainer key={`${current.id}-${JSON.stringify(view.scenes).length}`} title={current.title} scenes={view.scenes} onClose={() => setView({ kind: "note", id: current.id })} />
        </div>
      </div>
    );
  }

  /* ---------- full-screen views (one note set, revision) ---------- */
  if (view?.kind === "practice") return <div className="mt-6">{tabs}<Revise title={view.title} cards={view.cards} onExit={() => setView(null)} /></div>;
  if (view?.kind === "revise" && current) {
    const done = (rating?: "hard" | "good" | "easy") => {
      if (!rating) return setView(null);
      const rev = afterRevision(current, rating);
      update(current.id, { rev });
      const days = STEPS[rev.step];
      actions.toast(`Next revision in ${days} day${days > 1 ? "s" : ""}`);
      setView(null);
    };
    return <div className="mt-6">{tabs}<Revise title={current.title} cards={current.cards} rated onExit={() => setView({ kind: "note", id: current.id })} onDone={done} /></div>;
  }
  if (view?.kind === "note" && current) {
    const n = current;
    return (
      <div className="mt-6">
        {tabs}
        <div className="mt-6 max-w-[960px]">
          <button type="button" onClick={() => setView(null)} className="flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white">
            <ArrowLeftIcon size={14} /> Back
          </button>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[24px] font-bold tracking-tight text-white">{n.title}</h2>
              <p className="mt-1 text-[12.5px] text-white/50">
                {n.from ? `From ${n.from} · ` : ""}
                {new Date(n.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {n.cards.length} flashcards ·{" "}
                <span className={cn(dueIn(n) <= 0 ? "font-semibold text-amber-300" : "")}>{dueLabel(n)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<PlayIcon size={12} />} loading={explaining === n.id} onClick={() => void explain(n)}>Explain with AI</Button>
              <Button icon={<RefreshIcon size={14} />} onClick={() => open({ kind: "revise", id: n.id })}>Revise now</Button>
              <Button icon={<FileIcon size={14} />} onClick={() => navigator.clipboard?.writeText(notesText(n)).then(() => actions.toast("Notes copied"), () => actions.toast("Couldn’t copy"))}>Copy</Button>
              <Button variant="ghost" icon={<TrashIcon size={14} />} onClick={() => { save(notes.filter((x) => x.id !== n.id)); setView(null); actions.toast("Notes deleted"); }}>Delete</Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void explain(n)}
            disabled={explaining === n.id}
            className="group mt-6 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-violet-400/30 bg-[linear-gradient(110deg,rgba(124,58,237,0.22),rgba(124,58,237,0.05)_60%)] p-4 text-left hover:border-violet-400/60 disabled:opacity-70"
          >
            <span className="explain-pulse flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-black">
              <PlayIcon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-white">{explaining === n.id ? "Making your lesson…" : "Watch these notes explained"}</span>
              <span className="block text-[12.5px] text-white/60">An animated lesson with a natural voice: every idea shown step by step while it’s explained.</span>
            </span>
          </button>
          {n.summary && (
            <Card glow className="mt-5 p-5">
              <p className="text-[11.5px] font-semibold tracking-wide text-violet-300 uppercase">Summary</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/85">{n.summary}</p>
            </Card>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {n.sections.map((s, k) => (
              <Card key={k} className="p-5">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-[11.5px] font-bold text-violet-300">{k + 1}</span>
                  {s.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-white/75">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          {n.terms.length > 0 && (
            <Card className="mt-5 p-5">
              <p className="text-[15px] font-semibold text-white">Key terms</p>
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {n.terms.map((t) => (
                  <div key={t.term}>
                    <dt className="text-[13px] font-semibold text-violet-300">{t.term}</dt>
                    <dd className="text-[13px] text-white/70">{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          <h3 className="mt-8 text-[16px] font-semibold text-white">Flashcards</h3>
          <p className="text-[12.5px] text-white/50">Tap a card to see the answer.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {n.cards.map((c, k) => <FlipCard key={k} card={c} n={k + 1} />)}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- tabs ---------- */
  const gate =
    !loading && !premium ? (
      <div className="mt-6">
        <PremiumGate
          icon="bulb"
          title="Notes that make revision easy"
          text="Turn any topic, your class notes or your files into short notes and flashcards. StudentOS reminds you when to revise, so you don’t forget before the exam."
          points={["Notes from a topic, pasted text, PDF, Word, slides or a photo", "Key terms and flashcards made for you", "A revision plan: tomorrow, then 3, 7, 14 and 30 days", "Your files stay free in My Files"]}
        />
      </div>
    ) : null;

  return (
    <div className="mt-6">
      {tabs}

      {tab === "files" && (
        <div className="mt-6">
          <MaterialsSection
            onNotes={(m) => {
              setSource("material");
              setMaterialId(m.id);
              go("notes");
            }}
          />
        </div>
      )}

      {tab !== "files" && loading && <div className="mt-6 h-[360px] animate-pulse rounded-3xl bg-white/[0.04]" />}
      {tab !== "files" && gate}

      {/* AI Notes */}
      {tab === "notes" && premium && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {making ? (
              <Card glow className="flex flex-col items-center py-20 text-center">
                <FancyIcon name="bulb" tone="violet" size={72} float />
                <p className="mt-5 text-[18px] font-semibold text-white">Making your notes…</p>
                <p className="mt-1 text-[13px] text-white/55">Writing short notes, key terms and flashcards. About 10–20 seconds.</p>
              </Card>
            ) : (
              <Card glow className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[18px] font-bold text-white">Make new notes</p>
                  <PremiumBadge />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SOURCES.map((s) => (
                    <button key={s.key} type="button" onClick={() => { setSource(s.key); setError(""); }} aria-pressed={source === s.key} className={cn("flex flex-col items-start rounded-xl border p-3 text-left transition", source === s.key ? "border-violet-400 bg-violet-500/[0.12]" : "border-white/10 bg-white/[0.02] hover:border-white/25")}>
                      <s.icon size={18} className="text-violet-300" />
                      <span className="mt-2 text-[13px] font-semibold text-white">{s.label}</span>
                      <span className="text-[11px] text-white/45">{s.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  {source === "topic" && (
                    <>
                      <Label htmlFor="nt-topic">Topic or chapter</Label>
                      <input id="nt-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Depreciation methods, Normalization in DBMS, Photosynthesis" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white outline-none focus:border-accent" />
                    </>
                  )}
                  {source === "text" && (
                    <>
                      <Label htmlFor="nt-text">Paste your notes or a chapter</Label>
                      <textarea id="nt-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Paste text here. The notes will only use what you paste." className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none focus:border-accent" />
                      <p className="mt-1 text-right text-[11px] text-white/40">{Math.min(text.length, NOTE_INPUT_CHARS).toLocaleString("en-IN")} / {NOTE_INPUT_CHARS.toLocaleString("en-IN")} characters</p>
                    </>
                  )}
                  {source === "file" && (
                    <>
                      <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
                      <button type="button" onClick={() => fileInput.current?.click()} disabled={reading} className="flex w-full flex-col items-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-center transition hover:border-violet-400/60">
                        <PaperclipIcon size={22} className="text-violet-300" />
                        <span className="mt-2 text-[13.5px] font-semibold text-white">{reading ? "Reading the file…" : file ? file.name : "Choose a file"}</span>
                        <span className="mt-0.5 text-[11.5px] text-white/45">{file ? `${file.text.length.toLocaleString("en-IN")} characters read · tap to change` : "PDF, Word, PowerPoint, text or a photo of notes"}</span>
                      </button>
                    </>
                  )}
                  {source === "material" &&
                    (materials.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-[12.5px] text-white/55">
                        No files yet. Add them in{" "}
                        <button type="button" onClick={() => go("files")} className="text-accent hover:underline">My Files</button>, or use “Upload file”.
                      </p>
                    ) : (
                      <>
                        <Label htmlFor="nt-material">Choose a file</Label>
                        <select id="nt-material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[14px] text-white outline-none focus:border-accent">
                          <option value="">Choose…</option>
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </>
                    ))}
                </div>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <Label>Detail</Label>
                    <div className="flex h-11 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                      {[["beginner", "Simple"], ["intermediate", "Exam level"], ["advanced", "Detailed"]].map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setLevel(v)} aria-pressed={level === v} className={cn("h-full rounded-lg px-3.5 text-[13px] font-medium transition", level === v ? "bg-violet-500 text-[#ffffff]" : "text-white/65 hover:text-white")}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => void create()} disabled={reading} className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-[14px] font-semibold text-[#ffffff] shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)] transition hover:brightness-110 disabled:opacity-50">
                    <SparkleIcon size={15} /> Make notes <ArrowRightIcon size={14} />
                  </button>
                </div>
                {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
              </Card>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-white">My notes</h3>
              <span className="text-[12px] text-white/45">{notes.length} / {MAX_NOTES}</span>
            </div>
            {notes.length === 0 ? (
              <Card className="mt-4 flex flex-col items-center p-10 text-center">
                <FancyIcon name="bulb" tone="amber" size={58} />
                <p className="mt-4 text-[14px] font-semibold text-white">No notes yet</p>
                <p className="mt-1 max-w-sm text-[12.5px] text-white/55">Make your first notes above. They’ll be saved here with flashcards and a revision date.</p>
              </Card>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {notes.map((n) => (
                  <button key={n.id} type="button" onClick={() => open({ kind: "note", id: n.id })} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition lift-3d hover:border-violet-400/50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-[15px] font-semibold text-white">{n.title}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", dueIn(n) <= 0 ? "bg-amber-300/15 text-amber-300" : "bg-white/[0.06] text-white/55")}>{dueLabel(n)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/55">{n.summary}</p>
                    <p className="mt-3 text-[11.5px] text-white/40">{n.sections.length} sections · {n.cards.length} flashcards · revised {n.rev.count}×</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DueCard due={due} hasNotes={notes.length > 0} onRevise={(id) => open({ kind: "revise", id })} onPlan={() => go("plan")} />
        </div>
      )}

      {/* Flashcards */}
      {tab === "cards" && premium && (
        <div className="mt-6">
          <Card glow className="flex flex-wrap items-center gap-5 p-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200"><LayersIcon size={26} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold text-white">{allCards.length} flashcards</p>
              <p className="text-[12.5px] text-white/55">From {notes.length} note set{notes.length === 1 ? "" : "s"}. Practising here doesn’t change your revision plan.</p>
            </div>
            <Button variant="primary" icon={<RepeatIcon size={14} />} disabled={allCards.length === 0} onClick={() => open({ kind: "practice", title: "All flashcards (mixed)", cards: shuffle(allCards).slice(0, 20) })}>
              Practise a mixed set
            </Button>
          </Card>
          {notes.length === 0 ? (
            <Card className="mt-5 flex flex-col items-center p-10 text-center">
              <FancyIcon name="quiz" tone="violet" size={58} />
              <p className="mt-4 text-[14px] font-semibold text-white">No flashcards yet</p>
              <p className="mt-1 max-w-sm text-[12.5px] text-white/55">Every set of AI notes comes with flashcards.</p>
              <Button size="sm" variant="primary" className="mt-4" onClick={() => go("notes")}>Make AI notes</Button>
            </Card>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {notes.map((n) => (
                <Card key={n.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[15px] font-semibold text-white">{n.title}</p>
                    <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-300">{n.cards.length} cards</span>
                  </div>
                  <div className="relative mt-4 h-[92px]">
                    <div className="absolute inset-x-3 top-2 bottom-0 rounded-xl border border-white/[0.06] bg-white/[0.02]" />
                    <div className="absolute inset-x-1.5 top-1 bottom-1 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
                    <div className="absolute inset-0 bottom-2 flex items-center rounded-xl border border-white/10 bg-white/[0.05] px-4">
                      <p className="line-clamp-2 text-[13px] text-white/80">{n.cards[0]?.q}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="primary" icon={<PlayIcon size={13} />} onClick={() => open({ kind: "practice", title: n.title, cards: shuffle(n.cards) })}>Practise</Button>
                    <Button size="sm" variant="ghost" onClick={() => open({ kind: "note", id: n.id })}>Open notes</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revision plan */}
      {tab === "plan" && premium && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-5">
            <Card glow className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[18px] font-bold text-white">Due today</p>
                <span className="text-[12.5px] text-white/50">{due.length} set{due.length === 1 ? "" : "s"}</span>
              </div>
              {due.length === 0 ? (
                <p className="mt-2 text-[13px] text-white/55">{notes.length ? "Nothing to revise today. You’re on track!" : "Make AI notes and they’ll come back here when it’s time to revise them."}</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {due.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300"><RefreshIcon size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-white">{n.title}</span>
                        <span className="block text-[12px] text-amber-300/90">{dueLabel(n)} · {n.cards.length} cards · revision {n.rev.count + 1}</span>
                      </span>
                      <Button size="sm" variant="primary" onClick={() => open({ kind: "revise", id: n.id })}>Revise now</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-6">
              <p className="text-[18px] font-bold text-white">Coming up</p>
              {notes.filter((n) => !isDue(n)).length === 0 ? (
                <p className="mt-2 text-[13px] text-white/55">No upcoming revisions.</p>
              ) : (
                <ol className="relative mt-4 space-y-4 border-l border-white/10 pl-5">
                  {Object.entries(
                    notes
                      .filter((n) => !isDue(n))
                      .sort((a, b) => a.rev.due - b.rev.due)
                      .reduce<Record<string, NoteSet[]>>((g, n) => ((g[dayLabel(n.rev.due)] ??= []).push(n), g), {}),
                  ).map(([day, list]) => (
                    <li key={day} className="relative">
                      <span className="absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-violet-400 bg-[#0f0b1d]" />
                      <p className="text-[12.5px] font-semibold text-violet-300">{day}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {list.map((n) => (
                          <li key={n.id}>
                            <button type="button" onClick={() => open({ kind: "note", id: n.id })} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]">
                              <span className="truncate text-[13px] text-white/85">{n.title}</span>
                              <span className="shrink-0 text-[11.5px] text-white/40">{n.cards.length} cards</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
          <div className="space-y-5">
            <Card className="p-5">
              <p className="text-[17px] font-bold text-white">Your revision</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["Note sets", notes.length],
                  ["Revisions done", notes.reduce((a, n) => a + n.rev.count, 0)],
                  ["Due today", due.length],
                  ["Flashcards", allCards.length],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-[11px] text-white/45">{k}</p>
                    <p className="text-[18px] font-bold text-white tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-[17px] font-bold text-white">How it works</p>
              <ol className="mt-3 space-y-3">
                {[
                  ["Make notes", "Every set gets flashcards."],
                  ["Revise when it’s due", "Tomorrow, then 3, 7, 14, 30 and 60 days."],
                  ["Rate yourself", "Hard brings it back sooner, Easy pushes it further."],
                ].map(([h, d], k) => (
                  <li key={h} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[12px] font-bold text-violet-300">{k + 1}</span>
                    <span>
                      <span className="block text-[13px] font-semibold text-white">{h}</span>
                      <span className="block text-[12px] text-white/55">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function DueCard({ due, hasNotes, onRevise, onPlan }: { due: NoteSet[]; hasNotes: boolean; onRevise: (id: string) => void; onPlan: () => void }) {
  return (
    <Card className="h-fit p-5">
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-bold text-white">Revise today</p>
        <CalendarIcon size={17} className="text-violet-300" />
      </div>
      {due.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-white/50">{hasNotes ? "Nothing to revise today. You’re on track!" : "Notes you make will come back here when it’s time to revise them."}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {due.slice(0, 5).map((n) => (
            <li key={n.id} className="flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{n.title}</span>
                <span className="block text-[11.5px] text-amber-300/90">{dueLabel(n)}</span>
              </span>
              <Button size="xs" variant="primary" onClick={() => onRevise(n.id)}>Revise</Button>
            </li>
          ))}
        </ul>
      )}
      {hasNotes && (
        <button type="button" onClick={onPlan} className="mt-4 flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">
          Full revision plan <ArrowRightIcon size={13} />
        </button>
      )}
    </Card>
  );
}

function FlipCard({ card, n }: { card: Flashcard; n: number }) {
  const [show, setShow] = useState(false);
  return (
    <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className={cn("min-h-[132px] rounded-2xl border p-4 text-left transition", show ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-violet-400/50")}>
      <p className="text-[11px] font-semibold text-white/40">{show ? "Answer" : `Card ${n}`}</p>
      <p className={cn("mt-1.5 text-[13.5px] leading-relaxed", show ? "text-emerald-200" : "font-medium text-white")}>{show ? card.a : card.q}</p>
    </button>
  );
}

/** Flashcard session. With `rated`, the student rates the set at the end to set the next revision. */
function Revise({ title, cards, rated, onExit, onDone }: { title: string; cards: Flashcard[]; rated?: boolean; onExit: () => void; onDone?: (r?: "hard" | "good" | "easy") => void }) {
  const [k, setK] = useState(0);
  const [show, setShow] = useState(false);
  const [known, setKnown] = useState<boolean[]>([]);
  const finished = k >= cards.length;
  const c = cards[k];
  const right = known.filter(Boolean).length;
  const share = cards.length ? right / cards.length : 0;
  const suggest: "hard" | "good" | "easy" = share >= 0.9 ? "easy" : share >= 0.6 ? "good" : "hard";
  const mark = (ok: boolean) => {
    setKnown((x) => [...x, ok]);
    setShow(false);
    setK(k + 1);
  };
  const again = () => {
    setK(0);
    setKnown([]);
    setShow(false);
  };

  return (
    <div className="mx-auto mt-6 max-w-[680px]">
      <button type="button" onClick={onExit} className="flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white">
        <ArrowLeftIcon size={14} /> Back
      </button>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-[12px] font-medium tracking-wide text-accent uppercase">{rated ? "Revising" : "Practising"} · {title}</p>
        <p className="shrink-0 text-[12.5px] text-white/50 tabular-nums">{Math.min(k + 1, cards.length)} / {cards.length}</p>
      </div>
      <div className="mt-3 flex gap-1">
        {cards.map((_, n) => (
          <span key={n} className={cn("h-1.5 flex-1 rounded-full", n < known.length ? (known[n] ? "bg-emerald-400" : "bg-rose-400") : n === k ? "bg-violet-400/60" : "bg-white/10")} />
        ))}
      </div>
      {!finished ? (
        <>
          <button type="button" onClick={() => setShow((v) => !v)} className={cn("land-screen-in mt-6 flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border p-8 text-center transition", show ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-violet-400/30 bg-violet-500/[0.08]")} key={`${k}-${show}`}>
            <span className="text-[11.5px] font-semibold tracking-wide text-white/45 uppercase">{show ? "Answer" : "Question"}</span>
            <span className={cn("mt-3 text-[19px] leading-snug font-semibold", show ? "text-emerald-200" : "text-white")}>{show ? c.a : c.q}</span>
            {!show && <span className="mt-5 text-[12px] text-white/45">Think of the answer, then tap to check</span>}
          </button>
          {show ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button className="h-12" onClick={() => mark(false)}>Not yet</Button>
              <Button variant="primary" className="h-12" icon={<CheckIcon size={15} />} onClick={() => mark(true)}>I knew it</Button>
            </div>
          ) : (
            <Button variant="primary" className="mt-5 h-12 w-full" onClick={() => setShow(true)}>Show answer</Button>
          )}
        </>
      ) : (
        <Card glow className="mt-6 p-7 text-center">
          <FancyIcon name="check" tone="emerald" size={60} />
          <p className="mt-4 text-[20px] font-bold text-white">You knew {right} of {cards.length}</p>
          {rated ? (
            <>
              <p className="mt-1 text-[13px] text-white/55">How did this revision feel? This sets your next revision date.</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {(
                  [
                    ["hard", "Hard", "Revise sooner"],
                    ["good", "Good", "Normal gap"],
                    ["easy", "Easy", "Longer gap"],
                  ] as const
                ).map(([v, l, d]) => (
                  <button key={v} type="button" onClick={() => onDone?.(v)} className={cn("rounded-xl border p-4 transition lift-3d", v === suggest ? "border-violet-400 bg-violet-500/[0.14]" : "border-white/10 bg-white/[0.03] hover:border-white/25")}>
                    <span className="block text-[14px] font-semibold text-white">{l}</span>
                    <span className="block text-[11.5px] text-white/50">{d}</span>
                    {v === suggest && <span className="mt-1 block text-[10.5px] font-semibold text-violet-300">Suggested</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 flex justify-center gap-3">
              <Button icon={<RepeatIcon size={14} />} onClick={again}>Practise again</Button>
              <Button variant="primary" onClick={onExit}>Done</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
