"use client";

/* Exam Prep: for II PUC, CBSE 12, NEET and KCET students. Pick the exam and
   subject, see every chapter with how strong you are in it, read short notes,
   practise exam-style questions, get anything explained simply (English,
   Hinglish or Kannada), and study in focused sessions. Free. */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ArrowRightIcon, ChatIcon, CheckIcon, FlameIcon, MaximizeIcon, PauseIcon, PlayIcon, RefreshIcon, TargetIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { AssistantError, postAi } from "@/lib/assistant";
import {
  CHAPTERS,
  EXAMS,
  STATUS_LABEL,
  chapterKey,
  focusStreak,
  sanitizeNotes,
  sanitizeQuestions,
  statusOf,
  type ChapterNotes,
  type ExamId,
  type ExamPrepState,
  type PracticeQ,
  type Status,
  type Subject,
} from "@/lib/exam-prep";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TONE: Record<Status, string> = {
  new: "text-white/45 ring-white/12",
  weak: "text-rose-300 bg-rose-500/10 ring-rose-400/25",
  ok: "text-amber-300 bg-amber-400/10 ring-amber-400/25",
  strong: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/25",
};
const today = () => new Date().toISOString().slice(0, 10);

export default function ExamPrepPage() {
  const { state, actions } = useStore();
  const prep: ExamPrepState = state.examPrep ?? {};
  const exam = EXAMS.find((e) => e.id === prep.exam) ?? EXAMS[0];
  const [subject, setSubject] = useState<Subject>(exam.subjects[0]);
  const [open, setOpen] = useState<string | null>(null);
  const subj = exam.subjects.includes(subject) ? subject : exam.subjects[0];
  const scores = prep.scores ?? {};
  const patch = (p: Partial<ExamPrepState>) => actions.patch({ examPrep: { ...(state.examPrep ?? {}), ...p } });

  const chapters = CHAPTERS[subj];
  const practised = chapters.filter((c) => scores[chapterKey(subj, c)]).length;
  const weak = useMemo(
    () =>
      exam.subjects
        .flatMap((s) => CHAPTERS[s].map((c) => ({ s, c, sc: scores[chapterKey(s, c)] })))
        .filter((x) => statusOf(x.sc) === "weak")
        .sort((a, b) => a.sc!.last - b.sc!.last)
        .slice(0, 5),
    [exam, scores],
  );

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader title="Exam Prep" sub="Every chapter of your exam: short notes, exam-style practice, and help in simple words. Free." />

      {/* exam */}
      <div role="radiogroup" aria-label="Your exam" className="mt-5 flex flex-wrap gap-2">
        {EXAMS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={exam.id === e.id}
            onClick={() => patch({ exam: e.id as ExamId })}
            className={cn("rounded-xl border px-3.5 py-2 text-left transition-colors", exam.id === e.id ? "border-accent/60 bg-[var(--color-plum)]" : "border-white/[0.08] hover:border-white/20")}
          >
            <span className="block text-[13.5px] font-semibold text-white">{e.label}</span>
            <span className="block text-[11px] text-white/50">{e.sub}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* subject tabs */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07]">
            <div role="tablist" aria-label="Subject" className="flex gap-1">
              {exam.subjects.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={subj === s} onClick={() => setSubject(s)} className={cn("relative px-3 pb-2.5 text-[13.5px] font-medium transition-colors", subj === s ? "text-white" : "text-white/50 hover:text-white")}>
                  {s}
                  {subj === s && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
                </button>
              ))}
            </div>
            <p className="pb-2.5 text-[12px] text-white/50 tabular-nums">
              {practised}/{chapters.length} chapters practised · Class 12 NCERT
            </p>
          </div>

          {/* chapters */}
          <ol key={subj} className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08]">
            {chapters.map((c, i) => {
              const sc = scores[chapterKey(subj, c)];
              const st = statusOf(sc);
              return (
                <li key={c} className="ep-row" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <button type="button" onClick={() => setOpen(chapterKey(subj, c))} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]">
                    <span className="w-6 shrink-0 text-[12px] text-white/35 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-white">{c}</span>
                      {sc && (
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.07]">
                            <span className={cn("block h-full rounded-full", st === "weak" ? "bg-rose-400" : st === "ok" ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${sc.last}%` }} />
                          </span>
                          <span className="text-[11px] text-white/45 tabular-nums">last {sc.last}% · best {sc.best}%</span>
                        </span>
                      )}
                    </span>
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", TONE[st])}>{STATUS_LABEL[st]}</span>
                    <ArrowRightIcon size={13} className="text-white/30 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-5">
          <FocusTimer focus={prep.focus} onDone={(min) => patch({ focus: { ...(prep.focus ?? {}), [today()]: (prep.focus?.[today()] ?? 0) + min } })} />

          <Card className="p-5">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <TargetIcon size={15} className="text-rose-300" /> Weak chapters first
            </p>
            {weak.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/50">Practise a few chapters. The ones you score under 60% in show up here, so you know what to revise first.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {weak.map((w) => (
                  <li key={chapterKey(w.s, w.c)}>
                    <button
                      type="button"
                      onClick={() => {
                        setSubject(w.s);
                        setOpen(chapterKey(w.s, w.c));
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-white">{w.c}</span>
                        <span className="text-[11px] text-white/45">{w.s}</span>
                      </span>
                      <span className="text-[12px] font-semibold text-rose-300 tabular-nums">{w.sc!.last}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {open && <ChapterDrawer key={open} chapterId={open} exam={exam.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ---------------- chapter: notes, practice, explain ---------------- */

function ChapterDrawer({ chapterId, exam, onClose }: { chapterId: string; exam: ExamId; onClose: () => void }) {
  const [subject, chapter] = chapterId.split(/\/(.+)/) as [Subject, string];
  const [tab, setTab] = useState<"notes" | "practice" | "explain">("notes");
  const examLabel = EXAMS.find((e) => e.id === exam)!.label;
  return (
    <Drawer open onClose={onClose} eyebrow={`${examLabel} · ${subject}`} title={chapter} width="w-[600px]">
      <div role="tablist" className="-mt-1 mb-5 flex gap-1 rounded-xl border border-white/[0.08] p-1">
        {(
          [
            ["notes", "Short notes"],
            ["practice", "Practice"],
            ["explain", "Explain simply"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-8 flex-1 rounded-lg text-[12.5px] font-medium transition-colors", tab === k ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
            {l}
          </button>
        ))}
      </div>
      {tab === "notes" && <Notes subject={subject} chapter={chapter} exam={exam} onPractice={() => setTab("practice")} />}
      {tab === "practice" && <Practice subject={subject} chapter={chapter} exam={exam} />}
      {tab === "explain" && <Explain subject={subject} chapter={chapter} examLabel={examLabel} />}
    </Drawer>
  );
}

function Notes({ subject, chapter, exam, onPractice }: { subject: Subject; chapter: string; exam: ExamId; onPractice: () => void }) {
  const { state, actions } = useStore();
  const key = chapterKey(subject, chapter);
  const saved = state.examPrep?.notes?.[key];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const n = sanitizeNotes(await postAi<unknown>("/api/exam-prep", { action: "notes", exam, subject, chapter }));
      if (!n) throw new AssistantError("Couldn’t make notes right now. Try again.");
      actions.patch({ examPrep: { ...(state.examPrep ?? {}), notes: { ...(state.examPrep?.notes ?? {}), [key]: n } } });
    } catch (e) {
      setErr(e instanceof AssistantError ? e.message : "Couldn’t make notes right now. Try again.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!saved) void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (busy && !saved) return <Loading text="Writing short notes for this chapter…" />;
  if (!saved) return <ErrorBox text={err || "Couldn’t make notes."} onRetry={load} />;
  const n: ChapterNotes = saved;
  return (
    <div className="space-y-5">
      {n.summary && <p className="ep-in text-[13.5px] leading-relaxed text-white/80">{n.summary}</p>}
      <section className="ep-in">
        <h3 className="text-[12px] font-semibold tracking-wide text-[var(--cyan)] uppercase">Must-know points</h3>
        <ul className="mt-2 space-y-2">
          {n.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-white/85">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
      </section>
      {n.formulas.length > 0 && (
        <section className="ep-in">
          <h3 className="text-[12px] font-semibold tracking-wide text-[var(--cyan)] uppercase">Formulas</h3>
          <ul className="mt-2 space-y-1.5">
            {n.formulas.map((f, i) => (
              <li key={i} className="rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-[13px] text-white">
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
      {n.mistakes.length > 0 && (
        <section className="ep-in rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
          <h3 className="text-[12px] font-semibold tracking-wide text-amber-300 uppercase">Common mistakes</h3>
          <ul className="mt-2 space-y-1.5">
            {n.mistakes.map((m, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-white/80">
                • {m}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button variant="primary" icon={<TargetIcon size={14} />} onClick={onPractice}>
          Practise this chapter
        </Button>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-1.5 text-[12.5px] text-white/50 hover:text-white disabled:opacity-50">
          <RefreshIcon size={12} className={cn(busy && "animate-spin")} /> Rewrite notes
        </button>
      </div>
      <p className="text-[11.5px] text-white/35">Written by AI from the NCERT chapter. Check with your textbook before the exam.</p>
    </div>
  );
}

function Practice({ subject, chapter, exam }: { subject: Subject; chapter: string; exam: ExamId }) {
  const { state, actions } = useStore();
  const key = chapterKey(subject, chapter);
  const [qs, setQs] = useState<PracticeQ[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const start = async () => {
    setBusy(true);
    setErr("");
    setI(0);
    setPicked([]);
    setDone(false);
    try {
      const list = sanitizeQuestions(await postAi<unknown>("/api/exam-prep", { action: "quiz", exam, subject, chapter }));
      if (list.length < 5) throw new AssistantError("Couldn’t make questions right now. Try again.");
      setQs(list);
    } catch (e) {
      setErr(e instanceof AssistantError ? e.message : "Couldn’t make questions right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = (answers: number[]) => {
    const right = qs!.filter((q, k) => answers[k] === q.answer).length;
    const pct = Math.round((right / qs!.length) * 100);
    const prev = state.examPrep?.scores?.[key];
    actions.patch({ examPrep: { ...(state.examPrep ?? {}), scores: { ...(state.examPrep?.scores ?? {}), [key]: { best: Math.max(pct, prev?.best ?? 0), last: pct, attempts: (prev?.attempts ?? 0) + 1, at: Date.now() } } } });
    setDone(true);
  };

  if (busy) return <Loading text="Writing 10 exam-style questions…" />;
  if (err) return <ErrorBox text={err} onRetry={start} />;
  if (!qs) {
    const sc = state.examPrep?.scores?.[key];
    return (
      <div className="ep-in rounded-2xl border border-white/[0.08] p-6 text-center">
        <p className="text-[15px] font-semibold text-white">10 questions in exam style</p>
        <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-white/55">Easy to hard, covering the whole chapter. You see the answer and why after each one.</p>
        {sc && <p className="mt-3 text-[12.5px] text-white/60 tabular-nums">Last time {sc.last}% · best {sc.best}% · {sc.attempts} attempt{sc.attempts > 1 ? "s" : ""}</p>}
        <Button variant="primary" className="mt-5" icon={<PlayIcon size={12} />} onClick={() => void start()}>
          Start practice
        </Button>
      </div>
    );
  }
  if (done) {
    const right = qs.filter((q, k) => picked[k] === q.answer).length;
    const pct = Math.round((right / qs.length) * 100);
    const st = statusOf({ best: pct, last: pct, attempts: 1, at: 0 });
    return (
      <div className="space-y-5">
        <div className="ep-in rounded-2xl border border-white/[0.08] p-6 text-center">
          <p className="text-[40px] font-semibold tracking-tight text-white tabular-nums">{pct}%</p>
          <p className="text-[13px] text-white/60">
            {right} of {qs.length} right · <span className={cn("font-medium", st === "weak" ? "text-rose-300" : st === "ok" ? "text-amber-300" : "text-emerald-300")}>{STATUS_LABEL[st]}</span>
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="primary" icon={<RefreshIcon size={12} />} onClick={() => void start()}>
              New set of questions
            </Button>
          </div>
        </div>
        {right < qs.length && (
          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-white/60 uppercase">Revise these</h3>
            <ul className="mt-2 space-y-2">
              {qs.map((q, k) =>
                picked[k] !== q.answer ? (
                  <li key={k} className="rounded-xl border border-white/[0.08] p-3.5">
                    <p className="text-[13px] font-medium text-white">{q.q}</p>
                    <p className="mt-1 text-[12.5px] text-emerald-300">Answer: {q.options[q.answer]}</p>
                    {q.explain && <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{q.explain}</p>}
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        )}
      </div>
    );
  }
  const q = qs[i];
  const chosen = picked[i];
  const answered = chosen != null;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] text-white/50 tabular-nums">
        <span>
          Question {i + 1} of {qs.length}
        </span>
        <span>{picked.filter((p, k) => p === qs[k].answer).length} right</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((i + (answered ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>
      <p key={i} className="ep-in mt-5 text-[15px] leading-relaxed font-medium text-white">
        {q.q}
      </p>
      <div className="mt-4 space-y-2">
        {q.options.map((o, k) => {
          const right = k === q.answer;
          return (
            <button
              key={k}
              type="button"
              disabled={answered}
              onClick={() => setPicked((p) => Object.assign([...p], { [i]: k }))}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[13.5px] transition-colors",
                !answered && "border-white/[0.09] text-white/85 hover:border-accent/50 hover:bg-white/[0.02]",
                answered && right && "border-emerald-400/50 bg-emerald-400/10 text-white",
                answered && !right && chosen === k && "border-rose-400/50 bg-rose-500/10 text-white",
                answered && !right && chosen !== k && "border-white/[0.06] text-white/45",
              )}
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10.5px] font-semibold">
                {answered && right ? <CheckIcon size={11} /> : answered && chosen === k ? <XIcon size={10} /> : String.fromCharCode(65 + k)}
              </span>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="ep-in mt-4 rounded-xl bg-white/[0.04] p-3.5">
          <p className={cn("text-[12.5px] font-semibold", chosen === q.answer ? "text-emerald-300" : "text-rose-300")}>{chosen === q.answer ? "Correct" : "Not quite"}</p>
          {q.explain && <p className="mt-1 text-[13px] leading-relaxed text-white/75">{q.explain}</p>}
          <Button size="sm" variant="primary" className="mt-3" onClick={() => (i + 1 < qs.length ? setI(i + 1) : finish(picked))}>
            {i + 1 < qs.length ? "Next question" : "See my score"}
          </Button>
        </div>
      )}
    </div>
  );
}

const LANGS = [
  { id: "English", label: "English" },
  { id: "Hinglish", label: "Hinglish" },
  { id: "Kannada", label: "ಕನ್ನಡ" },
];

function Explain({ subject, chapter, examLabel }: { subject: Subject; chapter: string; examLabel: string }) {
  const router = useRouter();
  const [lang, setLang] = useState("English");
  const [doubt, setDoubt] = useState("");
  const ask = (text: string) => {
    const q = `I'm a ${examLabel} student. ${subject}, chapter “${chapter}”. ${text.trim() || "Explain this chapter simply"}. Explain it in very simple ${lang === "Kannada" ? "Kannada (Kannada script, keep science terms in English)" : lang === "Hinglish" ? "Hinglish (Hindi in English letters)" : "English"}, step by step, with an everyday example. End with 2 quick questions to check I understood.`;
    router.push(`/assistant?ask=${encodeURIComponent(q)}`);
  };
  const starters = [`Explain “${chapter}” from the basics`, "What are the most important things for the exam?", "Explain the hardest topic in this chapter"];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12.5px] font-semibold text-white/80">Language</p>
        <div role="radiogroup" className="mt-1.5 inline-flex rounded-lg border border-white/10 p-0.5">
          {LANGS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} onClick={() => setLang(l.id)} className={cn("h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors", lang === l.id ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="ep-doubt" className="text-[12.5px] font-semibold text-white/80">
          What don’t you understand?
        </label>
        <textarea id="ep-doubt" rows={3} value={doubt} onChange={(e) => setDoubt(e.target.value)} placeholder="e.g. Why does a capacitor block DC but allow AC?" className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-field px-3.5 py-2.5 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-accent" />
        <Button variant="primary" className="mt-2" icon={<ChatIcon size={13} />} disabled={!doubt.trim()} onClick={() => ask(doubt)}>
          Explain it
        </Button>
      </div>
      <div>
        <p className="text-[12px] text-white/45">Or start with</p>
        <div className="mt-2 space-y-1.5">
          {starters.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="group flex w-full items-center justify-between rounded-lg border border-white/[0.08] px-3.5 py-2.5 text-left text-[13px] text-white/80 transition-colors hover:border-white/20 hover:text-white">
              {s}
              <ArrowRightIcon size={12} className="text-white/30 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="flex items-center gap-2 text-[13px] text-white/70">
        <span className="ui-live" aria-hidden /> {text}
      </p>
      {[92, 80, 86, 70, 60].map((w, k) => (
        <div key={k} className="h-3 animate-pulse rounded-full bg-white/[0.06]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
function ErrorBox({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.06] p-4">
      <p className="text-[13px] text-rose-200">{text}</p>
      <Button size="sm" className="mt-3" icon={<RefreshIcon size={12} />} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* ---------------- focus timer ---------------- */

function FocusTimer({ focus, onDone }: { focus?: Record<string, number>; onDone: (minutes: number) => void }) {
  const [mins, setMins] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const streak = focusStreak(focus);
  const todayMin = focus?.[today()] ?? 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (left > 0 || !running) return;
    setRunning(false);
    onDone(mins);
    setLeft(mins * 60);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = mins * 60;
  const r = 52;
  const c = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const full = () => {
    const el = box.current;
    if (el && !document.fullscreenElement) void el.requestFullscreen?.().catch(() => {});
  };

  return (
    <Card className="p-5">
      <div ref={box} className="ep-focus flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-white">Focus session</p>
          <span className="flex items-center gap-1 text-[12px] text-amber-300 tabular-nums" title="Days in a row with a finished session">
            <FlameIcon size={13} /> {streak} day{streak === 1 ? "" : "s"}
          </span>
        </div>
        <div className="relative mx-auto mt-4 h-[132px] w-[132px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-semibold tracking-tight text-white tabular-nums" aria-live="off">
              {mm}:{ss}
            </span>
            <span className="text-[11px] text-white/45">{running ? "stay on this" : "ready"}</span>
          </div>
        </div>
        {!running && left === total && (
          <div role="radiogroup" aria-label="Length" className="mx-auto mt-3 inline-flex rounded-lg border border-white/10 p-0.5">
            {[25, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mins === m}
                onClick={() => {
                  setMins(m);
                  setLeft(m * 60);
                }}
                className={cn("h-7 rounded-md px-2.5 text-[12px] font-medium tabular-nums", mins === m ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}
              >
                {m} min
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-center gap-2">
          <Button size="sm" variant="primary" icon={running ? <PauseIcon size={12} /> : <PlayIcon size={11} />} onClick={() => setRunning((v) => !v)}>
            {running ? "Pause" : left < total ? "Resume" : "Start"}
          </Button>
          {running && (
            <Button size="sm" icon={<MaximizeIcon size={12} />} onClick={full}>
              Full screen
            </Button>
          )}
          {!running && left < total && (
            <Button size="sm" variant="ghost" onClick={() => setLeft(total)}>
              Reset
            </Button>
          )}
        </div>
        <p className="mt-3 text-center text-[11.5px] text-white/45">
          {todayMin ? `${todayMin} min focused today. ` : ""}Put your phone face down and keep this screen open.
        </p>
      </div>
    </Card>
  );
}

