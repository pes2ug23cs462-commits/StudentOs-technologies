"use client";

/* A company's online test, taken on StudentOS in strict mode: full screen, no other
   tabs, camera (look-away, leaving, a second person) and mic (talking) checks.
   Three warnings, then the fourth submits the test as it stands. Questions come from
   the server without answers; the server scores it and only the company sees the score. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckIcon, ClockIcon, ShieldIcon } from "@/components/ui/icons";
import { enterFullscreen, MAX_WARNINGS, ProctorWarning, STRICT_SHELL, StrictDock, useProctor, type Breach } from "@/components/interview/proctor";
import { partnerApi, partnerErrorText, type StudentTestInfo } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CodeEditor } from "@/components/coding/code-editor";
import { runCode, show } from "@/lib/coding/runner";
import { LANG_LABEL, type Lang, type Level, type RunResult } from "@/lib/coding/types";

type Q = { q: string; options: string[] };
type CodeQ = { id: string; title: string; level: Level; statement: string; constraints: string[]; params: string[]; fn: Record<Lang, string>; starter: Record<Lang, string>; examples: { args: unknown[]; expected: unknown }[]; inputs: unknown[][] };
type Run = { questions: Q[]; coding: CodeQ[]; endsAt: number; skew: number };
type CodeWork = { lang: Lang; code: string };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function CompanyTestRun({ cid, pid }: { cid: string; pid: string }) {
  const { actions } = useStore();
  const [info, setInfo] = useState<StudentTestInfo | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [work, setWork] = useState<Record<string, CodeWork>>({});
  const [ran, setRan] = useState<Record<string, RunResult | "running">>({});
  const [at, setAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { ended: boolean; warnings: Breach[] }>(null);
  const [err, setErr] = useState("");
  const store = `studentos:test:${cid}:${pid}`;
  const sent = useRef(false);

  useEffect(() => {
    partnerApi<StudentTestInfo>("student-test-info", { cid, pid })
      .then((r) => {
        setInfo(r);
        if (r.attempt?.done) setDone({ ended: false, warnings: [] });
      })
      .catch((e) => setErr(partnerErrorText(e)));
  }, [cid, pid]);

  const submit = useCallback(
    async (warnings: Breach[], ended: boolean) => {
      if (sent.current || !run) return;
      sent.current = true;
      setBusy(true);
      try {
        // each coding answer runs here on every test input; the server checks the outputs
        const code = [];
        for (const c of run.coding) {
          const w = work[c.id] ?? { lang: "python" as Lang, code: c.starter.python };
          const r = await runCode(w.lang, w.code, c.fn[w.lang], c.inputs.map((args) => ({ args, expected: null })));
          code.push({ id: c.id, lang: w.lang, code: w.code, outputs: r.status === "ok" ? r.cases.map((x) => (x.error ? null : (x.got ?? null))) : [] });
        }
        await partnerApi("student-test-submit", { cid, pid, answers: picks, code, warnings, ended });
        try {
          localStorage.removeItem(store);
          localStorage.removeItem(store + ":code");
        } catch {}
        setDone({ ended, warnings });
        setRun(null);
      } catch (e) {
        sent.current = false;
        actions.toast(partnerErrorText(e));
      } finally {
        setBusy(false);
      }
    },
    [run, picks, work, cid, pid, store, actions],
  );
  const submitRef = useRef(submit);
  submitRef.current = submit;
  // the fourth warning submits the test as it stands
  const proctor = useProctor(!!run && !done, (log) => void submitRef.current(log, true));

  // the clock: the server's end time, corrected for this device's clock
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [run]);
  const left = run ? run.endsAt - (now + run.skew) : 0;
  useEffect(() => {
    if (run && left <= 0) {
      proctor.stop();
      void submitRef.current(proctor.log, false);
    }
  }, [run, left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    // full screen needs the click itself
    enterFullscreen();
    setBusy(true);
    try {
      const r = await partnerApi<{ questions: Q[]; coding?: CodeQ[]; endsAt: number; now: number }>("student-test-start", { cid, pid });
      let saved: number[] = [];
      let savedCode: Record<string, CodeWork> = {};
      try {
        saved = JSON.parse(localStorage.getItem(store) || "[]");
        savedCode = JSON.parse(localStorage.getItem(store + ":code") || "{}");
      } catch {}
      const coding = r.coding ?? [];
      setPicks(r.questions.map((_, i) => (Number.isInteger(saved[i]) ? saved[i] : -1)));
      setWork(Object.fromEntries(coding.map((c) => [c.id, savedCode[c.id] ?? { lang: "python" as Lang, code: c.starter.python }])));
      setRun({ questions: r.questions, coding, endsAt: r.endsAt, skew: r.now - Date.now() });
      setAt(0);
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const setCode = (id: string, w: CodeWork) => {
    const next = { ...work, [id]: w };
    setWork(next);
    try {
      localStorage.setItem(store + ":code", JSON.stringify(next));
    } catch {}
  };
  const tryExamples = async (c: CodeQ) => {
    const w = work[c.id];
    setRan((x) => ({ ...x, [c.id]: "running" }));
    const r = await runCode(w.lang, w.code, c.fn[w.lang], c.examples);
    setRan((x) => ({ ...x, [c.id]: r }));
  };
  const pick = (k: number) => {
    const next = picks.map((p, i) => (i === at ? k : p));
    setPicks(next);
    try {
      localStorage.setItem(store, JSON.stringify(next));
    } catch {}
  };

  if (err) return <p className="mt-16 text-center text-[14px] text-rose-300">{err}</p>;
  if (!info) return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;

  if (done)
    return (
      <div className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-8 text-center">
        <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", done.ended ? "bg-rose-500/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300")}>
          {done.ended ? <AlertCircleIcon size={24} /> : <CheckIcon size={24} />}
        </span>
        <h1 className="mt-4 text-[22px] font-semibold text-white">{done.ended ? "Test ended" : "Test submitted"}</h1>
        <p className="mt-2 text-[13.5px] text-white/60">
          {done.ended ? `The test closed after ${MAX_WARNINGS} warnings and was submitted as it stood.` : "Your answers are in."} {info.test?.company ?? "The company"} sees your score and tells you about the next round here.
        </p>
        <Link href="/placement?tab=drives" className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-black">Back to my applications</Link>
      </div>
    );

  if (!info.test)
    return (
      <div className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-8 text-center">
        <p className="text-[15px] font-semibold text-white">No test for you right now</p>
        <p className="mt-2 text-[13px] text-white/55">The test opens for students the company moves to its test round.</p>
        <Link href="/placement?tab=drives" className="mt-5 inline-block text-[13px] text-accent hover:underline">Back to my applications</Link>
      </div>
    );

  if (!run) {
    const resuming = !!info.attempt && !info.attempt.done;
    return (
      <div className="mx-auto mt-6 max-w-[620px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-7">
        <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">{info.test.company} · {info.test.role}</p>
        <h1 className="mt-1 text-[24px] font-semibold text-white">{info.test.title}</h1>
        <p className="mt-1 text-[13.5px] text-white/60">{[info.test.count ? `${info.test.count} questions` : "", info.test.coding ? `${info.test.coding} coding problem${info.test.coding === 1 ? "" : "s"} (Python or JavaScript)` : ""].filter(Boolean).join(" + ")} · {info.test.minutes} minutes · one attempt</p>
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-100"><ShieldIcon size={15} /> Strict mode</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/70">
            <li>The test runs full screen. Leaving it or switching tabs is a warning.</li>
            <li>Your camera and mic stay on: look at the screen, stay in view, no one else in the room, and stay silent.</li>
            <li>After {MAX_WARNINGS} warnings, the next one submits the test as it is.</li>
            <li>The clock keeps running once you start, even if you close the page.</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-white/45">Camera and mic are checked on this device only. Nothing is recorded or uploaded.</p>
        </div>
        {!info.open && !resuming ? (
          <p className="mt-5 rounded-lg bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/65">Not open yet. {info.test.company} opens it at the test time. Come back here then.</p>
        ) : (
          <Button variant="primary" className="mt-5 w-full" loading={busy} onClick={() => void start()}>{resuming ? "Continue the test" : "Start the test"}</Button>
        )}
      </div>
    );
  }

  const nQ = run.questions.length;
  const total = nQ + run.coding.length;
  const q = at < nQ ? run.questions[at] : null;
  const cq = at >= nQ ? run.coding[at - nQ] : null;
  const answered = picks.filter((p) => p >= 0).length;
  const res = cq ? ran[cq.id] : undefined;
  return (
    <div className={cn(STRICT_SHELL, "px-5 py-5 lg:px-8")}>
      <div className={cn("mx-auto pr-0 lg:pr-[230px]", cq ? "max-w-[1180px]" : "max-w-[920px]")}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-white/50">{info.test.company} · {info.test.title}</p>
            <p className="text-[13px] text-white/70">{nQ ? `${answered} of ${nQ} answered` : ""}{nQ && run.coding.length ? " · " : ""}{run.coding.length ? `${run.coding.length} coding` : ""}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[15px] font-semibold tabular-nums", left < 60_000 ? "border-rose-400/40 text-rose-300" : "border-white/15 text-white")}>
            <ClockIcon size={14} /> {mmss(left)}
          </span>
          <Button variant="primary" size="sm" loading={busy} onClick={() => window.confirm(`Submit now?${nQ - answered ? ` ${nQ - answered} unanswered.` : ""}`) && (proctor.stop(), void submit(proctor.log, false))}>Submit</Button>
        </div>

        {q && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-6">
            <p className="text-[12px] font-semibold text-white/45">Question {at + 1} of {nQ}</p>
            <p className="mt-2 text-[16px] leading-relaxed whitespace-pre-wrap text-white">{q.q}</p>
            <div role="radiogroup" className="mt-5 space-y-2">
              {q.options.map((o, k) => (
                <button key={k} type="button" role="radio" aria-checked={picks[at] === k} onClick={() => pick(k)} className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition", picks[at] === k ? "border-accent/70 bg-accent/10 text-white" : "border-white/10 text-white/80 hover:border-white/25")}>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-semibold", picks[at] === k ? "border-accent bg-accent text-black" : "border-white/25 text-white/60")}>{String.fromCharCode(65 + k)}</span>
                  {o}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <Button size="sm" variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>← Previous</Button>
              <Button size="sm" disabled={at === total - 1} onClick={() => setAt(at + 1)}>Next →</Button>
            </div>
          </div>
        )}

        {cq && work[cq.id] && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
              <p className="text-[12px] font-semibold text-white/45">Coding {at - nQ + 1} of {run.coding.length} · {cq.level}</p>
              <p className="mt-1 text-[17px] font-semibold text-white">{cq.title}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white/80">{cq.statement}</p>
              {cq.constraints.length > 0 && <ul className="mt-3 list-disc pl-5 text-[12.5px] text-white/55">{cq.constraints.map((c) => <li key={c}>{c}</li>)}</ul>}
              <p className="mt-4 text-[12px] font-semibold text-white/45">Examples</p>
              <div className="mt-1.5 space-y-1.5">
                {cq.examples.map((e, i) => (
                  <pre key={i} className="overflow-x-auto rounded-lg bg-black/40 p-2.5 text-[12px] text-white/75">{cq.params.map((p, k) => `${p} = ${show(e.args[k], work[cq.id].lang)}`).join(", ")}{"\n"}→ {show(e.expected, work[cq.id].lang)}</pre>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-white/40">Your code is also checked on hidden tests when you submit.</p>
            </div>
            <div className="flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4">
              <div className="flex items-center gap-2">
                <select
                  value={work[cq.id].lang}
                  onChange={(e) => {
                    const lang = e.target.value as Lang;
                    const cur = work[cq.id];
                    // switching language starts from that language's starter unless they already typed there
                    setCode(cq.id, { lang, code: cur.code === cq.starter[cur.lang] ? cq.starter[lang] : cur.code });
                  }}
                  aria-label="Language"
                  className="h-8 rounded-lg border border-white/10 bg-field px-2 text-[12.5px] text-white"
                >
                  {(["python", "javascript"] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
                </select>
                <span className="flex-1" />
                <Button size="sm" loading={res === "running"} onClick={() => void tryExamples(cq)}>Run examples</Button>
              </div>
              <CodeEditor value={work[cq.id].code} lang={work[cq.id].lang} onChange={(v) => setCode(cq.id, { ...work[cq.id], code: v })} className="mt-3 min-h-[300px] flex-1" label={`Code for ${cq.title}`} />
              {res && res !== "running" && (
                <div className="mt-3 rounded-lg bg-black/35 p-2.5 text-[12px]">
                  {res.status !== "ok" ? (
                    <p className="text-rose-300">{res.error}</p>
                  ) : (
                    <p className={res.cases.every((c) => c.ok) ? "text-emerald-300" : "text-amber-200"}>
                      {res.cases.filter((c) => c.ok).length}/{res.cases.length} examples pass{res.cases.find((c) => !c.ok) ? ` · first miss: got ${show(res.cases.find((c) => !c.ok)!.got, work[cq.id].lang)}${res.cases.find((c) => !c.ok)!.error ? ` (${res.cases.find((c) => !c.ok)!.error})` : ""}` : ""}
                    </p>
                  )}
                </div>
              )}
              <div className="mt-3 flex justify-between">
                <Button size="sm" variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>← Previous</Button>
                <Button size="sm" disabled={at === total - 1} onClick={() => setAt(at + 1)}>Next →</Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {run.questions.map((_, i) => (
            <button key={i} type="button" onClick={() => setAt(i)} aria-label={`Question ${i + 1}`} className={cn("h-8 w-8 rounded-lg border text-[12px] font-medium tabular-nums", i === at ? "border-accent text-white" : picks[i] >= 0 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-white/50")}>{i + 1}</button>
          ))}
          {run.coding.map((c, k) => (
            <button key={c.id} type="button" onClick={() => setAt(nQ + k)} className={cn("h-8 rounded-lg border px-2.5 text-[12px] font-medium", at === nQ + k ? "border-accent text-white" : "border-cyan-400/30 bg-cyan-400/[0.06] text-cyan-100")}>{"</>"} {k + 1}</button>
          ))}
        </div>
      </div>
      <StrictDock left={proctor.left} onBreach={proctor.report} />
      <ProctorWarning warn={proctor.warn} count={proctor.log.length} onResume={proctor.resume} what="test" />
    </div>
  );
}
