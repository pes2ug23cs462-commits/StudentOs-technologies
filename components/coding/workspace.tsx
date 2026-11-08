"use client";

/* Practice Problems: a LeetCode-style workspace in three panes.
   Left: the problem list (search, level filter, status, bookmarks).
   Middle: the problem, the AI helper and the submission result.
   Right: the editor (Python or JavaScript) with Run / Submit, and the test cases.
   Code runs in the browser. Every accepted solution goes through the AI checker,
   and it counts as solved only if at most AI_LIMIT% of the code came from AI. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor, type EditKind, type EditorHandle } from "@/components/coding/code-editor";
import { Button } from "@/components/ui/button";
import { FancyIcon } from "@/components/site/fancy-icon";
import { ArrowLeftIcon, BookmarkIcon, FlameIcon, BotIcon, BulbIcon, CheckIcon, ChevronRightIcon, FilterIcon, PlayIcon, RefreshIcon, SearchIcon, SendIcon, SparkleIcon, XIcon } from "@/components/ui/icons";
import { AssistantError } from "@/lib/assistant";
import { askCodeHelp, checkCode, snippetLines, trackedShare, type CheckReply, type HelpMode } from "@/lib/coding/ai-usage";
import { findProblem, generateProblem, useMyProblems } from "@/lib/coding/personal";
import { useRouter } from "next/navigation";
import { runCode, show, warmPython } from "@/lib/coding/runner";
import { AI_LIMIT, LANG_LABEL, LEVEL_TONE, type Draft, type Lang, type Level, type RunResult } from "@/lib/coding/types";
import { codingStreak, draftKey, useCoding } from "@/lib/coding/use-coding";
import { cn } from "@/lib/utils";

type Msg = { from: "you" | "ai"; text: string; code?: string; inserted?: boolean };
type Submission = { res: RunResult; passed: number; total: number; check?: CheckReply | "busy" | "failed"; final?: number; counted?: boolean; tracked: number };

const fresh = (code: string): Draft => ({ code, ai: [], paste: [], typed: 0, ms: 0 });

const LEVELS: Level[] = ["Easy", "Medium", "Hard"];
const CHIP: Record<Level, string> = { Easy: "bg-emerald-400/15 text-emerald-400", Medium: "bg-amber-300/15 text-amber-300", Hard: "bg-rose-400/15 text-rose-400" };
type View = "problems" | "topics" | "progress";

export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const mine = useMyProblems();
  const { coding, lang, saveDraft, resetDraft, attempt, solve, setLang, toggleSave, addCustom, removeCustom, state } = useCoding();
  const found = mine.find((x) => x.id === id) ?? findProblem(id, coding.custom);
  const p = found ? { ...found, num: found.num || 0 } : undefined;
  const [gen, setGen] = useState<{ open: boolean; level: Level; topic: string; busy: boolean; error: string }>({ open: false, level: "Easy", topic: "", busy: false, error: "" });
  const key = p ? draftKey(p.id, lang) : "";
  const [view, setView] = useState<View>("problems");
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState<Level | "">("");
  const [topicF, setTopicF] = useState("");
  const [listOpen, setListOpen] = useState(false);
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
  const topics = [...new Set(mine.flatMap((x) => x.topics))].sort();
  const list = mine.filter((x) => (!q.trim() || `${x.num} ${x.title} ${x.topics.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())) && (!lvl || x.level === lvl) && (!topicF || x.topics.includes(topicF)));
  const count = (l?: Level) => mine.filter((x) => !l || x.level === l).length;
  const solvedOf = (l?: Level) => mine.filter((x) => (!l || x.level === l) && coding.solved[x.id]).length;
  const solvedList = mine.filter((x) => coding.solved[x.id]).sort((a, b) => coding.solved[b.id].at - coding.solved[a.id].at);
  const avgAi = solvedList.length ? Math.round(solvedList.reduce((s, x) => s + coding.solved[x.id].ai, 0) / solvedList.length) : 0;

  const makeNew = async () => {
    setGen((g) => ({ ...g, busy: true, error: "" }));
    try {
      const np = await generateProblem({
        level: gen.level,
        topic: gen.topic,
        profile: [state.setup?.academic.course, state.setup?.academic.field, state.setup?.skills.level].filter(Boolean).join(" · "),
        avoid: mine.map((x) => x.title),
      });
      addCustom(np);
      setGen((g) => ({ ...g, busy: false, open: false }));
      router.push(`/code/${np.id}`);
    } catch (e) {
      setGen((g) => ({ ...g, busy: false, error: e instanceof Error ? e.message : "Couldn’t make a problem. Try again." }));
    }
  };

  const listPane = (
    <aside className={cn("min-h-0 flex-col gap-3 xl:flex", listOpen ? "flex" : "hidden")}>
      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/[0.08] p-3">
        {!gen.open ? (
          <button type="button" onClick={() => setGen((g) => ({ ...g, open: true }))} className="flex w-full items-center gap-2.5 text-left">
            <span className="tile-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><SparkleIcon size={15} /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-white">New problem for me</span>
              <span className="block text-[11.5px] text-white/55">AI writes a fresh one, only for you</span>
            </span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[13px] font-semibold text-white">New problem for me</p>
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setGen((g) => ({ ...g, level: l }))} aria-pressed={gen.level === l} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", gen.level === l ? "bg-accent text-black" : "bg-white/[0.05] text-white/70")}>{l}</button>
              ))}
            </div>
            <input value={gen.topic} onChange={(e) => setGen((g) => ({ ...g, topic: e.target.value }))} list="code-topics" placeholder="Topic (optional), e.g. Strings" aria-label="Topic for the new problem" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12.5px] text-white outline-none focus:border-accent" />
            <datalist id="code-topics">{topics.map((x) => <option key={x} value={x} />)}</datalist>
            {gen.error && <p className="text-[11.5px] text-rose-400">{gen.error}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" disabled={gen.busy} onClick={() => setGen((g) => ({ ...g, open: false, error: "" }))}>Cancel</Button>
              <Button size="sm" variant="primary" className="flex-1" loading={gen.busy} onClick={() => void makeNew()}>{gen.busy ? "Writing…" : "Create"}</Button>
            </div>
            {gen.busy && <p className="text-[11px] text-white/45">Writing and checking the problem (10–20 s)…</p>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search problems</span>
          <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems…" className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pr-3 pl-9 text-[13px] text-white outline-none focus:border-accent" />
        </label>
        <label className="relative">
          <span className="sr-only">Topic</span>
          <FilterIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
          <select value={topicF} onChange={(e) => setTopicF(e.target.value)} aria-label="Filter by topic" className="h-10 w-11 appearance-none rounded-xl border border-white/10 bg-white/[0.03] text-transparent outline-none focus:border-accent" title={topicF || "Filter by topic"}>
            <option value="">All topics</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {([["", `All (${count()})`], ...LEVELS.map((l) => [l, `${l} (${count(l)})`])] as [Level | "", string][]).map(([v, l]) => (
          <button key={l} type="button" onClick={() => setLvl(v)} aria-pressed={lvl === v} className={cn("h-8 rounded-full px-2.5 text-[11.5px] font-medium transition", lvl === v ? "bg-accent text-black" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.09]")}>{l}</button>
        ))}
      </div>
      {topicF && (
        <button type="button" onClick={() => setTopicF("")} className="flex w-fit items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11.5px] text-violet-300">
          {topicF} <XIcon size={11} />
        </button>
      )}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {list.map((x) => {
          const s = coding.solved[x.id];
          const on = x.id === p.id;
          return (
            <li key={x.id}>
              <div className={cn("group relative flex items-center gap-3 rounded-2xl border p-3 transition", on ? "border-accent/70 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(139,92,246,0.35)]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/20")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", s ? "border-emerald-400 bg-emerald-400 text-[#ffffff]" : coding.attempts[x.id] ? "border-amber-300" : "border-white/25")} title={s ? "Solved" : coding.attempts[x.id] ? "Tried" : "Not started"}>
                  {s && <CheckIcon size={12} />}
                </span>
                <Link href={`/code/${x.id}`} onClick={() => setListOpen(false)} className="min-w-0 flex-1 after:absolute after:inset-0">
                  <span className="block truncate text-[13.5px] font-semibold text-white">{x.num}. {x.title}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className={cn("rounded-md px-1.5 py-px text-[10.5px] font-semibold", CHIP[x.level])}>{x.level}</span>
                    {x.ai && <span className="rounded-md bg-violet-500/20 px-1.5 py-px text-[10.5px] font-semibold text-violet-300">Made for you</span>}
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-px text-[10.5px] text-white/60">{x.topics[0]}</span>
                  </span>
                </Link>
                {s && <span className="relative text-[11.5px] text-white/50 tabular-nums" title="AI used">{s.ai}% AI</span>}
                <button type="button" onClick={() => toggleSave(x.id)} aria-label={(coding.saved ?? []).includes(x.id) ? `Remove bookmark: ${x.title}` : `Bookmark ${x.title}`} aria-pressed={(coding.saved ?? []).includes(x.id)} className="relative z-10 text-white/40 hover:text-accent">
                  <BookmarkIcon size={16} className={(coding.saved ?? []).includes(x.id) ? "fill-current text-accent" : ""} />
                </button>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-6 text-center text-[12.5px] text-white/50">No problems match.</li>}
      </ul>
    </aside>
  );

  return (
    <div className="flex flex-col px-4 py-5 lg:px-6 xl:h-[100dvh]">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <FancyIcon name="code" tone="violet" size={54} />
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-white">Practice Problems</h1>
            <p className="text-[13.5px] text-white/60">Your own set of problems — every student gets different ones. Use AI for up to {AI_LIMIT}% of your code.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && <span className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 text-[12.5px] font-semibold text-amber-300"><FlameIcon size={14} /> Streak {streak} day{streak > 1 ? "s" : ""}</span>}
          <Link href="/tests" className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-[12.5px] text-white/70 hover:text-white">
            <ArrowLeftIcon size={13} /> Practice Arena
          </Link>
        </div>
      </div>
      <div role="tablist" aria-label="Practice problems" className="mt-4 flex flex-wrap items-center gap-1 border-b border-white/[0.07] pb-3">
        {(
          [
            ["problems", "Problems"],
            ["topics", "Topics"],
            ["progress", "Progress"],
          ] as [View, string][]
        ).map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={view === k} onClick={() => setView(k)} className={cn("h-10 rounded-xl px-5 text-[14px] font-medium transition", view === k ? "nav-3d text-white" : "text-white/60 hover:text-white")}>
            {l}
          </button>
        ))}
        {view === "problems" && (
          <button type="button" onClick={() => setListOpen((v) => !v)} className="ml-auto h-9 rounded-xl border border-white/10 px-3 text-[12.5px] text-white/70 xl:hidden">
            {listOpen ? "Hide list" : `All problems (${mine.length})`}
          </button>
        )}
      </div>

      {view === "topics" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {topics.map((t) => {
            const all = mine.filter((x) => x.topics.includes(t));
            const done = all.filter((x) => coding.solved[x.id]).length;
            return (
              <button key={t} type="button" onClick={() => { setTopicF(t); setView("problems"); setListOpen(true); }} className="lift-3d depth rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left">
                <p className="text-[14.5px] font-semibold text-white">{t}</p>
                <p className="mt-0.5 text-[12px] text-white/50">{done} / {all.length} solved</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-accent" style={{ width: `${(done / all.length) * 100}%` }} /></div>
              </button>
            );
          })}
        </div>
      )}

      {view === "progress" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="depth rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[15px] font-semibold text-white">Solved</p>
            <p className="mt-2 text-[34px] leading-none font-bold text-white">{solvedOf()}<span className="text-[15px] font-medium text-white/45"> / {mine.length}</span></p>
            <div className="mt-4 space-y-2.5">
              {LEVELS.map((l) => (
                <div key={l}>
                  <div className="flex justify-between text-[12.5px]"><span className={LEVEL_TONE[l]}>{l}</span><span className="text-white/60 tabular-nums">{solvedOf(l)}/{count(l)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className={cn("h-full rounded-full", l === "Easy" ? "bg-emerald-400" : l === "Medium" ? "bg-amber-300" : "bg-rose-400")} style={{ width: `${(solvedOf(l) / count(l)) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="depth rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[15px] font-semibold text-white">Your AI use</p>
            <p className="mt-2 text-[34px] leading-none font-bold text-white">{avgAi}%<span className="text-[15px] font-medium text-white/45"> average</span></p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">Across your solved problems. The limit is {AI_LIMIT}% per problem. Lower means more of the logic is yours, which is what interviews test.</p>
            <p className="mt-4 text-[12.5px] text-white/60">Streak: <b className="text-white">{streak} day{streak === 1 ? "" : "s"}</b> · Attempts: <b className="text-white">{Object.values(coding.attempts).reduce((a, b) => a + b, 0)}</b></p>
          </div>
          <div className="depth rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[15px] font-semibold text-white">Recently solved</p>
            {solvedList.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-white/50">Solve your first problem to see it here.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {solvedList.slice(0, 6).map((x) => (
                  <li key={x.id}>
                    <Link href={`/code/${x.id}`} onClick={() => setView("problems")} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[13px] hover:bg-white/[0.06]">
                      <span className="truncate text-white/85">{x.num}. {x.title}</span>
                      <span className="shrink-0 text-[11.5px] text-white/45">{coding.solved[x.id].ai}% AI · {LANG_LABEL[coding.solved[x.id].lang]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {view === "problems" && (
        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,1.08fr)]">
          {listPane}

          {/* middle: problem / AI helper / result */}
          <section className="depth flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
            <div className="flex flex-wrap items-center gap-2.5 px-5 pt-4">
              <h2 className="text-[21px] font-bold text-white">{p.num}. {p.title}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", CHIP[p.level])}>{p.level}</span>
              {solved && <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-400"><CheckIcon size={12} /> Solved · {solved.ai}% AI</span>}
              {p.ai && <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[12px] font-semibold text-violet-300">Made for you by AI</span>}
              {p.ai && (
                <button type="button" onClick={() => { removeCustom(p.id); router.push("/code"); }} className="ml-auto text-[12px] text-white/45 hover:text-rose-400">Remove</button>
              )}
              <button type="button" onClick={() => toggleSave(p.id)} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove bookmark" : "Bookmark this problem"} className={cn("text-white/45 hover:text-accent", !p.ai && "ml-auto")}>
                <BookmarkIcon size={18} className={bookmarked ? "fill-current text-accent" : ""} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 px-5 pt-2">
              {p.topics.map((t) => <span key={t} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11.5px] text-white/55">{t}</span>)}
            </div>
            <div role="tablist" className="mt-3 flex gap-1 border-b border-white/[0.07] px-3">
              {(
                [
                  ["desc", "Description"],
                  ["ai", "AI Helper"],
                  ["result", "Submissions"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={cn("-mb-px rounded-t-lg px-3.5 py-2 text-[13px] font-medium transition", tab === k ? "bg-violet-500/15 text-white shadow-[inset_0_-2px_0_var(--color-accent)]" : "text-white/55 hover:text-white")}>
                  {l}
                  {k === "result" && sub && <span className={cn("ml-1.5 inline-block h-2 w-2 rounded-full", sub.counted ? "bg-emerald-400" : "bg-rose-400")} />}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {tab === "desc" && (
              <>
                <p className="text-[14px] leading-relaxed text-white/85">{p.statement}</p>
                {shown.map((t, i) => (
                  <div key={i} className="mt-4">
                    <p className="text-[13px] font-semibold text-white">Example {i + 1}</p>
                    <pre className="mt-1.5 overflow-x-auto rounded-xl border-l-2 border-accent/60 bg-white/[0.04] px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-white/80">
                      <b className="text-white/55">Input: </b>{p.params.map((n, k) => `${n} = ${show(t.args[k], lang)}`).join(", ")}
                      {"\n"}
                      <b className="text-white/55">Output: </b>{show(t.expected, lang)}
                    </pre>
                  </div>
                ))}
                <p className="mt-5 text-[13px] font-semibold text-white">Constraints</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 font-mono text-[12.5px] text-white/65">
                  {p.constraints.map((c) => <li key={c}>{c}</li>)}
                </ul>
                <p className="mt-5 text-[12px] text-white/40">{p.tests.length - p.shown} hidden tests run when you submit.</p>
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

          {/* right: editor + test cases */}
          <section className="flex min-h-[600px] flex-col gap-4 xl:min-h-0">
            <div className="depth flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <select value={lang} onChange={(e) => switchLang(e.target.value as Lang)} aria-label="Language" className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[12.5px] font-medium text-white outline-none">
                  {(["python", "javascript"] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
                </select>
                {lang === "python" && <span className="text-[11.5px] text-white/45">{py === "loading" ? "Loading Python (first time ~10 MB)…" : py === "error" ? "Python couldn’t load — check your internet" : py === "ready" ? "Python ready" : ""}</span>}
                <div className="ml-auto flex items-center gap-2" title={`Lines from the AI helper: ${share.ai}% · pasted: ${share.paste}%`}>
                  <BotIcon size={14} className="text-white/50" />
                  <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10"><span className={cn("block h-full rounded-full transition-all", meterTone)} style={{ width: `${Math.min(100, (share.total / AI_LIMIT) * 100)}%` }} /></span>
                  <b className="text-[11.5px] text-white/80 tabular-nums">AI {share.total}%/{AI_LIMIT}%</b>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetDraft(key);
                    setDraft(fresh(p.starter[lang]));
                    setRun(null);
                    setSub(null);
                  }}
                  className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white"
                  aria-label="Reset code"
                >
                  <RefreshIcon size={13} />
                </button>
              </div>
              <CodeEditor ref={editor} value={draft.code} lang={lang} onChange={onEdit} className="flex-1" label={`${LANG_LABEL[lang]} code for ${p.title}`} />
              <div className="flex justify-end gap-2 border-t border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                <Button size="md" variant="secondary" icon={<PlayIcon size={13} />} loading={busy === "run"} disabled={!!busy} onClick={() => void doRun()}>Run</Button>
                <Button size="md" variant="primary" icon={<SendIcon size={13} />} loading={busy === "submit"} disabled={!!busy} onClick={() => void doSubmit()}>Submit</Button>
              </div>
            </div>

            <div className="depth flex max-h-[42%] min-h-[180px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <p className="px-4 pt-3 text-[13.5px] font-semibold text-white">Test Cases</p>
            <div className="flex items-center gap-1 border-b border-white/[0.07] px-2 pt-1.5">
              {shown.map((_, i) => {
                const c = run?.cases[i];
                return (
                  <button key={i} type="button" onClick={() => setCaseIx(i)} className={cn("-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-1.5 text-[12.5px] transition", caseIx === i ? "border-accent text-white" : "border-transparent text-white/50 hover:text-white")}>
                    {c && <span className={cn("h-2 w-2 rounded-full", c.ok ? "bg-emerald-400" : "bg-rose-400")} />}
                    Case {i + 1}
                  </button>
                );
              })}
              {run && run.status === "ok" && (
                <span className={cn("ml-auto pr-2 text-[12.5px] font-semibold", run.cases.every((c) => c.ok) ? "text-emerald-400" : "text-rose-400")}>
                  {run.cases.every((c) => c.ok) ? "Examples passed" : `${run.cases.filter((c) => c.ok).length}/${run.cases.length} passed`}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              {busy === "run" ? (
                <p className="text-[12.5px] text-white/55">Running…</p>
              ) : run && run.status !== "ok" ? (
                <>
                  <p className="text-[14px] font-semibold text-rose-400">{run.status === "timeout" ? "Time Limit Exceeded" : "Error"}</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-rose-500/10 p-2.5 font-mono text-[12px] whitespace-pre-wrap text-rose-300">{run.error}</pre>
                </>
              ) : current ? (
                <CaseView c={current} names={p.params} lang={lang} compact />
              ) : (
                <div className="space-y-1.5 font-mono text-[12.5px] text-white/70">
                  {p.params.map((n, k) => (
                    <p key={n}><span className="text-white/45">{n} = </span>{show(shown[caseIx]?.args[k], lang)}</p>
                  ))}
                  <p className="pt-1 font-sans text-[11.5px] text-white/40">Press Run to test the examples.</p>
                </div>
              )}
            </div>
          </div>
          </section>
        </div>
      )}
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
