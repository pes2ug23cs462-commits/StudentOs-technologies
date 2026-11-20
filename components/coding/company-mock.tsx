"use client";

/* A timed coding round for one company (/code/company → "Start mock round").
   2 problems from our practice set for that company's level, a clock, Run on the
   examples and Submit on every test. Leaving the tab and pasting are counted and
   shown in the result. It is practice in the company's format, not a past paper. */

import { useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/coding/code-editor";
import { BREACH_TEXT, MAX_WARNINGS, ProctorWarning, STRICT_SHELL, StrictDock, useProctor, type Breach } from "@/components/interview/proctor";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckIcon, ClockIcon, PlayIcon, SendIcon, XIcon } from "@/components/ui/icons";
import { companySet, type CodingCompany } from "@/lib/coding/companies";
import { generateProblem } from "@/lib/coding/personal";
import { PROBLEMS } from "@/lib/coding/problems";
import { runCode, show, warmPython } from "@/lib/coding/runner";
import { LANG_LABEL, LEVEL_TONE, type Lang, type Problem, type RunResult } from "@/lib/coding/types";
import { cn } from "@/lib/utils";

export const MOCK_KEY = "sos.code-company-mock";

export type MockResult = { company: string; at: number; score: number; mins: number; usedSecs: number; tabs: number; pastes: number; ids?: string[]; strict?: boolean; ended?: boolean; breaches?: Breach[]; items: { title: string; level: string; passed: number; total: number }[] };

export function loadMocks(): MockResult[] {
  try {
    const v = JSON.parse(localStorage.getItem(MOCK_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** The round's shape: service companies get an easier pair and 45 minutes, product companies a harder pair and 60. */
export function mockPlan(c: CodingCompany) {
  return c.kind === "Service" ? { mins: 45, levels: ["Easy", "Medium"] as const } : { mins: 60, levels: ["Medium", "Hard"] as const };
}

/** A bank problem at this level, from the company's set, avoiding the ones it used in the last rounds. */
function bankPick(c: CodingCompany, level: Problem["level"], skip: Set<string>): Problem {
  const set = companySet(c).filter((p) => p.level === level);
  const pool = set.filter((p) => !skip.has(p.id));
  const from = pool.length ? pool : set.length ? set : PROBLEMS.filter((p) => p.level === level);
  return from[Math.floor(Math.random() * from.length)];
}

/** Prepares the round: the AI writes both problems in the company's style (checked by running its
    own solution); any it can't write in time comes from our bank instead. Then the round starts. */
export function CompanyMock({ company, strict, onExit, profile, avoid }: { company: CodingCompany; strict: boolean; onExit: () => void; profile: string; avoid: string[] }) {
  const [problems, setProblems] = useState<(Problem & { fromAi?: boolean })[] | null>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let live = true;
    const recent = new Set(loadMocks().filter((m) => m.company === company.id).slice(0, 3).flatMap((m) => m.ids ?? []));
    const used = new Set<string>();
    const one = async (level: Problem["level"]) => {
      try {
        const p = await Promise.race([
          generateProblem({ level, company: company.name, profile, avoid }),
          new Promise<never>((_, no) => setTimeout(() => no(new Error("slow")), 45_000)),
        ]);
        return { ...p, fromAi: true };
      } catch {
        const p = bankPick(company, level, new Set([...recent, ...used]));
        used.add(p.id);
        return p;
      } finally {
        if (live) setStep((n) => n + 1);
      }
    };
    void Promise.all(mockPlan(company).levels.map(one)).then((ps) => live && setProblems(ps));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  if (!problems)
    return (
      <div className={cn(STRICT_SHELL, "flex items-center justify-center p-6")}>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-accent" aria-hidden />
          <p className="mt-4 text-[16px] font-semibold text-white">Preparing your {company.name} round…</p>
          <p className="mt-1 text-[13px] text-white/55">The AI is writing 2 fresh problems in {company.name}’s style and checking them ({step}/2 ready). The clock starts when they’re ready.</p>
          <button type="button" onClick={onExit} className="mt-4 text-[12.5px] text-white/50 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    );
  return <MockRound company={company} strict={strict} onExit={onExit} problems={problems} />;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;

type Out = { kind: "run" | "submit"; res: RunResult; passed: number; total: number };

function MockRound({ company, strict, onExit, problems }: { company: CodingCompany; strict: boolean; onExit: () => void; problems: (Problem & { fromAi?: boolean })[] }) {
  const plan = mockPlan(company);
  const [lang, setLang] = useState<Lang>("python");
  const [at, setAt] = useState(0);
  const [code, setCode] = useState<string[][]>(() => problems.map((p) => [p.starter.python, p.starter.javascript]));
  const [out, setOut] = useState<(Out | null)[]>(() => problems.map(() => null));
  const [best, setBest] = useState<number[]>(() => problems.map(() => 0));
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(plan.mins * 60);
  const [tabs, setTabs] = useState(0);
  const [pastes, setPastes] = useState(0);
  const [warn, setWarn] = useState("");
  const [done, setDone] = useState<MockResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const started = useRef(Date.now());
  const ended = useRef(false);
  const live = useRef({ best: problems.map(() => 0), tabs: 0, pastes: 0 });

  const proctor = useProctor(strict && !done, (log) => finish(log));
  const p = problems[at];
  const li = lang === "python" ? 0 : 1;

  useEffect(() => {
    void warmPython().catch(() => {});
  }, []);

  // the clock
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const l = plan.mins * 60 - Math.floor((Date.now() - started.current) / 1000);
      setLeft(l);
      if (l <= 0) finish();
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // leaving the tab is counted, like a real proctored test
  useEffect(() => {
    if (done || strict) return;
    const off = () => {
      if (document.visibilityState === "hidden") {
        live.current.tabs++;
        setTabs((n) => n + 1);
        setWarn("You left the test tab. In a real test this is flagged.");
      }
    };
    document.addEventListener("visibilitychange", off);
    return () => document.removeEventListener("visibilitychange", off);
  }, [done, strict]);

  const run = async (kind: "run" | "submit") => {
    setBusy(true);
    const tests = kind === "run" ? p.tests.slice(0, p.shown) : p.tests;
    const res = await runCode(lang, code[at][li], p.fn[lang], tests);
    const passed = res.cases.filter((c) => c.ok).length;
    setOut((o) => o.map((x, i) => (i === at ? { kind, res, passed, total: tests.length } : x)));
    if (kind === "submit") {
      live.current.best = live.current.best.map((x, i) => (i === at ? Math.max(x, passed) : x));
      setBest(live.current.best);
    }
    setBusy(false);
  };

  function finish(breaches?: Breach[]) {
    if (ended.current) return;
    ended.current = true;
    if (!breaches) proctor.stop();
    const { best: b, tabs: t, pastes: ps } = live.current;
    const items = problems.map((q, i) => ({ title: q.title, level: q.level, passed: b[i], total: q.tests.length }));
    const score = Math.round((items.reduce((s, x) => s + x.passed / x.total, 0) / items.length) * 100);
    const r: MockResult = { company: company.id, at: Date.now(), score, mins: plan.mins, usedSecs: Math.min(plan.mins * 60, Math.round((Date.now() - started.current) / 1000)), tabs: t, pastes: ps, ids: problems.map((q) => q.id), strict, ...(breaches ? { ended: true, breaches } : {}), items };
    try {
      localStorage.setItem(MOCK_KEY, JSON.stringify([r, ...loadMocks()].slice(0, 20)));
    } catch {}
    setDone(r);
  }

  if (done)
    return (
      <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-[12px] tracking-wider text-white/45 uppercase">{company.name} · mock coding round</p>
        <div className="mt-3 flex items-end gap-4">
          <b className={cn("text-[54px] leading-none", done.score >= 70 ? "text-emerald-400" : done.score >= 40 ? "text-amber-300" : "text-rose-400")}>{done.score}%</b>
          <p className="pb-1.5 text-[13px] text-white/60">
            Time used {fmt(done.usedSecs)} of {done.mins}:00 · {done.strict ? `strict mode · ${done.breaches?.length ?? 0} warnings` : `left the tab ${done.tabs}× · pasted ${done.pastes}×`}
          </p>
        </div>
        {done.ended && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-4 py-3 text-[12.5px] text-rose-100/80">
            <b className="text-white">Strict mode closed this round after {MAX_WARNINGS} warnings.</b> It was saved as it stood.
            <ul className="mt-1.5 list-disc pl-4 text-white/60">
              {done.breaches?.map((b, k) => (
                <li key={k}>{BREACH_TEXT[b]}</li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-5 space-y-2">
          {done.items.map((x) => (
            <li key={x.title} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-[13.5px]">
              <span className="text-white/90">
                {x.title} <span className={cn("ml-1 text-[12px]", LEVEL_TONE[x.level as Problem["level"]])}>{x.level}</span>
              </span>
              <span className={x.passed === x.total ? "text-emerald-400" : "text-white/60"}>
                {x.passed}/{x.total} tests
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-white/45">Only your best Submit for each problem counts. Practice in {company.name}’s format, not a past paper.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={onExit}>
            Back to {company.name}
          </Button>
        </div>
      </div>
    );

  const o = out[at];
  return (
    <div className={cn(STRICT_SHELL, "flex flex-col p-3")}>
    {strict && <StrictDock left={proctor.left} onBreach={proctor.report} />}
    <ProctorWarning warn={proctor.warn} count={proctor.log.length} onResume={proctor.resume} what="test" />
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <p className="text-[13.5px] font-semibold text-white">
          {company.name} · mock coding round{strict && <span className="ml-2 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[11px] text-cyan-300">Strict mode</span>}
        </p>
        <div className="flex gap-1">
          {problems.map((q, i) => (
            <button key={q.id} type="button" onClick={() => setAt(i)} aria-pressed={at === i} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium", at === i ? "bg-white text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]")}>
              Q{i + 1}
              {best[i] === q.tests.length && <CheckIcon size={12} className={at === i ? "text-emerald-600" : "text-emerald-400"} />}
            </button>
          ))}
        </div>
        {!strict && (tabs > 0 || pastes > 0) && (
          <span className="ml-auto text-[11.5px] text-amber-300/80">
            Left tab {tabs}× · pasted {pastes}×
          </span>
        )}
        <span className={cn(!strict && (tabs > 0 || pastes > 0) ? "" : "ml-auto", "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[14px] font-semibold tabular-nums", left <= 300 ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.06] text-white")} aria-live="off">
          <ClockIcon size={14} /> {fmt(left)}
        </span>
        {!confirm ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            End test
          </Button>
        ) : (
          <span className="flex items-center gap-2 text-[12.5px] text-white/70">
            End now?
            <Button size="sm" variant="primary" onClick={() => finish()}>
              Yes, end
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              No
            </Button>
          </span>
        )}
      </div>
      {warn && (
        <div className="flex items-center gap-2 bg-amber-400/15 px-4 py-2 text-[12.5px] text-amber-200">
          <AlertCircleIcon size={14} /> {warn}
          <button type="button" aria-label="Close" onClick={() => setWarn("")} className="ml-auto">
            <XIcon size={13} />
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* problem */}
        <div className="min-h-0 overflow-auto border-white/10 p-6 lg:border-r">
          <p className="text-[21px] font-semibold text-white">
            Q{at + 1}. {p.title} <span className={cn("ml-1 text-[12.5px]", LEVEL_TONE[p.level])}>{p.level}</span>
            {problems[at].fromAi && <span className="ml-2 rounded bg-violet-500/20 px-1.5 py-0.5 align-middle text-[11px] font-medium text-violet-300">New · in {company.name}’s style</span>}
          </p>
          <p className="mt-3 text-[15.5px] leading-relaxed whitespace-pre-wrap text-white/85">{p.statement}</p>
          {p.tests.slice(0, p.shown).map((t, i) => (
            <div key={i} className="mt-3 rounded-lg bg-white/[0.04] px-4 py-3 font-mono text-[13.5px] text-white/80">
              <p>
                <span className="text-white/40">Input: </span>
                {p.params.map((n, j) => `${n} = ${show(t.args[j], lang)}`).join(", ")}
              </p>
              <p>
                <span className="text-white/40">Output: </span>
                {show(t.expected, lang)}
              </p>
            </div>
          ))}
          {p.constraints.length > 0 && (
            <ul className="mt-4 list-disc space-y-0.5 pl-5 text-[13px] text-white/55">
              {p.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        {/* editor */}
        <div className="flex min-h-[60vh] flex-col lg:min-h-0">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language" className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12.5px] text-white [&>option]:bg-[#1a1a1f]">
              {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
                <option key={l} value={l}>
                  {LANG_LABEL[l]}
                </option>
              ))}
            </select>
            <span className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" loading={busy} onClick={() => void run("run")}>
                <PlayIcon size={12} /> Run
              </Button>
              <Button size="sm" variant="primary" loading={busy} onClick={() => void run("submit")}>
                <SendIcon size={12} /> Submit
              </Button>
            </span>
          </div>
          <CodeEditor
            value={code[at][li]}
            lang={lang}
            onChange={(v, kind) => {
              if (kind === "paste" && !strict) {
                live.current.pastes++;
                setPastes((n) => n + 1);
              }
              setCode((c) => c.map((x, i) => (i === at ? (li === 0 ? [v, x[1]] : [x[0], v]) : x)));
            }}
            className="min-h-[300px] flex-1 text-[15px]"
            label={`${LANG_LABEL[lang]} code for ${p.title}`}
          />
          <div className={cn("h-[140px] shrink-0 overflow-auto border-t border-white/10 px-4 py-3 text-[13px]", strict && "pr-[240px]")}>
            {!o && <p className="text-white/40">Run checks the examples. Submit checks every hidden test; your best Submit counts.</p>}
            {o && o.res.status !== "ok" && <p className="whitespace-pre-wrap break-words text-rose-300">{o.res.error || (o.res.status === "timeout" ? "Too slow: your code took too long." : "Your code has an error.")}</p>}
            {o && o.res.status === "ok" && (
              <>
                <p className={o.passed === o.total ? "font-semibold text-emerald-400" : "font-semibold text-amber-300"}>
                  {o.kind === "run" ? "Examples" : "All tests"}: {o.passed}/{o.total} passed
                </p>
                {(() => {
                  const f = o.res.cases.find((c) => !c.ok);
                  if (!f || o.kind === "submit") return null;
                  return <p className="mt-1 font-mono text-white/60">{f.error ? f.error : `Expected ${show(f.expected, lang)}, got ${show(f.got, lang)}`}</p>;
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
