"use client";

/* Aptitude practice: one topic at a time with instant answers, or a timed
   30-question mock in the usual company-test mix. Results stay in the
   student's profile and feed their placement readiness. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, FlagIcon, PlayIcon, ShieldIcon, XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { BREACH_TEXT, enterFullscreen, MAX_WARNINGS, ProctorWarning, STRICT_SHELL, StrictDock, useProctor, type Breach } from "@/components/interview/proctor";
import {
  MOCK_MINUTES,
  SECTION_LABEL,
  TOPIC,
  TOPICS,
  mockSet,
  topicSet,
  topicStats,
  type AptitudeAttempt,
  type Question,
  type Section,
  type TopicId,
} from "@/lib/aptitude";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

type Run = { kind: "topic" | "mock"; topic?: TopicId; qs: Question[]; picks: (number | null)[]; flags: boolean[]; start: number };
const SECTIONS: Section[] = ["quant", "logical", "verbal"];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const tone = (p: number) => (p >= 75 ? "text-emerald-300" : p >= 50 ? "text-amber-200" : "text-rose-300");

export function Aptitude({ startTopic, startMock, focus = [], focusFor }: { startTopic?: TopicId | null; startMock?: boolean; focus?: TopicId[]; focusFor?: string }) {
  const { state, actions } = useStore();
  const attempts = state.aptitude?.attempts ?? [];
  const stats = useMemo(() => topicStats(state.aptitude), [state.aptitude]);
  const [run, setRun] = useState<Run | null>(null);
  const [done, setDone] = useState<{ run: Run; attempt: AptitudeAttempt; breaches?: Breach[] } | null>(null);
  const [strict, setStrict] = useState(true);
  const runRef = useRef(run);
  runRef.current = run;
  const strictOn = strict && run?.kind === "mock";
  // 3 warnings, then the mock closes and is saved as it stands
  const proctor = useProctor(strictOn, (log) => runRef.current && finish(runRef.current, log));

  const begin = (kind: "topic" | "mock", topic?: TopicId) => {
    // full screen needs the click itself
    if (kind === "mock" && strict) enterFullscreen();
    const qs = kind === "mock" ? mockSet(focus) : topicSet(topic!, 10);
    setDone(null);
    setRun({ kind, topic, qs, picks: qs.map(() => null), flags: qs.map(() => false), start: Date.now() });
    window.scrollTo(0, 0);
  };
  // deep links from the plan and company cards
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // a mock waits for a click (full screen needs one); a topic starts straight away
    if (startMock) document.getElementById("apt-mock")?.scrollIntoView({ block: "center" });
    else if (startTopic && TOPIC[startTopic]) begin("topic", startTopic);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (r: Run, breaches?: Breach[]) => {
    if (!breaches) proctor.stop();
    const byTopic: AptitudeAttempt["byTopic"] = {};
    r.qs.forEach((q, k) => {
      const v = (byTopic[q.topic] ??= [0, 0]);
      v[1]++;
      if (r.picks[k] === q.answer) v[0]++;
    });
    const attempt: AptitudeAttempt = {
      id: uid("apt"),
      at: Date.now(),
      kind: r.kind,
      ...(r.topic ? { topic: r.topic } : {}),
      total: r.qs.length,
      correct: r.qs.filter((q, k) => r.picks[k] === q.answer).length,
      secs: Math.round((Date.now() - r.start) / 1000),
      byTopic,
      ...(breaches ? { ended: true } : {}),
    };
    actions.patch({ aptitude: { attempts: [attempt, ...attempts].slice(0, 60) } });
    setRun(null);
    setDone({ run: r, attempt, breaches });
    window.scrollTo(0, 0);
  };

  if (run && run.kind === "mock")
    return (
      <div className={cn(strictOn && `${STRICT_SHELL} px-6 py-6 lg:px-8`)}>
        <Mock run={run} setRun={(r) => { if (!r) proctor.stop(); setRun(r); }} onFinish={(r) => finish(r)} />
        {strictOn && <StrictDock left={proctor.left} onBreach={proctor.report} />}
        <ProctorWarning warn={proctor.warn} count={proctor.log.length} onResume={proctor.resume} what="test" />
      </div>
    );
  if (run) return <Practice run={run} setRun={setRun} onFinish={(r) => finish(r)} />;
  if (done) return <Result {...done} onAgain={() => begin(done.run.kind, done.run.topic)} onBack={() => setDone(null)} />;

  return (
    <div className="space-y-5">
      <Card id="apt-mock" className="flex flex-wrap items-center gap-5 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-300"><ClockIcon size={22} /></span>
        <div className="min-w-[220px] flex-1">
          <p className="text-[15px] font-semibold text-white">{focusFor ? `Aptitude mock for ${focusFor}` : "Full aptitude mock"}</p>
          <p className="mt-0.5 text-[13px] text-white/55">30 questions in {MOCK_MINUTES} minutes: 12 quantitative, 10 logical, 8 verbal.{focus.length ? ` More questions on what ${focusFor ?? "this company"} asked your seniors: ${focus.map((t) => TOPIC[t]?.name).filter(Boolean).join(", ")}.` : " The mix most service-company tests use."}</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/70" title={`Full screen, no other tabs, camera on. ${MAX_WARNINGS} warnings, then the mock closes.`}>
            <ShieldIcon size={14} className="text-white/45" /> Strict mode
            <button type="button" role="switch" aria-checked={strict} aria-label="Strict mode" onClick={() => setStrict(!strict)} className={cn("relative h-5 w-9 rounded-full transition", strict ? "bg-cyan-400" : "bg-white/15")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", strict ? "left-[18px]" : "left-0.5")} />
            </button>
          </label>
          <Button variant="primary" onClick={() => begin("mock")}><PlayIcon size={13} /> Start mock</Button>
        </div>
        {strict && <p className="w-full text-[12px] text-white/45">Strict mode: full screen until you finish, no other tabs, no copy or paste. The camera checks you look at the screen and are alone, and the mic checks for talking. {MAX_WARNINGS} warnings, then the mock closes and can’t be reopened. Camera and mic stay on your device; nothing is recorded.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Card key={s} className="p-5">
            <p className="text-[14px] font-semibold text-white">{SECTION_LABEL[s]}</p>
            <ul className="mt-3 space-y-1">
              {TOPICS.filter((t) => t.section === s).map((t) => {
                const st = stats[t.id];
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => begin("topic", t.id)} className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.04]">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-white/80 group-hover:text-white">{t.name}</span>
                      {st ? <span className={cn("text-[12px] font-semibold tabular-nums", tone(st.pct))}>{st.pct}%</span> : <span className="text-[11.5px] text-white/30">new</span>}
                      <ArrowRightIcon size={13} className="text-white/25 group-hover:text-accent" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-[14px] font-semibold text-white">Recent practice</p>
        {attempts.length ? (
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {attempts.slice(0, 6).map((a) => {
              const pct = Math.round((a.correct / a.total) * 100);
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-white/80">{a.kind === "mock" ? "Full mock" : TOPIC[a.topic!]?.name ?? "Practice"}{a.ended && <span className="ml-2 rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-300">closed by strict mode</span>}</span>
                  <span className="text-white/40">{new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  <span className="w-14 text-right text-white/55 tabular-nums">{a.correct}/{a.total}</span>
                  <span className={cn("w-11 text-right font-semibold tabular-nums", tone(pct))}>{pct}%</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-white/45">Your scores show up here. Start with a topic you find hard.</p>
        )}
      </Card>
      <p className="text-[11.5px] text-white/40">All questions are StudentOS practice questions, not any company’s previous papers. Number questions change every time.</p>
    </div>
  );
}

/* ---------- one topic: answer, see why, next ---------- */

function Practice({ run, setRun, onFinish }: { run: Run; setRun: (r: Run | null) => void; onFinish: (r: Run) => void }) {
  const [i, setI] = useState(0);
  const q = run.qs[i];
  const pick = run.picks[i];
  const answered = pick !== null;
  const right = run.picks.filter((p, k) => p === run.qs[k].answer).length;
  const choose = (k: number) => {
    if (answered) return;
    setRun({ ...run, picks: run.picks.map((p, j) => (j === i ? k : p)) });
  };
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => window.confirm("Leave this practice? It won’t be saved.") && setRun(null)} className="flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white"><ArrowLeftIcon size={14} /> Back</button>
        <p className="text-[13px] text-white/55">{TOPIC[run.topic!].name} · {i + 1} of {run.qs.length} · <span className="text-emerald-300">{right} right</span></p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${((i + (answered ? 1 : 0)) / run.qs.length) * 100}%` }} /></div>
      <QuestionCard q={q} pick={pick} reveal={answered} onPick={choose} />
      {answered && (
        <div className={cn("mt-4 rounded-xl border p-4 text-[13.5px] leading-relaxed", pick === q.answer ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-rose-400/25 bg-rose-500/[0.06]")}>
          <p className={cn("font-semibold", pick === q.answer ? "text-emerald-300" : "text-rose-300")}>{pick === q.answer ? "Correct" : `Answer: ${q.options[q.answer]}`}</p>
          <p className="mt-1 text-white/75">{q.explain}</p>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button variant="primary" disabled={!answered} onClick={() => (i < run.qs.length - 1 ? setI(i + 1) : onFinish(run))}>
          {i < run.qs.length - 1 ? "Next question" : "See my score"} <ArrowRightIcon size={14} />
        </Button>
      </div>
    </div>
  );
}

/* ---------- full mock: timer, palette, submit ---------- */

function Mock({ run, setRun, onFinish }: { run: Run; setRun: (r: Run | null) => void; onFinish: (r: Run) => void }) {
  const [i, setI] = useState(0);
  const [now, setNow] = useState(Date.now());
  const left = Math.round(MOCK_MINUTES * 60 - (now - run.start) / 1000);
  const ref = useRef(run);
  ref.current = run;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onFinish(ref.current);
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = run.qs[i];
  const answeredN = run.picks.filter((p) => p !== null).length;
  const set = (patch: Partial<Run>) => setRun({ ...run, ...patch });
  const sectionOf = (k: number) => TOPIC[run.qs[k].topic].section;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-white/55">{SECTION_LABEL[sectionOf(i)]} · Question {i + 1} of {run.qs.length}</p>
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-semibold tabular-nums", left < 120 ? "border-rose-400/40 text-rose-300" : "border-white/10 text-white")}><ClockIcon size={13} /> {mmss(left)}</span>
        </div>
        <QuestionCard q={q} pick={run.picks[i]} reveal={false} onPick={(k) => set({ picks: run.picks.map((p, j) => (j === i ? k : p)) })} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeftIcon size={14} /> Previous</Button>
            <Button variant="ghost" onClick={() => set({ flags: run.flags.map((f, j) => (j === i ? !f : f)) })}><FlagIcon size={13} /> {run.flags[i] ? "Unmark" : "Mark for review"}</Button>
          </div>
          {i < run.qs.length - 1 ? (
            <Button variant="primary" onClick={() => setI(i + 1)}>Save & next <ArrowRightIcon size={14} /></Button>
          ) : (
            <Button variant="primary" onClick={() => window.confirm(`Submit the mock? ${run.qs.length - answeredN} question${run.qs.length - answeredN === 1 ? "" : "s"} unanswered.`) && onFinish(run)}>Submit</Button>
          )}
        </div>
      </div>
      <Card className="h-fit p-4">
        <p className="text-[13px] font-semibold text-white">{answeredN} of {run.qs.length} answered</p>
        {SECTIONS.map((s) => (
          <div key={s} className="mt-3">
            <p className="text-[11.5px] text-white/45">{SECTION_LABEL[s]}</p>
            <div className="mt-1.5 grid grid-cols-6 gap-1.5">
              {run.qs.map((_, k) =>
                sectionOf(k) !== s ? null : (
                  <button key={k} type="button" onClick={() => setI(k)} aria-label={`Question ${k + 1}`} className={cn("relative h-8 rounded-md text-[12px] font-medium tabular-nums transition", k === i ? "bg-accent text-[#120826]" : run.picks[k] !== null ? "bg-emerald-400/15 text-emerald-200" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.09]")}>
                    {k + 1}
                    {run.flags[k] && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-300" />}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => window.confirm(`Submit the mock? ${run.qs.length - answeredN} unanswered.`) && onFinish(run)} className="mt-4 h-9 w-full rounded-lg border border-white/12 text-[13px] font-medium text-white/80 hover:border-white/25 hover:text-white">Submit now</button>
        <button type="button" onClick={() => window.confirm("Quit the mock? It won’t be saved.") && setRun(null)} className="mt-2 w-full text-[12px] text-white/40 hover:text-white/70">Quit without saving</button>
      </Card>
    </div>
  );
}

function QuestionCard({ q, pick, reveal, onPick }: { q: Question; pick: number | null; reveal: boolean; onPick: (k: number) => void }) {
  return (
    <Card className="mt-4 p-5 sm:p-6">
      <p className="text-[11.5px] font-medium text-accent">{TOPIC[q.topic].name}</p>
      <p className="mt-2 text-[16.5px] leading-relaxed font-medium text-white">{q.q}</p>
      <div role="radiogroup" aria-label="Options" className="mt-5 grid gap-2.5">
        {q.options.map((o, k) => {
          const isPick = pick === k;
          const good = reveal && k === q.answer;
          const bad = reveal && isPick && k !== q.answer;
          return (
            <button key={k} type="button" role="radio" aria-checked={isPick} onClick={() => onPick(k)} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition", good ? "border-emerald-400/50 bg-emerald-400/10 text-white" : bad ? "border-rose-400/50 bg-rose-500/10 text-white" : isPick ? "border-accent bg-accent/10 text-white" : "border-white/10 text-white/80 hover:border-white/25 hover:text-white")}>
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold", good ? "bg-emerald-400 text-[#06140c]" : bad ? "bg-rose-400 text-[#1a0508]" : isPick ? "bg-accent text-[#120826]" : "bg-white/[0.07] text-white/60")}>
                {good ? <CheckIcon size={12} /> : bad ? <XIcon size={12} /> : "ABCD"[k]}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- result with review ---------- */

function Result({ run, attempt, breaches, onAgain, onBack }: { run: Run; attempt: AptitudeAttempt; breaches?: Breach[]; onAgain: () => void; onBack: () => void }) {
  const pct = Math.round((attempt.correct / attempt.total) * 100);
  const [show, setShow] = useState<"wrong" | "all">("wrong");
  const list = run.qs.map((q, k) => ({ q, k, pick: run.picks[k] })).filter((x) => show === "all" || x.pick !== x.q.answer);
  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      {breaches && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-4">
          <AlertCircleIcon size={18} className="mt-0.5 shrink-0 text-rose-300" />
          <div className="text-[13px] leading-relaxed text-white/75">
            <p><b className="text-white">Strict mode closed this mock after {MAX_WARNINGS} warnings.</b> It was saved as it stood and can’t be reopened.</p>
            <ul className="mt-1.5 list-disc pl-4 text-white/60">{breaches.map((b, k) => <li key={k}>{BREACH_TEXT[b]}</li>)}</ul>
          </div>
        </div>
      )}
      <Card className="p-6 text-center">
        <p className="text-[13px] text-white/55">{run.kind === "mock" ? "Full mock" : TOPIC[run.topic!].name}</p>
        <p className={cn("mt-2 text-[44px] font-semibold tabular-nums", tone(pct))}>{pct}%</p>
        <p className="text-[13.5px] text-white/65">{attempt.correct} of {attempt.total} right · {mmss(attempt.secs)} taken</p>
        {run.kind === "mock" && (
          <div className="mx-auto mt-5 grid max-w-[460px] grid-cols-3 gap-2">
            {SECTIONS.map((s) => {
              const ks = run.qs.map((q, k) => k).filter((k) => TOPIC[run.qs[k].topic].section === s);
              const r = ks.filter((k) => run.picks[k] === run.qs[k].answer).length;
              const p = Math.round((r / Math.max(1, ks.length)) * 100);
              return (
                <div key={s} className="rounded-xl border border-white/[0.07] p-3">
                  <p className="text-[11.5px] text-white/45">{SECTION_LABEL[s]}</p>
                  <p className={cn("mt-1 text-[18px] font-semibold tabular-nums", tone(p))}>{r}/{ks.length}</p>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="ghost" onClick={onBack}>All topics</Button>
          <Button variant="primary" onClick={onAgain}>{run.kind === "mock" ? "Take another mock" : "Practise again"}</Button>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-white">Review</p>
        <div className="inline-flex rounded-lg border border-white/10 p-0.5">
          {(["wrong", "all"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setShow(v)} className={cn("h-7 rounded-md px-3 text-[12.5px]", show === v ? "bg-[var(--color-plum)] text-white" : "text-white/55")}>{v === "wrong" ? "Mistakes" : "All"}</button>
          ))}
        </div>
      </div>
      {list.length ? (
        list.map(({ q, k, pick }) => (
          <Card key={q.id} className="p-5">
            <p className="text-[11.5px] text-white/45">Q{k + 1} · {TOPIC[q.topic].name}</p>
            <p className="mt-1.5 text-[14.5px] text-white">{q.q}</p>
            <p className="mt-2 text-[13px]"><span className="text-emerald-300">Answer: {q.options[q.answer]}</span>{pick !== q.answer && <span className="ml-3 text-rose-300">{pick === null ? "Not answered" : `You chose: ${q.options[pick]}`}</span>}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{q.explain}</p>
          </Card>
        ))
      ) : (
        <p className="text-[13px] text-white/50">No mistakes. Try a harder topic or a full mock.</p>
      )}
    </div>
  );
}
