"use client";

/* Premium · AI mock tests (/tests).
   setup → the AI writes a timed MCQ test for the subject → the student answers with
   a question palette, mark-for-review and a countdown → result with topic-wise
   accuracy and explanations → saved, and every test feeds the analytics. */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PracticeHeader, type PracticeTab } from "@/components/practice/practice-header";
import { PageHeader } from "@/components/free/parts";
import { PremiumBadge, PremiumGate } from "@/components/premium/premium-gate";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, BarChartIcon, BookIcon, BulbIcon, CheckIcon, ClockIcon, CompassIcon, FileIcon, FlagIcon, GridIcon, LayersIcon, OpenBookIcon, PlayIcon, PlusIcon, RefreshIcon, TargetIcon, TrophyIcon, XIcon } from "@/components/ui/icons";
import { Card, Label } from "@/components/ui/primitives";
import { AssistantError } from "@/lib/assistant";
import { usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";
import { GENERAL_SUBJECTS, KEEP_REVIEW, LEVEL_LABEL, MAX_TESTS, SECONDS_PER_Q, addTest, makeTest, pct, practiceTime, subjectTopics, suggestSubjects, testAnalytics, testsFor, type TestLevel, type TestQuestion, type TestRecord } from "@/lib/tests";
import { cn, uid } from "@/lib/utils";

type Phase = "setup" | "preparing" | "live" | "result";
const LETTERS = ["A", "B", "C", "D"];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const tone = (v: number) => (v >= 75 ? "text-emerald-400" : v >= 50 ? "text-amber-300" : "text-rose-400");
const bar = (v: number) => (v >= 75 ? "bg-emerald-400" : v >= 50 ? "bg-amber-300" : "bg-rose-400");

function Ring({ value, size = 112 }: { value: number; size?: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="mt-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3.2" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="url(#mt-ring)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1)" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[24px] font-bold text-white">{value}%</span>
    </div>
  );
}

/** Score trend as a small line chart (0–100). */
function TrendChart({ points }: { points: { at: number; value: number; subject: string }[] }) {
  const W = 560;
  const H = 180;
  const pad = { l: 30, r: 12, t: 14, b: 26 };
  const x = (i: number) => pad.l + (points.length < 2 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + ((100 - v) * (H - pad.t - pad.b)) / 100;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Score trend">
      <defs>
        <linearGradient id="mt-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-white/10" strokeDasharray={v === 0 ? undefined : "3 4"} />
          <text x={pad.l - 6} y={y(v) + 3.5} textAnchor="end" className="fill-white/40 text-[10px]">{v}</text>
        </g>
      ))}
      {area && <path d={area} fill="url(#mt-area)" />}
      <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.at}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="#a78bfa" className="stroke-[#0f0b1d]" strokeWidth="2">
            <title>{`${p.subject}: ${p.value}%`}</title>
          </circle>
          {(points.length <= 8 || i === points.length - 1) && (
            <text x={x(i)} y={y(p.value) - 9} textAnchor="middle" className="fill-white/70 text-[10px] font-semibold">{p.value}</text>
          )}
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-white/40 text-[9.5px]">{new Date(p.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</text>
        </g>
      ))}
    </svg>
  );
}

const pill = (v: number) => (v >= 75 ? "bg-emerald-400/15 text-emerald-400" : v >= 50 ? "bg-amber-300/15 text-amber-300" : "bg-rose-400/15 text-rose-400");

/** Strengths / average / weak topic counts as a ring, with the subject score in the middle. */
function Donut({ parts, score }: { parts: [number, number, number]; score: number }) {
  const total = parts.reduce((a, b) => a + b, 0) || 1;
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const colors = ["#34d399", "#a78bfa", "#fb7185"];
  let offset = 0;
  return (
    <div className="relative h-[124px] w-[124px] shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3.6" />
        {parts.map((p, k) => {
          if (!p) return null;
          const len = (p / total) * c;
          const el = <circle key={k} cx="18" cy="18" r={r} fill="none" stroke={colors[k]} strokeWidth="3.6" strokeDasharray={`${Math.max(0, len - 0.6)} ${c}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] leading-none font-bold text-white">{score}%</span>
        <span className="mt-1 text-[11px] text-white/50">Score</span>
      </span>
    </div>
  );
}

function TopicBars({ items }: { items: { topic: string; right: number; total: number; acc: number }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t.topic}>
          <div className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="truncate text-white/80">{t.topic}</span>
            <span className="shrink-0 text-white/45 tabular-nums">
              {t.right}/{t.total} · <b className={tone(t.acc)}>{t.acc}%</b>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div className={cn("h-full rounded-full transition-all duration-700", bar(t.acc))} style={{ width: `${Math.max(4, t.acc)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={null}>
      <Tests />
    </Suspense>
  );
}

function Tests() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: PracticeTab = params.get("tab") === "all" ? "all" : params.get("tab") === "analytics" ? "analytics" : "overview";
  const [setupOpen, setSetupOpen] = useState(false);
  const [range, setRange] = useState<"30" | "all">("30");
  const [topicSubject, setTopicSubject] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const { premium, loading } = usePremium();
  const { state, actions } = useStore();
  const history = state.tests ?? [];
  const profileSubs = useMemo(() => suggestSubjects(state), [state.goals, state.learning?.catalog, state.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => testAnalytics(history), [history]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [level, setLevel] = useState<TestLevel>("intermediate");
  const [count, setCount] = useState(10);
  const [qs, setQs] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TestRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "skipped">("all");
  const done = useRef(false);

  // countdown
  useEffect(() => {
    if (phase !== "live") return;
    if (left <= 0) {
      submit(true);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn before leaving a running test
  useEffect(() => {
    if (phase !== "live") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  const profile = [state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year].filter(Boolean).join(" · ");

  const start = async (o?: { subject?: string; topics?: string }) => {
    const sub = (o?.subject ?? subject).trim();
    const tps = (o?.topics ?? topics).trim();
    if (!sub) return setError("Write the subject for your test.");
    setError("");
    setSubject(sub);
    setTopics(tps);
    setPhase("preparing");
    window.scrollTo({ top: 0 });
    try {
      const list = await makeTest({ subject: sub, topics: tps || undefined, level, count, profile });
      if (list.length < 5) throw new AssistantError("Couldn’t prepare the test. Try again.");
      const secs = list.length * SECONDS_PER_Q[level];
      done.current = false;
      setQs(list);
      setAnswers(list.map(() => null));
      setMarked(list.map(() => false));
      setI(0);
      setLimit(secs);
      setLeft(secs);
      setConfirm(false);
      setPhase("live");
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t prepare the test. Try again.");
      setPhase("setup");
    }
  };

  function submit(timedOut = false) {
    if (done.current) return;
    done.current = true;
    const byTopic: TestRecord["byTopic"] = {};
    let score = 0;
    qs.forEach((q, k) => {
      const ok = answers[k] === q.answer;
      if (ok) score++;
      const t = (byTopic[q.topic] ??= { right: 0, total: 0 });
      t.total++;
      if (ok) t.right++;
    });
    const rec: TestRecord = {
      id: uid("mt"),
      at: Date.now(),
      subject: subject.trim(),
      ...(topics.trim() ? { topics: topics.trim() } : {}),
      level,
      total: qs.length,
      score,
      limit,
      used: Math.min(limit, limit - left),
      byTopic,
      review: { questions: qs, answers },
    };
    actions.patch({ tests: addTest(history, rec) });
    setResult(rec);
    setFilter("all");
    setPhase("result");
    window.scrollTo({ top: 0 });
    if (timedOut) actions.toast("Time’s up! Your test was submitted.");
  }

  /* ---------- gate ---------- */
  if (loading) return <div className="px-6 py-7 lg:px-8"><div className="h-[420px] animate-pulse rounded-3xl bg-white/[0.04]" /></div>;
  if (!premium) {
    return (
      <div className="px-6 py-7 lg:px-8">
        <PracticeHeader active={tab} />
        <div className="mt-6">
          <PremiumGate
            icon="quiz"
            title="Know exactly where you stand"
            text="Take timed mock tests made for your subject, level and exam, and practise real interviews. See your score, the topics you’re weak in and how you improve over time."
            points={["Tests for any subject, exam or placement aptitude", "A countdown, question palette and mark-for-review, like real exams", "An explanation for every answer", "AI mock interviews with scores and feedback", "Weak topics, score trend and subject-wise reports"]}
          />
        </div>
      </div>
    );
  }

  /* ---------- live ---------- */
  if (phase === "live") {
    const q = qs[i];
    const answered = answers.filter((a) => a !== null).length;
    const low = left <= 60;
    return (
      <div className="px-6 py-7 lg:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium tracking-wide text-accent uppercase">{subject} · {LEVEL_LABEL[level]}</p>
                <p className="mt-0.5 text-[13px] text-white/55">Question {i + 1} of {qs.length} · {answered} answered</p>
              </div>
              <span className={cn("flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[15px] font-bold tabular-nums", low ? "animate-pulse border-rose-400/50 bg-rose-500/10 text-rose-300" : "border-white/10 bg-white/[0.03] text-white")} aria-live="polite">
                <ClockIcon size={15} /> {mmss(left)}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${(answered / qs.length) * 100}%` }} />
            </div>

            <Card glow className="mt-5 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11.5px] font-medium text-violet-300">{q.topic}</span>
                <button type="button" onClick={() => setMarked((m) => m.map((x, k) => (k === i ? !x : x)))} className={cn("flex items-center gap-1.5 text-[12.5px] transition", marked[i] ? "text-amber-300" : "text-white/50 hover:text-white")}>
                  <FlagIcon size={13} /> {marked[i] ? "Marked for review" : "Mark for review"}
                </button>
              </div>
              <p key={i} className="land-screen-in mt-4 text-[18px] leading-snug font-semibold text-white sm:text-[19px]">{q.q}</p>
              <div className="mt-5 grid gap-2.5">
                {q.options.map((o, k) => {
                  const on = answers[i] === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAnswers((a) => a.map((x, n) => (n === i ? (x === k ? null : k) : x)))}
                      aria-pressed={on}
                      className={cn("flex items-center gap-3 rounded-xl border p-3.5 text-left text-[14px] transition", on ? "border-violet-400 bg-violet-500/[0.14] text-white" : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25")}
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold", on ? "bg-violet-500 text-[#ffffff]" : "bg-white/[0.06] text-white/60")}>{LETTERS[k]}</span>
                      {o}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
                  <ArrowLeftIcon size={14} /> Previous
                </Button>
                {i < qs.length - 1 ? (
                  <Button variant="primary" onClick={() => setI(i + 1)}>
                    {answers[i] === null ? "Skip" : "Save & next"} <ArrowRightIcon size={14} />
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setConfirm(true)}>Submit test</Button>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="text-[14px] font-semibold text-white">Questions</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {qs.map((_, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setI(k)}
                    aria-label={`Question ${k + 1}`}
                    className={cn(
                      "relative flex h-10 items-center justify-center rounded-lg border text-[13px] font-semibold transition",
                      k === i ? "border-violet-400 ring-2 ring-violet-400/40" : "border-transparent",
                      answers[k] !== null ? "bg-violet-500 text-[#ffffff]" : "bg-white/[0.06] text-white/65 hover:bg-white/[0.1]",
                    )}
                  >
                    {k + 1}
                    {marked[k] && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-[#0f0b1d]" />}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 text-[11.5px] text-white/55">
                <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-violet-500" /> Answered ({answered})</p>
                <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-white/[0.12]" /> Not answered ({qs.length - answered})</p>
                <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Marked for review ({marked.filter(Boolean).length})</p>
              </div>
              <Button variant="primary" className="mt-5 w-full" onClick={() => setConfirm(true)}>Submit test</Button>
            </Card>
            {confirm && (
              <Card className="land-screen-in border-amber-300/30 p-5">
                <p className="text-[14px] font-semibold text-white">Submit now?</p>
                <p className="mt-1 text-[12.5px] text-white/60">
                  {qs.length - answered > 0 ? `${qs.length - answered} question${qs.length - answered > 1 ? "s are" : " is"} not answered and will count as wrong.` : "All questions answered."}
                  {marked.some(Boolean) ? ` ${marked.filter(Boolean).length} marked for review.` : ""}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Keep going</Button>
                  <Button size="sm" variant="primary" onClick={() => submit()}>Submit</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */
  if (phase === "result" && result) {
    const p = pct(result);
    const topicsList = Object.entries(result.byTopic).map(([topic, v]) => ({ topic, ...v, acc: Math.round((v.right / v.total) * 100) })).sort((a, b) => a.acc - b.acc);
    const weak = topicsList.filter((t) => t.acc < 60).map((t) => t.topic);
    const rv = result.review;
    const rows = rv ? rv.questions.map((q, k) => ({ q, k, a: rv.answers[k] })).filter((r) => (filter === "wrong" ? r.a !== null && r.a !== r.q.answer : filter === "skipped" ? r.a === null : true)) : [];
    return (
      <div className="px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-[960px]">
          <button type="button" onClick={() => setPhase("setup")} className="flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white">
            <ArrowLeftIcon size={14} /> Practice Arena
          </button>
          <PageHeader title="Your test result" sub={`${result.subject}${result.topics ? ` (${result.topics})` : ""} · ${LEVEL_LABEL[result.level]} · ${new Date(result.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`} actions={<PremiumBadge />} />
          <Card glow className="mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <Ring value={p} size={128} />
            <div>
              <p className="text-[22px] font-semibold text-white">{p >= 85 ? "Excellent work!" : p >= 70 ? "Well done!" : p >= 50 ? "Good effort, keep practising" : "Let’s build this up"}</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { k: "Correct", v: `${result.score}/${result.total}` },
                  { k: "Time used", v: `${mmss(result.used)} / ${mmss(result.limit)}` },
                  { k: "Per question", v: `${Math.round(result.used / result.total)}s` },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] text-white/45">{s.k}</p>
                    <p className="mt-0.5 text-[15px] font-bold text-white tabular-nums">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="mt-5 grid gap-5 md:grid-cols-[1.2fr_1fr]">
            <Card className="p-5">
              <p className="text-[15px] font-semibold text-white">Topic-wise accuracy</p>
              <div className="mt-4"><TopicBars items={topicsList} /></div>
            </Card>
            <Card className="p-5">
              <p className="text-[15px] font-semibold text-white">What to do next</p>
              {weak.length ? (
                <>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">Your weak topics in this test: <b className="text-white">{weak.join(", ")}</b>. A short test on just these will fix them fastest.</p>
                  <Button variant="primary" className="mt-4 w-full" icon={<TargetIcon size={14} />} onClick={() => void start({ subject: result.subject, topics: weak.join(", ") })}>Practise weak topics</Button>
                </>
              ) : (
                <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">No weak topics this time. Try the next difficulty level to keep improving.</p>
              )}
              <Button className="mt-3 w-full" icon={<RefreshIcon size={14} />} onClick={() => void start({ subject: result.subject, topics: result.topics ?? "" })}>New test on {result.subject}</Button>
            </Card>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-white">Answers and explanations</h2>
            {rv && (
              <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {(["all", "wrong", "skipped"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={cn("h-8 rounded-lg px-3 text-[12.5px] capitalize transition", filter === f ? "bg-violet-500 text-[#ffffff]" : "text-white/60 hover:text-white")}>{f}</button>
                ))}
              </div>
            )}
          </div>
          {!rv ? (
            <p className="mt-3 text-[12.5px] text-white/50">Answers are kept for your latest {5} tests only.</p>
          ) : rows.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-white/50">Nothing here.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {rows.map(({ q, k, a }) => {
                const ok = a === q.answer;
                return (
                  <Card key={k} className="p-5">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-400/15 text-emerald-400" : a === null ? "bg-white/[0.08] text-white/50" : "bg-rose-400/15 text-rose-400")}>
                        {ok ? <CheckIcon size={14} /> : a === null ? <span className="text-[11px] font-bold">—</span> : <XIcon size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] text-white/45">Q{k + 1} · {q.topic}</p>
                        <p className="mt-0.5 text-[14px] font-medium text-white">{q.q}</p>
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {q.options.map((o, n) => (
                            <li key={n} className={cn("rounded-lg border px-3 py-2 text-[12.5px]", n === q.answer ? "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-300" : n === a ? "border-rose-400/40 bg-rose-400/[0.08] text-rose-300" : "border-white/[0.07] text-white/60")}>
                              <b className="mr-1.5">{LETTERS[n]}.</b>{o}
                            </li>
                          ))}
                        </ul>
                        {q.explain && <p className="mt-3 rounded-lg bg-violet-500/[0.08] px-3 py-2 text-[12.5px] leading-relaxed text-white/75"><b className="text-violet-300">Why: </b>{q.explain}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- overview · all tests · analytics ---------- */
  const go = (k: PracticeTab) => {
    router.replace(k === "overview" ? "/tests" : `/tests?tab=${k}`);
    window.scrollTo({ top: 0 });
  };
  const openSetup = (sub?: string) => {
    if (sub !== undefined) {
      setSubject(sub);
      setTopics("");
    }
    setError("");
    setSetupOpen(true);
  };
  const openResult = (h: TestRecord) => {
    setResult(h);
    setFilter("all");
    setLevel(h.level);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };
  const tested = [...new Set(history.map((h) => h.subject))];
  const focusSubject = topicSubject && tested.includes(topicSubject) ? topicSubject : tested[0];
  const focus = focusSubject ? subjectTopics(history, focusSubject) : null;
  const since = Date.now() - 30 * 86_400_000;
  const chartPoints = (range === "30" ? history.filter((h) => h.at >= since) : history).slice(0, 20).reverse().map((h) => ({ at: h.at, value: pct(h), subject: h.subject }));
  const lastDelta = history.length > 1 ? pct(history[0]) - Math.round(history.slice(1).reduce((s, h) => s + pct(h), 0) / (history.length - 1)) : null;
  const categories = [
    ...profileSubs.filter((s) => !GENERAL_SUBJECTS.some((g) => g.subject.toLowerCase() === s.toLowerCase())).slice(0, 2).map((s, k) => ({ subject: s, label: s, Icon: k === 0 ? BookIcon : LayersIcon })),
    ...GENERAL_SUBJECTS.map((g, k) => ({ ...g, Icon: [GridIcon, BulbIcon, OpenBookIcon, CompassIcon][k] })),
  ].slice(0, 6);
  const allList = history.filter((h) => (subjectFilter ? h.subject === subjectFilter : true) && (!search.trim() || `${h.subject} ${h.topics ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())));

  const row = (h: TestRecord) => (
    <li key={h.id}>
      <button type="button" onClick={() => openResult(h)} className="group flex w-full items-center gap-3 py-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl tile-3d"><FileIcon size={17} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-white">{h.subject} – {LEVEL_LABEL[h.level]}</span>
          <span className="block truncate text-[12px] text-white/50">{h.total} Questions · {Math.round(h.limit / 60)} Minutes{h.topics ? ` · ${h.topics}` : ""}</span>
        </span>
        <span className={cn("rounded-lg px-2.5 py-1 text-[13px] font-bold tabular-nums", pill(pct(h)))}>{pct(h)}%</span>
        <span className="hidden w-[92px] text-right text-[12px] text-white/50 sm:block">{new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        <ArrowRightIcon size={15} className="text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white" />
      </button>
    </li>
  );

  const header = (
    <PracticeHeader
      active={tab}
      onTab={go}
      action={
        premium ? (
          <Button icon={<PlusIcon size={15} />} onClick={() => openSetup("")}>Create custom test</Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="px-6 py-7 lg:px-8">
      {header}

      {phase === "preparing" && (
        <Card glow className="mt-6 flex flex-col items-center py-20 text-center">
          <FancyIcon name="quiz" tone="violet" size={72} float />
          <p className="mt-5 text-[18px] font-semibold text-white">Preparing your test…</p>
          <p className="mt-1 text-[13px] text-white/55">Writing {count} {LEVEL_LABEL[level].toLowerCase()} questions on {subject}{topics ? ` (${topics})` : ""}. About 10–30 seconds.</p>
        </Card>
      )}
      {phase !== "preparing" && error && !setupOpen && <p className="mt-5 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}

      {/* ---------- overview ---------- */}
      {phase !== "preparing" && tab === "overview" && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { Icon: LayersIcon, value: String(stats?.tests ?? 0), label: "Tests taken" },
              { Icon: TrophyIcon, value: stats ? `${stats.avg}%` : "—", label: "Average score", delta: lastDelta },
              { Icon: TargetIcon, value: String(tested.length), label: "Subjects covered" },
              { Icon: ClockIcon, value: practiceTime(history.reduce((s, h) => s + h.used, 0)), label: "Total practice time" },
            ].map((c) => (
              <Card key={c.label} className="flex items-center gap-4 p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl tile-3d"><c.Icon size={24} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[26px] leading-none font-bold text-white tabular-nums">{c.value}</p>
                  <p className="mt-1.5 text-[13px] text-white/60">{c.label}</p>
                </div>
                {c.delta != null && c.delta !== 0 && (
                  <span className={cn("self-start rounded-lg px-2 py-0.5 text-[12px] font-semibold", c.delta > 0 ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400")} title="Your latest test compared with your earlier average">
                    {c.delta > 0 ? "↑ +" : "↓ "}{c.delta}%
                  </span>
                )}
              </Card>
            ))}
          </div>

          <div className="mt-5 grid gap-5 min-[1400px]:grid-cols-[1fr_1.1fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[18px] font-bold text-white">Take a Mock Test</p>
                <button type="button" onClick={() => openSetup("")} className="flex items-center gap-1 text-[13px] font-medium text-violet-400 hover:underline">
                  Any subject <ArrowRightIcon size={13} />
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {categories.map((c, k) => {
                  const n = testsFor(history, c.subject).length;
                  return (
                    <button
                      key={c.subject}
                      type="button"
                      onClick={() => openSetup(c.subject)}
                      className={cn("group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition lift-3d", k === 0 ? "border-violet-400/70 bg-violet-500/[0.14]" : "border-white/10 bg-white/[0.03] hover:border-violet-400/50")}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl tile-3d"><c.Icon size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-[14px] leading-snug font-semibold text-white">{c.label}</span>
                        <span className="block text-[12px] text-white/50">{n ? `${n} test${n > 1 ? "s" : ""} taken` : "Start practising"}</span>
                      </span>
                      <ArrowRightIcon size={15} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[18px] font-bold text-white">Your Performance Overview</p>
                <select value={range} onChange={(e) => setRange(e.target.value as "30" | "all")} aria-label="Time range" className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12.5px] text-white/80 outline-none">
                  <option value="30">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              {chartPoints.length ? (
                <div className="mt-3"><TrendChart points={chartPoints} /></div>
              ) : (
                <div className="flex h-[200px] flex-col items-center justify-center text-center">
                  <BarChartIcon size={28} className="text-white/25" />
                  <p className="mt-2 text-[12.5px] text-white/50">{history.length ? "No tests in the last 30 days." : "Take your first test to see your score trend."}</p>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 min-[1700px]:grid-cols-[1.15fr_1fr_1fr]">
            <Card className="min-w-0 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[18px] font-bold text-white">Recent Tests</p>
                {history.length > 0 && (
                  <button type="button" onClick={() => go("all")} className="flex items-center gap-1 text-[13px] font-medium text-violet-400 hover:underline">
                    View history <ArrowRightIcon size={13} />
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="mt-3 text-[12.5px] text-white/50">Your tests will show here.</p>
              ) : (
                <ul className="mt-1 divide-y divide-white/[0.07]">{history.slice(0, 3).map(row)}</ul>
              )}
            </Card>

            <Card className="min-w-0 p-5">
              <p className="text-[18px] font-bold text-white">Subject-wise Performance</p>
              {!stats ? (
                <p className="mt-3 text-[12.5px] text-white/50">Your average in each subject will show here.</p>
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {stats.subjects.map((s) => (
                    <li key={s.subject} className="flex items-center gap-3">
                      <span className="w-[38%] truncate text-[13px] text-white/80">{s.subject}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <span className={cn("block h-full rounded-full", bar(s.avg))} style={{ width: `${Math.max(4, s.avg)}%` }} />
                      </span>
                      <b className="w-10 text-right text-[13px] text-white tabular-nums">{s.avg}%</b>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="min-w-0 p-5 lg:col-span-2 min-[1700px]:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[18px] font-bold text-white">Topic Analysis{focusSubject ? ` – ${focusSubject}` : ""}</p>
                {tested.length > 1 && (
                  <select value={focusSubject} onChange={(e) => setTopicSubject(e.target.value)} aria-label="Subject" className="h-8 max-w-[130px] rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-white/80 outline-none">
                    {tested.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
              {!focus ? (
                <p className="mt-3 text-[12.5px] text-white/50">After a test you’ll see your strong and weak topics here.</p>
              ) : (
                <div className="mt-4 grid items-center gap-4 md:grid-cols-2 min-[1700px]:grid-cols-1">
                  <div className="flex items-center gap-5">
                    <Donut parts={[focus.strong.length, focus.average.length, focus.weak.length]} score={focus.score} />
                    <ul className="space-y-2.5 text-[13px]">
                      <li className="flex items-center gap-2 text-white/80"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Strengths ({focus.strong.length})</li>
                      <li className="flex items-center gap-2 text-white/80"><span className="h-3 w-3 rounded-full bg-violet-400" /> Average ({focus.average.length})</li>
                      <li className="flex items-center gap-2 text-white/80"><span className="h-3 w-3 rounded-full bg-rose-400" /> Weak areas ({focus.weak.length})</li>
                    </ul>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                    <BulbIcon size={18} className="mt-0.5 shrink-0 text-violet-300" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">Focus areas</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/60">
                        {focus.weak.length ? <>Work on <b className="text-white">{focus.weak.slice(0, 3).map((w) => w.topic).join(", ")}</b> to raise your {focusSubject} score.</> : focus.average.length ? <>Push <b className="text-white">{focus.average.slice(0, 3).map((w) => w.topic).join(", ")}</b> above 75% next.</> : "Great work! Try the next difficulty level."}
                      </p>
                      {(focus.weak.length > 0 || focus.average.length > 0) && (
                        <button type="button" onClick={() => void start({ subject: focusSubject!, topics: (focus.weak.length ? focus.weak : focus.average).slice(0, 4).map((w) => w.topic).join(", ") })} className="mt-2 text-[12.5px] font-semibold text-violet-400 hover:underline">
                          Practise these now →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ---------- all tests ---------- */}
      {phase !== "preparing" && tab === "all" && (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests…" aria-label="Search tests" className="h-10 min-w-[200px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13.5px] text-white outline-none focus:border-accent" />
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label="Subject" className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-white/80 outline-none">
              <option value="">All subjects</option>
              {tested.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => openSetup("")}>New test</Button>
          </div>
          {allList.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-white/50">{history.length ? "No tests match." : "No tests yet. Start one from Overview."}</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/[0.07]">{allList.map(row)}</ul>
          )}
          <p className="mt-3 text-[11.5px] text-white/40">Your latest {MAX_TESTS} tests are kept. Answers and explanations are kept for the latest {KEEP_REVIEW}.</p>
        </Card>
      )}

      {/* ---------- analytics ---------- */}
      {phase !== "preparing" && tab === "analytics" && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {!stats ? (
              <Card className="flex flex-col items-center p-10 text-center">
                <FancyIcon name="target" tone="cyan" size={60} />
                <p className="mt-4 text-[14px] font-semibold text-white">Your reports will appear here</p>
                <p className="mt-1 max-w-sm text-[12.5px] text-white/55">After your first test you’ll see your score trend, weak and strong topics, and subject-wise averages.</p>
              </Card>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-white">Score trend</p>
                    <p className="text-[12px] text-white/45">Last {stats.trend.length} test{stats.trend.length > 1 ? "s" : ""} · %</p>
                  </div>
                  <div className="mt-3"><TrendChart points={stats.trend} /></div>
                </Card>
                <Card className="p-5">
                  <p className="text-[15px] font-semibold text-white">Topic accuracy</p>
                  <p className="mt-0.5 text-[11.5px] text-white/45">Across all your tests</p>
                  <div className="mt-4"><TopicBars items={stats.topics} /></div>
                </Card>
                <Card className="p-5">
                  <p className="text-[15px] font-semibold text-white">Subject-wise average</p>
                  <ul className="mt-4 space-y-3">
                    {stats.subjects.map((s) => (
                      <li key={s.subject} className="flex items-center gap-3">
                        <span className={cn("flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[13px] font-bold tabular-nums", tone(s.avg))}>{s.avg}%</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-white">{s.subject}</span>
                          <span className="block text-[11.5px] text-white/45">{s.n} test{s.n > 1 ? "s" : ""}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {stats.strong.length > 0 && (
                    <>
                      <p className="mt-5 text-[12.5px] font-semibold text-emerald-400">Strong topics</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {stats.strong.map((t) => <span key={t.topic} className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11.5px] text-emerald-300">{t.topic} · {t.acc}%</span>)}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}
          </div>
          <div className="space-y-5">
            <Card className="p-5">
              <p className="text-[17px] font-bold text-white">Your Stats</p>
              <div className="mt-4 flex items-center gap-5">
                <Ring value={stats?.avg ?? 0} size={96} />
                <div>
                  <p className="text-[12px] text-white/50">Average score</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">{!stats ? "No tests yet" : stats.avg >= 75 ? "Exam-ready" : stats.avg >= 50 ? "Getting there" : "Keep practising"}</p>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-white/[0.07]">
                {[
                  { icon: TrophyIcon, label: "Best score", value: stats ? `${stats.best}%` : "—" },
                  { icon: CheckIcon, label: "Questions solved", value: stats ? String(stats.questions) : "0" },
                  { icon: ClockIcon, label: "Avg. time / question", value: stats ? `${stats.secsPerQ}s` : "—" },
                ].map((r) => (
                  <li key={r.label} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl tile-3d"><r.icon size={16} /></span>
                    <span className="flex-1 text-[13.5px] text-white/80">{r.label}</span>
                    <span className="text-[15px] font-bold text-white tabular-nums">{r.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <p className="text-[17px] font-bold text-white">Weak topics</p>
              {!stats || stats.weak.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-white/50">{stats ? "None right now. Nice!" : "Topics where you score under 60% will show here."}</p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {stats.weak.map((w) => (
                      <li key={w.topic} className="flex items-center justify-between gap-2 rounded-lg bg-rose-400/[0.07] px-3 py-2 text-[12.5px]">
                        <span className="truncate text-white/85">{w.topic}</span>
                        <b className="shrink-0 text-rose-400 tabular-nums">{w.acc}%</b>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4 w-full"
                    icon={<TargetIcon size={14} />}
                    onClick={() => {
                      const subj = history.find((h) => Object.keys(h.byTopic).some((k) => k.trim().toLowerCase() === stats.weak[0].topic.toLowerCase()))?.subject ?? subject;
                      void start({ subject: subj, topics: stats.weak.slice(0, 4).map((w) => w.topic).join(", ") });
                    }}
                  >
                    Practise weak topics
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ---------- new test (dialog) ---------- */}
      {setupOpen && phase === "setup" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setSetupOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="mt-title" className="w-full max-w-[640px]" onClick={(e) => e.stopPropagation()}>
            <Card glow className="p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p id="mt-title" className="text-[19px] font-bold text-white">New mock test</p>
                <button type="button" aria-label="Close" onClick={() => setSetupOpen(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
              </div>
              <div className="mt-5">
                <Label htmlFor="mt-subject">Subject or exam</Label>
                <input id="mt-subject" autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Financial accounting, DBMS, CAT quant, Python" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white outline-none focus:border-accent" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...profileSubs, ...GENERAL_SUBJECTS.map((g) => g.subject)].slice(0, 9).map((s) => (
                    <button key={s} type="button" onClick={() => setSubject(s)} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", subject === s ? "border-accent bg-accent/10 text-white" : "border-white/10 text-white/55 hover:border-white/25")}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <Label htmlFor="mt-topics">Topics (optional)</Label>
                <input id="mt-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Leave empty for the whole subject, or e.g. percentages, time and work" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white outline-none focus:border-accent" />
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-5">
                <div>
                  <Label>Difficulty</Label>
                  <div className="flex h-12 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={cn("h-full rounded-lg px-3 text-[13px] font-medium transition", level === l ? "bg-violet-500 text-[#ffffff]" : "text-white/65 hover:text-white")}>{LEVEL_LABEL[l]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Questions</Label>
                  <div className="flex h-12 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {[10, 15, 20, 30].map((n) => (
                      <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={count === n} className={cn("h-full w-10 rounded-lg text-[13px] font-medium transition", count === n ? "bg-violet-500 text-[#ffffff]" : "text-white/65 hover:text-white")}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-white/55"><ClockIcon size={13} /> {Math.round((count * SECONDS_PER_Q[level]) / 60)} minutes · single correct answer · no negative marking</p>
              {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
              <button type="button" onClick={() => { setSetupOpen(false); void start(); }} disabled={!subject.trim()} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[14px] font-semibold text-[#ffffff] shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)] transition hover:brightness-110 disabled:opacity-50">
                <PlayIcon size={15} /> Start Mock Test <ArrowRightIcon size={14} />
              </button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
