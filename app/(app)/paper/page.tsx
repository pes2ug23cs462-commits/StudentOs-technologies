"use client";

/* Question Paper (/paper): the student picks a subject, level and total marks; the AI
   writes an exam-style paper in sections (MCQ, short, long), each section asked for
   separately so long papers never get cut off. Shown like a real paper, with an
   answer key, and saved as PDF / Word. The last few papers stay on this device. */

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { CheckIcon, DownloadIcon, EyeIcon, EyeOffIcon, FileIcon, PlusIcon, RefreshIcon, TrashIcon } from "@/components/ui/icons";
import { Card, Label } from "@/components/ui/primitives";
import { AssistantError, postAi } from "@/lib/assistant";
import { downloadDocx, downloadPdf, type DocBlock } from "@/lib/doc-export";
import { studentLine } from "@/lib/setup";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Level = "beginner" | "intermediate" | "expert";
type Kind = "mcq" | "short" | "long";
type Q = { q: string; options?: string[]; answer: number | string };
type Section = { kind: Kind; count: number; marks: number; questions: Q[] };
type Paper = { id: string; at: number; subject: string; topics: string; level: Level; plan: number; total: number; time: string; sections: Section[] };

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Definitions and basics" },
  { id: "intermediate", label: "Intermediate", hint: "Semester-exam level" },
  { id: "expert", label: "Expert", hint: "Tough, multi-step" },
];
/** How each total is split: [kind, how many, marks each]. */
const PLAN: Record<number, { time: string; parts: [Kind, number, number][] }> = {
  25: { time: "45 minutes", parts: [["mcq", 5, 1], ["short", 5, 2], ["long", 2, 5]] },
  50: { time: "1 hour 30 minutes", parts: [["mcq", 10, 1], ["short", 5, 4], ["long", 2, 10]] },
  80: { time: "2 hours 30 minutes", parts: [["mcq", 10, 1], ["short", 6, 5], ["long", 4, 10]] },
  100: { time: "3 hours", parts: [["mcq", 20, 1], ["short", 8, 5], ["long", 4, 10]] },
};
const KIND_NAME: Record<Kind, string> = { mcq: "Multiple choice", short: "Short answer", long: "Long answer" };
const LETTER = ["A", "B", "C"];
const OPT = ["a", "b", "c", "d"];
const KEY = "sos.papers";
const levelName = (l: Level) => LEVELS.find((x) => x.id === l)?.label ?? l;

function loadSaved(): Paper[] {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}
function save(list: Paper[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* storage full or blocked: the paper still shows */
  }
}

/** The paper (and, if asked, the answer key) as blocks for the PDF / Word file. */
function toBlocks(p: Paper, withKey: boolean): DocBlock[] {
  const out: DocBlock[] = [
    { kind: "title", text: `${p.subject} · Question Paper` },
    { kind: "sub", text: `${levelName(p.level)} level · Time: ${p.time} · Maximum marks: ${p.total}` },
    { kind: "small", text: "Instructions: Answer all questions. Marks for each question are shown in brackets. Write neatly and to the point." },
  ];
  let n = 0;
  p.sections.forEach((s, i) => {
    out.push({ kind: "h", text: `Section ${LETTER[i]} · ${KIND_NAME[s.kind]} (${s.questions.length} × ${s.marks} = ${s.questions.length * s.marks} marks)` });
    s.questions.forEach((q) => {
      n++;
      out.push({ kind: "p", text: `${n}. ${q.q}  [${s.marks}]` });
      // the four options on one line, to keep the printed paper short
      if (q.options) out.push({ kind: "small", text: q.options.map((o, k) => `(${OPT[k]}) ${o}`).join("     ") });
    });
  });
  if (withKey) {
    out.push({ kind: "h", text: "Answer key" });
    n = 0;
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        n++;
        out.push({ kind: "p", text: typeof q.answer === "number" ? `${n}. (${OPT[q.answer]}) ${q.options?.[q.answer] ?? ""}` : `${n}. ${q.answer}` });
      }),
    );
  }
  return out;
}

export default function PaperPage() {
  const { state } = useStore();
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [level, setLevel] = useState<Level>("intermediate");
  const [total, setTotal] = useState(50);
  const [busy, setBusy] = useState<Kind[] | null>(null);
  const [error, setError] = useState("");
  const [paper, setPaper] = useState<Paper | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState<Paper[]>([]);
  const [file, setFile] = useState("");

  useEffect(() => setSaved(loadSaved()), []);

  const make = async (again?: Paper) => {
    const sub = (again?.subject ?? subject).trim();
    if (!sub) return setError("Type the subject first.");
    const p = again ?? { subject: sub, topics: topics.trim(), level, plan: total, time: PLAN[total].time };
    const plan = PLAN[p.plan] ?? PLAN[50];
    setError("");
    setShowKey(false);
    setBusy(plan.parts.map((x) => x[0]));
    const profile = studentLine(state.setup?.academic);
    const avoid = again ? again.sections.flatMap((s) => s.questions.map((q) => q.q.slice(0, 100))) : [];
    try {
      const sections = await Promise.all(
        plan.parts.map(async ([kind, count, marks]) => {
          const r = await postAi<{ questions: Q[] }>("/api/question-paper", { subject: p.subject, topics: p.topics, level: p.level, kind, count, marks, profile, avoid });
          setBusy((b) => b?.filter((k) => k !== kind) ?? null);
          return { kind, count, marks, questions: r.questions };
        }),
      );
      const done: Paper = { id: `p${Date.now().toString(36)}`, at: Date.now(), subject: p.subject, topics: p.topics, level: p.level, plan: p.plan, total: sections.reduce((a, s) => a + s.questions.length * s.marks, 0), time: p.time, sections };
      setPaper(done);
      const list = [done, ...saved.filter((x) => x.id !== done.id)].slice(0, 10);
      setSaved(list);
      save(list);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t write the paper right now. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const download = async (format: "pdf" | "docx", withKey: boolean) => {
    if (!paper) return;
    setFile(format + (withKey ? "k" : ""));
    try {
      const title = `${paper.subject} question paper${withKey ? " with answers" : ""}`;
      await (format === "pdf" ? downloadPdf(title, toBlocks(paper, withKey)) : downloadDocx(title, toBlocks(paper, withKey)));
    } finally {
      setFile("");
    }
  };

  const remove = (id: string) => {
    const list = saved.filter((x) => x.id !== id);
    setSaved(list);
    save(list);
    if (paper?.id === id) setPaper(null);
  };

  /* ---------- the paper ---------- */
  if (paper) {
    let n = 0;
    return (
      <div className="mx-auto max-w-[920px] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setPaper(null)}>
            ← All papers
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" icon={showKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />} onClick={() => setShowKey((v) => !v)}>
              {showKey ? "Hide answer key" : "Show answer key"}
            </Button>
            <Button size="sm" icon={<DownloadIcon size={14} />} loading={file === "pdf"} onClick={() => download("pdf", false)}>
              PDF
            </Button>
            <Button size="sm" icon={<DownloadIcon size={14} />} loading={file === "pdfk"} onClick={() => download("pdf", true)}>
              PDF with answers
            </Button>
            <Button size="sm" icon={<DownloadIcon size={14} />} loading={file === "docx"} onClick={() => download("docx", false)}>
              Word
            </Button>
            <Button size="sm" variant="primary" icon={<RefreshIcon size={14} />} loading={!!busy} onClick={() => make(paper)}>
              New questions
            </Button>
          </div>
        </div>
        {error && <p className="text-[13px] text-rose-400">{error}</p>}

        {/* looks like a printed exam paper */}
        <article className="rounded-xl bg-[#fdfcf8] px-6 py-8 text-[#1a1a1a] shadow-[0_20px_60px_-20px_rgba(0,0,0,.6)] sm:px-12 sm:py-10" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          <header className="border-b-2 border-[#1a1a1a] pb-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6b5a2e]" style={{ fontFamily: "Inter, sans-serif" }}>
              StudentOS · Practice paper
            </p>
            <h1 className="mt-2 text-[24px] font-bold sm:text-[28px]">{paper.subject}</h1>
            {paper.topics && <p className="mt-1 text-[13.5px] italic text-[#444]">Topics: {paper.topics}</p>}
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-[14px] font-semibold">
              <span>Time: {paper.time}</span>
              <span>{levelName(paper.level)} level</span>
              <span>Max. marks: {paper.total}</span>
            </div>
          </header>
          <p className="mt-4 text-[13.5px] leading-relaxed">
            <b>Instructions:</b> Answer all questions. Marks for each question are shown on the right. Write neatly and to the point.
          </p>

          {paper.sections.map((s, i) => (
            <section key={i} className="mt-7">
              <h2 className="flex items-baseline justify-between border-b border-[#bbb] pb-1 text-[16px] font-bold">
                <span>
                  Section {LETTER[i]} · {KIND_NAME[s.kind]}
                </span>
                <span className="text-[13px] font-semibold">
                  {s.questions.length} × {s.marks} = {s.questions.length * s.marks}
                </span>
              </h2>
              <ol className="mt-3 space-y-3.5">
                {s.questions.map((q, k) => {
                  n++;
                  return (
                    <li key={k} className="text-[15px] leading-relaxed">
                      <div className="flex gap-3">
                        <span className="w-7 shrink-0 font-semibold">{n}.</span>
                        <p className="flex-1 whitespace-pre-line">{q.q}</p>
                        <span className="shrink-0 font-semibold">[{s.marks}]</span>
                      </div>
                      {q.options && (
                        <div className="mt-1.5 grid gap-x-6 gap-y-1 pl-10 sm:grid-cols-2">
                          {q.options.map((o, j) => (
                            <span key={j} className={cn(showKey && q.answer === j && "font-bold text-[#166534]")}>
                              ({OPT[j]}) {o}
                              {showKey && q.answer === j && " ✓"}
                            </span>
                          ))}
                        </div>
                      )}
                      {showKey && typeof q.answer === "string" && (
                        <p className="mt-1.5 ml-10 whitespace-pre-line rounded-md border-l-[3px] border-[#16a34a] bg-[#f0fdf4] px-3 py-2 text-[13.5px] text-[#14532d]" style={{ fontFamily: "Inter, sans-serif" }}>
                          {q.answer}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="mt-10 text-center text-[13px] font-semibold tracking-widest">*** END ***</p>
        </article>
        <p className="text-center text-[12px] text-white/40">Written by AI for practice. Check the answer key against your textbook before relying on it.</p>
      </div>
    );
  }

  /* ---------- setup ---------- */
  const plan = PLAN[total];
  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <PageHeader icon="quiz" tone="amber" title="Question Paper" sub="An exam-style paper for any subject, at your level, with an answer key and a PDF to print." />

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="qp-subject">Subject</Label>
            <input id="qp-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. DBMS, Engineering Physics, Accountancy" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-accent/60 focus:outline-none" />
          </div>
          <div>
            <Label htmlFor="qp-topics" hint="optional">
              Topics or units
            </Label>
            <input id="qp-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. Normalization, SQL joins, Transactions" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-accent/60 focus:outline-none" />
          </div>
        </div>

        <div>
          <Label>Level</Label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Level">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={level === l.id} onClick={() => setLevel(l.id)} className={cn("rounded-xl border px-4 py-3 text-left transition", level === l.id ? "border-accent/70 bg-accent/10" : "border-white/10 bg-white/[0.03] hover:border-white/20")}>
                <span className="flex items-center justify-between text-[14px] font-semibold text-white">
                  {l.label}
                  {level === l.id && <CheckIcon size={15} className="text-accent" />}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-white/50">{l.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Total marks</Label>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Total marks">
            {Object.keys(PLAN).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={total === +m} onClick={() => setTotal(+m)} className={cn("h-10 rounded-xl border px-5 text-[14px] font-semibold transition", total === +m ? "border-accent/70 bg-accent/10 text-white" : "border-white/10 text-white/70 hover:border-white/20")}>
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-white/50">
            {plan.time} ·{" "}
            {plan.parts.map(([k, c, m], i) => (
              <span key={k}>
                {i ? " · " : ""}Section {LETTER[i]}: {c} {KIND_NAME[k].toLowerCase()} × {m}
              </span>
            ))}
          </p>
        </div>

        {error && <p className="text-[13px] text-rose-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" icon={<PlusIcon size={16} />} loading={!!busy} onClick={() => make()}>
            {busy ? "Writing the paper…" : "Make question paper"}
          </Button>
          {busy && (
            <span className="text-[12.5px] text-white/50">
              {plan.parts.map(([k], i) => (
                <span key={k} className={cn("mr-3", !busy.includes(k) && "text-emerald-400")}>
                  {!busy.includes(k) ? "✓" : "…"} Section {LETTER[i]}
                </span>
              ))}
            </span>
          )}
        </div>
      </Card>

      {saved.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-white">Your papers</h2>
          <p className="text-[12.5px] text-white/45">The last 10, kept on this device.</p>
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {saved.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <FileIcon size={16} className="shrink-0 text-accent" />
                <button type="button" onClick={() => setPaper(p)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[14px] font-medium text-white hover:underline">{p.subject}</span>
                  <span className="text-[12px] text-white/45">
                    {levelName(p.level)} · {p.total} marks · {new Date(p.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </button>
                <button type="button" aria-label={`Delete ${p.subject} paper`} onClick={() => remove(p.id)} className="rounded-md p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-rose-400">
                  <TrashIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
