"use client";

/* Practice Problems → one problem, full screen like LeetCode.
   Top bar: Problem List (slide-in), previous / next / random, Run and Submit, AI meter.
   Left pane: Description (with Topics, Hints and Similar problems), AI Helper, Submissions.
   Right pane: the editor, and under it Testcase / Test Result.
   The panes can be resized by dragging the bars between them (saved for next time).
   Code runs in the browser. Every accepted solution goes through the AI checker,
   and it counts as solved only if at most AI_LIMIT% of the code came from AI. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { CodeEditor, type EditKind, type EditorHandle } from "@/components/coding/code-editor";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/primitives";
import { ArrowLeftIcon, BookmarkIcon, BotIcon, BulbIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CodeIcon, FileIcon, FlameIcon, MenuIcon, PlayIcon, RefreshIcon, SendIcon, ShuffleIcon, SparkleIcon, XIcon } from "@/components/ui/icons";
import { AssistantError } from "@/lib/assistant";
import { askCodeHelp, checkCode, snippetLines, trackedShare, type CheckReply, type HelpMode } from "@/lib/coding/ai-usage";
import { findProblem, useMyProblems } from "@/lib/coding/personal";
import { useRouter } from "next/navigation";
import { runCode, show, warmPython } from "@/lib/coding/runner";
import { AI_LIMIT, LANG_LABEL, LEVEL_TONE, type Draft, type Lang, type Level, type RunResult } from "@/lib/coding/types";
import { codingStreak, draftKey, useCoding } from "@/lib/coding/use-coding";
import { cn } from "@/lib/utils";

type Msg = { from: "you" | "ai"; text: string; code?: string; inserted?: boolean };
type Submission = { res: RunResult; passed: number; total: number; check?: CheckReply | "busy" | "failed"; final?: number; counted?: boolean; tracked: number };

const fresh = (code: string): Draft => ({ code, ai: [], paste: [], typed: 0, ms: 0 });

const CHIP: Record<Level, string> = { Easy: "bg-emerald-400/15 text-emerald-400", Medium: "bg-amber-300/15 text-amber-300", Hard: "bg-rose-400/15 text-rose-400" };

/* Pane sizes (percent), dragged by the student and remembered on this device. */
function useSplit() {
  const [size, setSize] = useState({ left: 44, top: 62 });
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("studentos:code-split") || "null");
      if (v && typeof v.left === "number" && typeof v.top === "number") setSize({ left: Math.min(70, Math.max(25, v.left)), top: Math.min(85, Math.max(25, v.top)) });
    } catch {
      /* ignore */
    }
  }, []);
  const save = (v: { left: number; top: number }) => {
    setSize(v);
    try {
      localStorage.setItem("studentos:code-split", JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };
  /** start dragging a divider; `axis` x resizes left/right, y resizes editor/tests */
  const drag = (axis: "x" | "y", ref: { current: HTMLElement | null }) => (e: ReactPointerEvent) => {
    const box = ref.current;
    if (!box) return;
    e.preventDefault();
    const r = box.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (axis === "x") save({ ...sizeRef.current, left: Math.min(70, Math.max(25, ((ev.clientX - r.left) / r.width) * 100)) });
      else save({ ...sizeRef.current, top: Math.min(85, Math.max(25, ((ev.clientY - r.top) / r.height) * 100)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const sizeRef = useRef(size);
  sizeRef.current = size;
  /** keyboard: arrow keys move a focused divider */
  const key = (axis: "x" | "y") => (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -3 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 3 : 0;
    if (!step) return;
    e.preventDefault();
    if (axis === "x") save({ ...size, left: Math.min(70, Math.max(25, size.left + step)) });
    else save({ ...size, top: Math.min(85, Math.max(25, size.top + step)) });
  };
  return { size, drag, key };
}

export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const mine = useMyProblems();
  const { coding, lang, saveDraft, resetDraft, attempt, solve, setLang, toggleSave, addCustom, removeCustom, state } = useCoding();
  const found = mine.find((x) => x.id === id) ?? findProblem(id, coding.custom);
  const p = found ? { ...found, num: found.num || 0 } : undefined;
  const key = p ? draftKey(p.id, lang) : "";
  const [listOpen, setListOpen] = useState(false);
  const [bottom, setBottom] = useState<"cases" | "result">("cases");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const split = useSplit();
  // the problem list drawer closes with Esc
  useEffect(() => {
    if (!listOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setListOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen]);
  const box = useRef<HTMLDivElement>(null);
  const rightBox = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft>(() => (p ? (coding.drafts[key] ?? fresh(p.starter[lang])) : fresh("")));
  const [tab, setTab] = useState<"desc" | "ai" | "result">("desc");
  const [busy, setBusy] = useState<"" | "run" | "submit">("");
  const [run, setRun] = useState<RunResult | null>(null);
  const [caseIx, setCaseIx] = useState(0);
  const [sub, setSub] = useState<Submission | null>(null);
  const [py, setPy] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ask, setAsk] = useState("");
  const [thinking, setThinking] = useState(false);
  const editor = useRef<EditorHandle>(null);
  const since = useRef(Date.now());
  const loadedKey = useRef(key);

  // load the draft for this problem + language
  useEffect(() => {
    if (!p || loadedKey.current === key) return;
    loadedKey.current = key;
    setDraft(coding.drafts[key] ?? fresh(p.starter[lang]));
    setRun(null);
    setSub(null);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // a saved draft that arrives after the page opened replaces the untouched starter
  const saved = coding.drafts[key];
  useEffect(() => {
    if (p && saved && draft.typed === 0 && draft.code === p.starter[lang] && saved.code !== draft.code) setDraft(saved);
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  // save a moment after the student stops typing (nothing to save while it's the untouched starter)
  useEffect(() => {
    if (!p || (!coding.drafts[key] && draft.code === p.starter[lang])) return;
    const t = setTimeout(() => {
      const now = Date.now();
      saveDraft(key, { ...draft, ms: draft.ms + (now - since.current) });
      since.current = now;
    }, 900);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lang !== "python") return;
    setPy("loading");
    warmPython().then(() => setPy("ready"), () => setPy("error"));
  }, [lang]);

  const share = useMemo(() => (p ? trackedShare(draft, lang, p) : { ai: 0, paste: 0, total: 0, lines: 0 }), [draft, lang, p]);

  if (!p) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[15px] text-white/70">This problem doesn’t exist.</p>
        <Link href="/code" className="mt-3 inline-block text-accent hover:underline">Back to problems</Link>
      </div>
    );
  }
  const ix = mine.findIndex((x) => x.id === p.id);
  const next = ix >= 0 ? mine[ix + 1] : undefined;
  const prev = ix > 0 ? mine[ix - 1] : undefined;
  const similar = mine.filter((x) => x.id !== p.id && x.topics.some((t) => p.topics.includes(t))).slice(0, 4);
  const shown = p.tests.slice(0, p.shown);
  const solved = coding.solved[p.id];

  const onEdit = (code: string, kind: EditKind, added: string) => {
    setDraft((d) => {
      const n = { ...d, code };
      if (kind === "type") n.typed = d.typed + Math.max(0, added.length);
      if (kind === "paste" && (added.length > 40 || added.includes("\n"))) n.paste = [...d.paste, ...snippetLines(added)];
      else if (kind === "paste") n.typed = d.typed + added.length;
      if (kind === "ai") n.ai = [...d.ai, ...snippetLines(added)];
      return n;
    });
  };

  const switchLang = (l: Lang) => {
    if (l === lang) return;
    saveDraft(key, { ...draft, ms: draft.ms + (Date.now() - since.current) });
    since.current = Date.now();
    setLang(l);
  };

  const failingText = () => {
    const r = sub?.res ?? run;
    if (!r) return "";
    if (r.error) return r.error;
    const f = r.cases.find((c) => !c.ok);
    if (!f) return "";
    return `input ${p.params.map((n, i) => `${n} = ${show(f.args[i], lang)}`).join(", ")}; expected ${show(f.expected, lang)}; got ${f.error ?? show(f.got, lang)}`;
  };

  const doRun = async () => {
    setBusy("run");
    setRun(null);
    const r = await runCode(lang, draft.code, p.fn[lang], shown);
    setRun(r);
    setCaseIx(Math.max(0, r.cases.findIndex((c) => !c.ok)));
    setBottom("result");
    setBusy("");
  };

  const doSubmit = async () => {
    setBusy("submit");
    setTab("result");
    setSub(null);
    const res = await runCode(lang, draft.code, p.fn[lang], p.tests);
    const passed = res.cases.filter((c) => c.ok).length;
    const total = p.tests.length;
    // the examples panel shows this submission's results too
    setRun(res.status === "ok" ? { ...res, cases: res.cases.slice(0, p.shown) } : res);
    setCaseIx(Math.max(0, res.cases.slice(0, p.shown).findIndex((c) => !c.ok)));
    setBottom("result");
    const tracked = share.total;
    if (res.status !== "ok" || passed < total) {
      attempt(p.id);
      setSub({ res, passed, total, tracked });
      setBusy("");
      return;
    }
    setSub({ res, passed, total, tracked, check: "busy" });
    let check: CheckReply | "failed" = "failed";
    try {
      check = await checkCode({ problem: p, lang, code: draft.code, tracked, typed: draft.typed, pasted: draft.paste.join("\n").length, aiLines: draft.ai.length, minutes: Math.round((draft.ms + (Date.now() - since.current)) / 60000) });
    } catch {
      /* the checker is optional; fall back to the tracked share */
    }
    const final = check === "failed" ? tracked : Math.max(tracked, check.estimate);
    const counted = final <= AI_LIMIT;
    if (counted) solve(p.id, { at: Date.now(), lang, ai: final });
    else attempt(p.id);
    setSub({ res, passed, total, tracked, check, final, counted });
    setBusy("");
  };

  const help = async (mode: HelpMode, question?: string) => {
    setTab("ai");
    const label = question || (mode === "hint" ? "Give me a hint" : mode === "explain" ? "Why is my code wrong?" : "Help me write the next part");
    setMsgs((m) => [...m, { from: "you", text: label }]);
    setThinking(true);
    try {
      const r = await askCodeHelp({ mode, problem: p, lang, code: draft.code, failing: mode === "explain" ? failingText() : undefined, question });
      setMsgs((m) => [...m, { from: "ai", text: r.text, code: r.code }]);
    } catch (e) {
      setMsgs((m) => [...m, { from: "ai", text: e instanceof AssistantError ? e.message : "Couldn’t reach the AI helper. Try again." }]);
    } finally {
      setThinking(false);
    }
  };

  const codeBlocked = share.ai >= AI_LIMIT;
  const meterTone = share.total > AI_LIMIT ? "bg-rose-400" : share.total > AI_LIMIT * 0.7 ? "bg-amber-300" : "bg-emerald-400";
  const current = run?.cases[caseIx];


  const bookmarked = (coding.saved ?? []).includes(p.id);
  const streak = codingStreak(coding);

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const random = () => {
    const pool = mine.filter((x) => x.id !== p.id && !coding.solved[x.id]);
    const from = pool.length ? pool : mine.filter((x) => x.id !== p.id);
    if (from.length) router.push(`/code/${from[Math.floor(Math.random() * from.length)].id}`);
  };
  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30";
  const paneHead = "flex h-10 shrink-0 items-center gap-1 border-b border-white/[0.07] bg-white/[0.03] px-2";
  const tabBtn = (on: boolean) => cn("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition", on ? "text-white" : "text-white/50 hover:text-white");

  const Accordion = ({ k, icon, title, children }: { k: string; icon: ReactNode; title: string; children: ReactNode }) => (
    <div className="border-t border-white/[0.07]">
      <button type="button" aria-expanded={!!open[k]} onClick={() => toggle(k)} className="flex w-full items-center gap-2 py-3 text-left text-[13px] text-white/80 hover:text-white">
        <span className="text-white/50">{icon}</span>
        <span className="flex-1">{title}</span>
        <ChevronDownIcon size={14} className={cn("text-white/40 transition", open[k] && "rotate-180")} />
      </button>
      {open[k] && <div className="pb-3 pl-6 text-[13px] text-white/70">{children}</div>}
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink lg:h-[100dvh]">
      {/* top bar */}
      <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.07] bg-panel px-2 sm:px-3">
        <Link href="/code" aria-label="Back to Coding problems" title="Back to problems" className="group flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white">
          <ArrowLeftIcon size={15} className="transition-transform group-hover:-translate-x-0.5" /> <span className="hidden md:inline">Back</span>
        </Link>
        <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />
        <Link href="/dashboard" aria-label="StudentOS dashboard" className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.06]">
          <LogoMark size={22} />
        </Link>
        <button type="button" aria-label="Problem List" onClick={() => setListOpen(true)} className="flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-white/85 hover:bg-white/[0.06]">
          <MenuIcon size={15} /> <span className="hidden sm:inline">Problem List</span>
        </button>
        <button type="button" aria-label="Previous problem" disabled={!prev} onClick={() => prev && router.push(`/code/${prev.id}`)} className={iconBtn}>
          <ChevronLeftIcon size={16} />
        </button>
        <button type="button" aria-label="Next problem" disabled={!next} onClick={() => next && router.push(`/code/${next.id}`)} className={iconBtn}>
          <ChevronRightIcon size={16} />
        </button>
        <button type="button" aria-label="Random problem" title="Random unsolved problem" onClick={random} className={iconBtn}>
          <ShuffleIcon size={15} />
        </button>

        <div className="mx-auto flex items-center gap-1.5">
          <button type="button" onClick={() => void doRun()} disabled={!!busy} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.07] px-3 text-[13px] font-medium text-white/90 transition hover:bg-white/[0.12] disabled:opacity-50">
            {busy === "run" ? <RefreshIcon size={13} className="animate-spin" /> : <PlayIcon size={13} />} Run
          </button>
          <button type="button" onClick={() => void doSubmit()} disabled={!!busy} className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 text-[13px] font-semibold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-50">
            {busy === "submit" ? <RefreshIcon size={13} className="animate-spin" /> : <SendIcon size={13} />} Submit
          </button>
        </div>

        <div className="hidden items-center gap-2 md:flex" title={`Lines from the AI helper: ${share.ai}% · pasted: ${share.paste}%`}>
          <BotIcon size={14} className="text-white/50" />
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
            <span className={cn("block h-full rounded-full transition-all", meterTone)} style={{ width: `${Math.min(100, (share.total / AI_LIMIT) * 100)}%` }} />
          </span>
          <b className="text-[11.5px] text-white/80 tabular-nums">
            AI {share.total}%/{AI_LIMIT}%
          </b>
        </div>
        <span className={cn("ml-2 hidden items-center gap-1 text-[12.5px] font-semibold sm:flex", streak ? "text-amber-300" : "text-white/35")} title="Days in a row with a solved problem">
          <FlameIcon size={14} /> {streak}
        </span>
        <button type="button" onClick={() => toggleSave(p.id)} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove bookmark" : "Bookmark this problem"} className={cn(iconBtn, "ml-1")}>
          <BookmarkIcon size={16} className={bookmarked ? "fill-current text-accent" : ""} />
        </button>
      </header>

      {/* problem list drawer */}
      {listOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close problem list" className="absolute inset-0 cursor-default bg-scrim/60" onClick={() => setListOpen(false)} />
          <aside className="relative flex h-full w-[min(420px,92vw)] animate-fade-in flex-col border-r border-white/[0.08] bg-raised shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
              <Link href="/code" className="flex items-center gap-1 text-[14px] font-semibold text-white hover:text-accent">
                Problem List <ChevronRightIcon size={14} />
              </Link>
              <button type="button" aria-label="Close" onClick={() => setListOpen(false)} className={iconBtn}>
                <XIcon size={15} />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {mine.map((x) => {
                const s = coding.solved[x.id];
                return (
                  <li key={x.id}>
                    <Link href={`/code/${x.id}`} onClick={() => setListOpen(false)} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition", x.id === p.id ? "bg-white/[0.08] text-white" : "text-white/80 hover:bg-white/[0.05]")}>
                      <span className="w-4 shrink-0">{s ? <CheckIcon size={14} className="text-emerald-400" /> : coding.attempts[x.id] ? <span className="block h-3 w-3 rounded-full border-2 border-amber-300" /> : null}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {x.num}. {x.title}
                      </span>
                      <span className={cn("shrink-0 text-[12px]", LEVEL_TONE[x.level])}>{x.level === "Medium" ? "Med." : x.level}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}

      {/* panes */}
      <div ref={box} className="flex flex-1 flex-col gap-0 p-1.5 lg:min-h-0 lg:flex-row">
        {/* left: description / AI helper / submissions */}
        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] lg:min-h-0" style={{ flexBasis: `${split.size.left}%` }}>
          <div role="tablist" className={paneHead}>
            {(
              [
                ["desc", "Description", <FileIcon key="i" size={13} className="text-sky-400" />],
                ["ai", "AI Helper", <SparkleIcon key="i" size={13} className="text-violet-300" />],
                ["result", "Submissions", <RefreshIcon key="i" size={13} className="text-sky-400" />],
              ] as const
            ).map(([k, l, icon], i) => (
              <span key={k} className="flex items-center">
                {i > 0 && <span className="mx-0.5 h-4 w-px bg-white/10" />}
                <button role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={tabBtn(tab === k)}>
                  {icon} {l}
                  {k === "result" && sub && <span className={cn("ml-0.5 inline-block h-2 w-2 rounded-full", sub.counted ? "bg-emerald-400" : "bg-rose-400")} />}
                </button>
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tab === "desc" && (
              <>
                <div className="flex items-start gap-2">
                  <h1 className="flex-1 text-[22px] font-bold text-white">
                    {p.num}. {p.title}
                  </h1>
                  {solved && (
                    <span className="mt-1.5 flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-emerald-400">
                      Solved <CheckIcon size={13} />
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", CHIP[p.level])}>{p.level}</span>
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, topics: true }))} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[12px] text-white/70 hover:text-white">
                    Topics
                  </button>
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, hints: true }))} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[12px] text-white/70 hover:text-white">
                    <BulbIcon size={11} /> Hint
                  </button>
                  {p.ai && <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[12px] font-semibold text-violet-300">Made for you by AI</span>}
                  {p.ai && (
                    <button type="button" onClick={() => (removeCustom(p.id), router.push("/code"))} className="ml-auto text-[12px] text-white/45 hover:text-rose-400">
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-white/85">{p.statement}</p>
                {shown.map((t, i) => (
                  <div key={i} className="mt-5">
                    <p className="text-[13.5px] font-semibold text-white">Example {i + 1}:</p>
                    <pre className="mt-1.5 overflow-x-auto border-l-2 border-white/15 pl-3.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-white/80">
                      <b className="text-white">Input: </b>
                      {p.params.map((n, k) => `${n} = ${show(t.args[k], lang)}`).join(", ")}
                      {"\n"}
                      <b className="text-white">Output: </b>
                      {show(t.expected, lang)}
                    </pre>
                  </div>
                ))}
                <p className="mt-6 text-[13.5px] font-semibold text-white">Constraints:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 font-mono text-[12.5px] text-white/70">
                  {p.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-5 mb-6 text-[12px] text-white/40">{p.tests.length - p.shown} hidden tests run when you submit.</p>

                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-white/[0.07] py-3 text-[12.5px] text-white/55">
                  <span>
                    Your attempts <b className="text-white">{coding.attempts[p.id] ?? 0}</b>
                  </span>
                  <span>
                    Status <b className={solved ? "text-emerald-400" : "text-white"}>{solved ? `Solved · ${solved.ai}% AI` : "Not solved yet"}</b>
                  </span>
                </div>
                <Accordion k="topics" icon={<CodeIcon size={14} />} title="Topics">
                  <div className="flex flex-wrap gap-1.5">
                    {p.topics.map((t) => (
                      <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[12px] text-white/75">
                        {t}
                      </span>
                    ))}
                  </div>
                </Accordion>
                <Accordion k="hints" icon={<BulbIcon size={14} />} title="Hints">
                  <p>Stuck? The AI helper gives a hint for your current code without giving the answer away. Hints don’t count toward your AI share.</p>
                  <button type="button" disabled={thinking} onClick={() => void help("hint")} className="mt-2 text-[12.5px] font-semibold text-accent hover:underline">
                    Get a hint →
                  </button>
                </Accordion>
                {similar.length > 0 && (
                  <Accordion k="similar" icon={<SparkleIcon size={14} />} title="Similar problems">
                    <ul className="space-y-1.5">
                      {similar.map((x) => (
                        <li key={x.id} className="flex items-center justify-between gap-3">
                          <Link href={`/code/${x.id}`} className="truncate text-white/85 hover:text-accent">
                            {x.num}. {x.title}
                          </Link>
                          <span className={cn("shrink-0 text-[12px]", LEVEL_TONE[x.level])}>{x.level}</span>
                        </li>
                      ))}
                    </ul>
                  </Accordion>
                )}
              </>
            )}

            {tab === "ai" && (
              <div className="flex h-full flex-col">
                <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-3.5 text-[12.5px] leading-relaxed text-white/70">
                  <b className="text-white">Use AI the smart way.</b> Hints and explanations are free to use. Code from the helper counts toward your AI share, and so does code pasted from outside. Keep it at {AI_LIMIT}% or less for the problem to count as solved.
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button size="sm" icon={<BulbIcon size={13} />} disabled={thinking} onClick={() => void help("hint")}>Hint</Button>
                  <Button size="sm" icon={<XIcon size={13} />} disabled={thinking || !(run || sub)} onClick={() => void help("explain")} title={!(run || sub) ? "Run your code first" : undefined}>Explain error</Button>
                  <Button size="sm" icon={<SparkleIcon size={13} />} disabled={thinking || codeBlocked} onClick={() => void help("code")} title={codeBlocked ? "AI code limit reached" : undefined}>Next lines</Button>
                </div>
                {codeBlocked && <p className="mt-2 text-[11.5px] text-amber-300">You’ve used your AI code share for this problem. Hints and explanations still work.</p>}
                <div className="mt-4 flex-1 space-y-3" aria-live="polite">
                  {msgs.length === 0 && <p className="text-[12.5px] text-white/45">Stuck? Ask for a hint first. It won’t give the answer away.</p>}
                  {msgs.map((m, i) => (
                    <div key={i} className={cn("rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.from === "you" ? "ml-8 bg-accent/15 text-white" : "mr-4 bg-white/[0.05] text-white/85")}>
                      <p className="whitespace-pre-line">{m.text}</p>
                      {m.code && (
                        <div className="mt-2">
                          <pre className="code-editor overflow-x-auto rounded-lg p-3 font-mono text-[12.5px] text-white/90">{m.code}</pre>
                          <button
                            type="button"
                            disabled={m.inserted || codeBlocked}
                            onClick={() => {
                              editor.current?.insert(m.code!);
                              setMsgs((all) => all.map((x, k) => (k === i ? { ...x, inserted: true } : x)));
                            }}
                            className="mt-2 text-[12px] font-semibold text-accent hover:underline disabled:text-white/40 disabled:no-underline"
                          >
                            {m.inserted ? "Inserted (counts as AI code)" : "Insert into editor · counts as AI code"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {thinking && <p className="text-[12.5px] text-white/50">Thinking…</p>}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!ask.trim() || thinking) return;
                    void help("hint", ask.trim());
                    setAsk("");
                  }}
                >
                  <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask about this problem…" aria-label="Ask the AI helper" className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-white outline-none focus:border-accent" />
                  <Button type="submit" size="md" variant="primary" disabled={!ask.trim() || thinking} aria-label="Send">
                    <SendIcon size={14} />
                  </Button>
                </form>
              </div>
            )}

            {tab === "result" && (
              <div>
                {!sub && !busy && <p className="text-[13px] text-white/50">Submit your code to run all {p.tests.length} tests.</p>}
                {busy === "submit" && !sub && <p className="text-[13px] text-white/60">Running {p.tests.length} tests…</p>}
                {sub && (
                  <>
                    {sub.res.status !== "ok" ? (
                      <>
                        <p className="text-[20px] font-bold text-rose-400">{sub.res.status === "timeout" ? "Time Limit Exceeded" : "Error"}</p>
                        <pre className="mt-3 overflow-x-auto rounded-xl bg-rose-500/10 p-3 font-mono text-[12.5px] whitespace-pre-wrap text-rose-300">{sub.res.error}</pre>
                      </>
                    ) : sub.passed < sub.total ? (
                      (() => {
                        const k = sub.res.cases.findIndex((c) => !c.ok);
                        const f = sub.res.cases[k];
                        return (
                          <>
                            <p className="text-[20px] font-bold text-rose-400">Wrong Answer</p>
                            <p className="mt-1 text-[13px] text-white/60">{sub.passed} / {sub.total} tests passed · failed on {k < p.shown ? `example ${k + 1}` : "a hidden test"}</p>
                            <CaseView c={f} names={p.params} lang={lang} />
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <p className={cn("text-[20px] font-bold", sub.counted === false ? "text-amber-300" : "text-emerald-400")}>{sub.counted === false ? "Accepted, but not counted" : "Accepted"}</p>
                        <p className="mt-1 text-[13px] text-white/60">
                          {sub.total} / {sub.total} tests passed · {Math.round(sub.res.cases.reduce((a, c) => a + c.ms, 0))} ms
                        </p>
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="flex items-center gap-2 text-[14px] font-semibold text-white"><BotIcon size={15} className="text-accent" /> AI checker</p>
                          {sub.check === "busy" ? (
                            <p className="mt-2 text-[12.5px] text-white/55">Checking how this solution was written…</p>
                          ) : (
                            <>
                              <div className="mt-3 flex items-center gap-3">
                                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                  <span className={cn("block h-full rounded-full", (sub.final ?? 0) > AI_LIMIT ? "bg-rose-400" : "bg-emerald-400")} style={{ width: `${sub.final ?? 0}%` }} />
                                </span>
                                <b className={cn("text-[15px] tabular-nums", (sub.final ?? 0) > AI_LIMIT ? "text-rose-400" : "text-emerald-400")}>{sub.final}% AI</b>
                              </div>
                              <p className="mt-2 text-[12.5px] text-white/65">
                                {sub.counted ? `Within the ${AI_LIMIT}% limit — this counts as solved.` : `Over the ${AI_LIMIT}% limit, so this doesn’t count as solved. Rewrite more of it yourself and submit again.`}
                              </p>
                              <p className="mt-1 text-[11.5px] text-white/40">Tracked from the AI helper and pastes: {sub.tracked}%. {sub.check === "failed" ? "The AI checker couldn’t run, so the tracked share was used." : "The checker’s estimate is used when it’s higher. It’s an estimate, not proof."}</p>
                              {typeof sub.check === "object" && (
                                <>
                                  {sub.check.reasons.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                      {sub.check.reasons.map((r) => <li key={r} className="text-[12px] text-white/55">• {r}</li>)}
                                    </ul>
                                  )}
                                  <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-white/[0.04] p-2.5"><p className="text-[11px] text-white/45">Time</p><p className="font-mono text-[13.5px] text-white">{sub.check.time || "—"}</p></div>
                                    <div className="rounded-lg bg-white/[0.04] p-2.5"><p className="text-[11px] text-white/45">Space</p><p className="font-mono text-[13.5px] text-white">{sub.check.space || "—"}</p></div>
                                  </div>
                                  {sub.check.review.length > 0 && (
                                    <>
                                      <p className="mt-4 text-[12.5px] font-semibold text-white">Code review</p>
                                      <ul className="mt-1.5 space-y-1.5">
                                        {sub.check.review.map((r) => <li key={r} className="flex gap-2 text-[12.5px] leading-relaxed text-white/70"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {r}</li>)}
                                      </ul>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {next && sub.counted && (
                          <Link href={`/code/${next.id}`} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
                            Next problem: {next.title} <ChevronRightIcon size={14} />
                          </Link>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </section>

        {/* drag bar: left | right */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          aria-valuenow={Math.round(split.size.left)}
          tabIndex={0}
          onPointerDown={split.drag("x", box)}
          onKeyDown={split.key("x")}
          className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center lg:flex"
        >
          <span className="h-8 w-[3px] rounded-full bg-white/15 transition group-hover:h-full group-hover:bg-accent group-focus-visible:bg-accent" />
        </div>

        {/* right: editor + tests */}
        <section ref={rightBox} className="mt-1.5 flex min-h-[80vh] min-w-0 flex-1 flex-col lg:mt-0 lg:min-h-0">
          <div className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] lg:min-h-0" style={{ flexBasis: `${split.size.top}%` }}>
            <div className={paneHead}>
              <span className="flex items-center gap-1.5 px-2 text-[12.5px] font-medium text-white">
                <CodeIcon size={14} className="text-emerald-400" /> Code
              </span>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <select value={lang} onChange={(e) => switchLang(e.target.value as Lang)} aria-label="Language" className="h-7 rounded-md bg-transparent px-1.5 text-[12.5px] text-white/80 outline-none hover:bg-white/[0.06] [&>option]:bg-[#1a1a1f]">
                {(["python", "javascript"] as Lang[]).map((l) => (
                  <option key={l} value={l}>
                    {LANG_LABEL[l]}
                  </option>
                ))}
              </select>
              {lang === "python" && py !== "ready" && <span className="truncate text-[11px] text-white/45">{py === "loading" ? "Loading Python…" : py === "error" ? "Python couldn’t load — check your internet" : ""}</span>}
              <button
                type="button"
                onClick={() => {
                  resetDraft(key);
                  setDraft(fresh(p.starter[lang]));
                  setRun(null);
                  setSub(null);
                }}
                className={cn(iconBtn, "ml-auto")}
                aria-label="Reset to the starter code"
                title="Reset code"
              >
                <RefreshIcon size={14} />
              </button>
            </div>
            <CodeEditor ref={editor} value={draft.code} lang={lang} onChange={onEdit} className="min-h-0 flex-1" label={`${LANG_LABEL[lang]} code for ${p.title}`} />
            <p className="flex h-7 shrink-0 items-center justify-between border-t border-white/[0.06] px-3 text-[11px] text-white/35">
              <span>Saved on this device</span>
              <span className="md:hidden">
                AI {share.total}%/{AI_LIMIT}%
              </span>
            </p>
          </div>

          {/* drag bar: editor / tests */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor and tests"
            aria-valuenow={Math.round(split.size.top)}
            tabIndex={0}
            onPointerDown={split.drag("y", rightBox)}
            onKeyDown={split.key("y")}
            className="group hidden h-1.5 shrink-0 cursor-row-resize items-center justify-center lg:flex"
          >
            <span className="h-[3px] w-8 rounded-full bg-white/15 transition group-hover:w-full group-hover:bg-accent group-focus-visible:bg-accent" />
          </div>

          <div className="mt-1.5 flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] lg:mt-0 lg:min-h-0">
            <div role="tablist" className={paneHead}>
              <button role="tab" aria-selected={bottom === "cases"} type="button" onClick={() => setBottom("cases")} className={tabBtn(bottom === "cases")}>
                <CheckIcon size={13} className="text-emerald-400" /> Testcase
              </button>
              <span className="mx-0.5 h-4 w-px bg-white/10" />
              <button role="tab" aria-selected={bottom === "result"} type="button" onClick={() => setBottom("result")} className={tabBtn(bottom === "result")}>
                <BotIcon size={13} className="text-emerald-400" /> Test Result
              </button>
              {run && run.status === "ok" && (
                <span className={cn("ml-auto pr-2 text-[12px] font-semibold", run.cases.every((c) => c.ok) ? "text-emerald-400" : "text-rose-400")}>
                  {run.cases.every((c) => c.ok) ? "Examples passed" : `${run.cases.filter((c) => c.ok).length}/${run.cases.length} passed`}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {shown.map((_, i) => {
                  const c = bottom === "result" ? run?.cases[i] : undefined;
                  return (
                    <button key={i} type="button" onClick={() => setCaseIx(i)} className={cn("flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12.5px] transition", caseIx === i ? "bg-white/[0.1] text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white")}>
                      {c && <span className={cn("h-1.5 w-1.5 rounded-full", c.ok ? "bg-emerald-400" : "bg-rose-400")} />}
                      Case {i + 1}
                    </button>
                  );
                })}
              </div>
              {bottom === "cases" ? (
                <div className="space-y-2.5 font-mono text-[12.5px]">
                  {p.params.map((n, k) => (
                    <div key={n}>
                      <p className="mb-1 font-sans text-[11.5px] text-white/45">{n} =</p>
                      <p className="rounded-lg bg-white/[0.05] px-3 py-2 break-all text-white/85">{show(shown[caseIx]?.args[k], lang)}</p>
                    </div>
                  ))}
                </div>
              ) : busy === "run" || busy === "submit" ? (
                <p className="text-[12.5px] text-white/55">Running…</p>
              ) : run && run.status !== "ok" ? (
                <>
                  <p className="text-[16px] font-semibold text-rose-400">{run.status === "timeout" ? "Time Limit Exceeded" : "Runtime Error"}</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-rose-500/10 p-2.5 font-mono text-[12px] whitespace-pre-wrap text-rose-300">{run.error}</pre>
                </>
              ) : current ? (
                <>
                  <p className={cn("mb-2 text-[16px] font-semibold", run!.cases.every((c) => c.ok) ? "text-emerald-400" : "text-rose-400")}>
                    {run!.cases.every((c) => c.ok) ? "Accepted" : "Wrong Answer"}
                    <span className="ml-2 text-[12px] font-normal text-white/45">Runtime: {Math.round(run!.cases.reduce((a, c) => a + c.ms, 0))} ms</span>
                  </p>
                  <CaseView c={current} names={p.params} lang={lang} compact />
                </>
              ) : (
                <p className="text-[12.5px] text-white/45">You must run your code first.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CaseView({ c, names, lang, compact }: { c: RunResult["cases"][number]; names: string[]; lang: Lang; compact?: boolean }) {
  return (
    <div className={cn("space-y-2 font-mono text-[12.5px]", !compact && "mt-4")}>
      <div className="rounded-lg bg-white/[0.04] p-2.5">
        <p className="mb-1 font-sans text-[11px] text-white/45">Input</p>
        {names.map((n, k) => (
          <p key={n} className="break-all text-white/80"><span className="text-white/45">{n} = </span>{show(c.args[k], lang)}</p>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className={cn("rounded-lg p-2.5", c.ok ? "bg-emerald-400/[0.08]" : "bg-rose-400/[0.08]")}>
          <p className="mb-1 font-sans text-[11px] text-white/45">Your output</p>
          <p className={cn("break-all", c.ok ? "text-emerald-300" : "text-rose-300")}>{c.error ?? show(c.got, lang)}</p>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-2.5">
          <p className="mb-1 font-sans text-[11px] text-white/45">Expected</p>
          <p className="break-all text-white/80">{show(c.expected, lang)}</p>
        </div>
      </div>
      {c.logs && (
        <div className="rounded-lg bg-white/[0.04] p-2.5">
          <p className="mb-1 font-sans text-[11px] text-white/45">Printed</p>
          <pre className="whitespace-pre-wrap text-white/70">{c.logs}</pre>
        </div>
      )}
    </div>
  );
}
