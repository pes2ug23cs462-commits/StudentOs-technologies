"use client";

/* What the assistant shows under an answer about a topic: courses, notes that
   download as PDF or Word, and practice. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowRightIcon, BookIcon, CheckIcon, DownloadIcon, FileIcon, OpenBookIcon, SparkleIcon, TargetIcon } from "@/components/ui/icons";
import { AssistantError } from "@/lib/assistant";
import { findCourses, notesBlocks, practiceFor, topicCourse, trustedCourses, type Study } from "@/lib/assistant-study";
import { emptyLearning, type Course } from "@/lib/learn";
import { downloadDocx, downloadPdf } from "@/lib/doc-export";
import { firstRevision, makeNotes, MAX_NOTES, type NoteSet, type NotesReply } from "@/lib/notes";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

/** Opens a course made for a topic: adds it to the student's courses first if it isn't there. */
export function useOpenTopicCourse() {
  const router = useRouter();
  const { state, actions } = useStore();
  return useCallback(
    (c: Course) => {
      const l = state.learning ?? emptyLearning();
      if (!(l.catalog ?? []).some((x) => x.id === c.id)) actions.patch({ learning: { ...l, catalog: [...(l.catalog ?? []), c] } });
      router.push(`/learn/${c.id}`);
    },
    [state.learning, actions, router],
  );
}

export function StudyCard({ s }: { s: Study }) {
  const { state, actions } = useStore();
  const openCourse = useOpenTopicCourse();
  const own = useMemo(() => findCourses(s.topic, state.learning?.catalog ?? []), [s.topic, state.learning?.catalog]);
  // no StudentOS course on this topic yet: offer one made for it
  const made = useMemo(() => (own.length ? null : topicCourse(s.topic, s.level)), [own.length, s.topic, s.level]);
  const outside = useMemo(() => trustedCourses(s.topic), [s.topic]);
  const practice = useMemo(() => practiceFor(s.topic), [s.topic]);
  const [notes, setNotes] = useState<NotesReply | null>(null);
  const [busy, setBusy] = useState<"" | "notes" | "pdf">("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(true);

  const profile = [state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year].filter(Boolean).join(" · ");
  const make = async () => {
    setBusy("notes");
    setErr("");
    try {
      setNotes(await makeNotes({ topic: s.topic, level: s.level, profile }));
    } catch (e) {
      setErr(e instanceof AssistantError ? (/premium/i.test(e.message) ? "Notes are part of Premium." : e.message) : "Couldn’t make notes. Try again.");
    } finally {
      setBusy("");
    }
  };
  const blocks = () => notesBlocks(notes!, s.level);
  const pdf = async () => {
    setBusy("pdf");
    try {
      await downloadPdf(notes!.title, blocks());
    } catch {
      actions.toast("Couldn’t make the PDF. Try the Word file.");
    } finally {
      setBusy("");
    }
  };
  const keep = () => {
    if (!notes || saved) return;
    const n: NoteSet = { id: uid("n"), at: Date.now(), title: notes.title, source: "topic", summary: notes.summary, sections: notes.sections, terms: notes.terms, cards: notes.cards, rev: firstRevision() };
    actions.patch({ notes: [n, ...(state.notes ?? [])].slice(0, MAX_NOTES) });
    setSaved(true);
    actions.toast("Saved to AI Notes, with flashcards for revision.");
  };

  return (
    <div className="@container mt-3 overflow-hidden rounded-2xl border border-accent/25 bg-[#110f17]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent"><OpenBookIcon size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-white">Study {s.topic}</span>
          <span className="block text-[11.5px] text-white/50">Courses, notes and practice · {s.level}</span>
        </span>
        <span className="text-[12px] text-white/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-4 p-4">
          {/* notes */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <FileIcon size={15} className="text-white/50" />
              <p className="min-w-0 flex-1 text-[13.5px] font-medium text-white">Notes on {s.topic}</p>
              {!notes ? (
                <button type="button" onClick={() => void make()} disabled={busy === "notes"} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-[#160d2b] disabled:opacity-60">
                  <SparkleIcon size={12} /> {busy === "notes" ? "Writing notes…" : "Make notes"}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => void pdf()} disabled={busy === "pdf"} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-[#160d2b] disabled:opacity-60"><DownloadIcon size={12} /> {busy === "pdf" ? "Making PDF…" : "PDF"}</button>
                  <button type="button" onClick={() => downloadDocx(notes.title, blocks())} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12.5px] font-medium text-white/85 hover:border-white/25"><DownloadIcon size={12} /> Word</button>
                  <button type="button" onClick={keep} disabled={saved} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12.5px] font-medium text-white/85 hover:border-white/25 disabled:opacity-60">{saved ? <><CheckIcon size={12} /> Saved</> : "Save to my notes"}</button>
                </>
              )}
            </div>
            {err && <p className="mt-2 text-[12.5px] text-rose-300">{err}{/premium/i.test(err) && <Link href="/premium" className="ml-1 text-accent hover:underline">See Premium</Link>}</p>}
            {busy === "notes" && <div className="mt-3 space-y-2">{[0, 1, 2].map((k) => <div key={k} className="h-3 animate-pulse rounded bg-white/[0.06]" style={{ width: `${90 - k * 18}%` }} />)}</div>}
            {notes && (
              <div className="mt-3 max-h-[340px] overflow-y-auto pr-1">
                <p className="text-[15px] font-semibold text-white">{notes.title}</p>
                {notes.summary && <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{notes.summary}</p>}
                {notes.sections.map((sec) => (
                  <div key={sec.heading} className="mt-3">
                    <p className="text-[13px] font-semibold text-accent">{sec.heading}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-white/80">{sec.points.map((p, k) => <li key={k}>{p}</li>)}</ul>
                  </div>
                ))}
                {notes.terms.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[13px] font-semibold text-accent">Key terms</p>
                    <ul className="mt-1 space-y-1 text-[13px] text-white/80">{notes.terms.map((t) => <li key={t.term}><b className="text-white">{t.term}:</b> {t.meaning}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* courses */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-white/50 uppercase"><BookIcon size={13} /> Courses</p>
            <div className="grid gap-2 @md:grid-cols-2">
              {own.map((c) => (
                <Link key={c.id} href={`/learn/${c.id}`} className="group rounded-xl border border-white/[0.07] p-3 transition hover:border-accent/40">
                  <span className="text-[10.5px] font-semibold text-cyan-300">ON STUDENTOS · {c.modules.length} module{c.modules.length === 1 ? "" : "s"} · certificate</span>
                  <span className="mt-1 block text-[13.5px] font-medium text-white group-hover:text-accent">{c.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] text-white/50">{c.blurb}</span>
                </Link>
              ))}
              {made && (
                <button type="button" onClick={() => openCourse(made)} className="group rounded-xl border border-accent/30 bg-accent/[0.05] p-3 text-left transition hover:border-accent/60">
                  <span className="text-[10.5px] font-semibold text-cyan-300">ON STUDENTOS · {made.modules.length} lessons · certificate</span>
                  <span className="mt-1 block text-[13.5px] font-medium text-white group-hover:text-accent">{made.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] text-white/50">The most viewed lessons on this topic, played inside StudentOS, with a quiz.</span>
                </button>
              )}
              {outside.map((c) => (
                <a key={c.url + c.title} href={c.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-white/[0.07] p-3 transition hover:border-accent/40">
                  <span className="text-[10.5px] font-semibold text-white/45">FREE · {c.by.toUpperCase()} ↗</span>
                  <span className="mt-1 block text-[13.5px] font-medium text-white group-hover:text-accent">{c.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* practice */}
          <div className="flex flex-wrap gap-2">
            {practice.map((p) => (
              <Link key={p.label} href={p.href} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[12.5px] text-white/80 transition hover:border-accent/50 hover:text-white")}>
                <TargetIcon size={12} /> {p.label} <ArrowRightIcon size={11} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
