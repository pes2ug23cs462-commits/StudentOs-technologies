"use client";

/* Premium · AI mock interview (/interview).
   setup → the AI writes questions for the role → the student answers each one by
   typing or speaking (the question can be read aloud) → the AI scores every
   answer and gives feedback with a model answer → saved to history. */

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/free/parts";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PremiumBadge, PremiumGate } from "@/components/premium/premium-gate";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BarChartIcon, BotIcon, BriefcaseIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, FileIcon, LaptopIcon, MicIcon, PlayIcon, RefreshIcon, RepeatIcon, SparkleIcon, StopIcon, TrophyIcon, UserIcon, UsersIcon, VideoIcon, VolumeIcon, XIcon } from "@/components/ui/icons";
import { Card, Label } from "@/components/ui/primitives";
import { AssistantError } from "@/lib/assistant";
import { KIND_LABEL, LEVEL_LABEL, MAX_SAVED, interviewStats, evaluate, makeQuestions, suggestRoles, type Feedback, type InterviewKind, type InterviewLevel, type InterviewRecord, type Question } from "@/lib/interview";
import { usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";
import { bestVoice, englishVoices, saveVoice, speakText, stopSpeaking, voicesReady } from "@/lib/tts";
import { VOICE_LANGS, startRecording, transcribe, type Recorder } from "@/lib/voice";

type Phase = "setup" | "preparing" | "live" | "scoring" | "result";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Reads a question aloud with the smoothest English voice the browser has. */
function speak(text: string, on: boolean, voice?: SpeechSynthesisVoice | null) {
  if (!on || !text) return stopSpeaking();
  void speakText(text, { voice });
}

function ScoreRing({ value, size = 120 }: { value: number; size?: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const tone = value >= 75 ? "stroke-emerald-400" : value >= 50 ? "stroke-amber-300" : "stroke-rose-400";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" className={tone} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1)" }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold text-white">{value}</span>
        <span className="text-[10.5px] text-white/50">out of 100</span>
      </span>
    </div>
  );
}

const TYPES: { kind: InterviewKind; title: string; text: string; icon: typeof LaptopIcon }[] = [
  { kind: "technical", title: "Technical Interview", text: "Core concepts, problem solving and role-specific technical questions.", icon: LaptopIcon },
  { kind: "hr", title: "Behavioral Interview", text: "Communication, teamwork, leadership and situational questions.", icon: UsersIcon },
  { kind: "role", title: "Job Role Interview", text: "A full interview for a role: accounts, data, design, marketing and more.", icon: BriefcaseIcon },
  { kind: "custom", title: "Custom Interview", text: "Create your own interview with topics of your choice.", icon: FileIcon },
];

function ago(at: number) {
  const d = Math.floor((Date.now() - at) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* One example question per type, typed out on the setup screen. */
const EXAMPLE: Record<string, string> = {
  technical: "Walk me through how you would find a duplicate in a list of a million numbers.",
  hr: "Tell me about a time a team project went wrong. What did you do?",
  role: "What would you check first if this month’s numbers don’t match last month’s?",
  custom: "Questions come only from the topics you type below.",
};

/* Last scores as a small line, oldest → newest. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 220;
  const h = 44;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - (v / 100) * (h - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-11 w-full overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="iv-spark" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-accent)" className="iv-spark-dot" />
    </svg>
  );
}

export default function InterviewPage() {
  const { premium, loading } = usePremium();
  const { state, actions } = useStore();
  const roles = suggestRoles(state.setup);
  const history = state.interviews ?? [];

  const [phase, setPhase] = useState<Phase>("setup");
  const [role, setRole] = useState(roles[0] ?? "");
  const [kind, setKind] = useState<InterviewKind>("technical");
  const [level, setLevel] = useState<InterviewLevel>("beginner");
  const [topics, setTopics] = useState("");
  const [how, setHow] = useState(false);
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InterviewRecord | null>(null);
  const [readAloud, setReadAloud] = useState(true);
  const [lang, setLang] = useState("en-IN");
  const [rec, setRec] = useState<Recorder | null>(null);
  const [hearing, setHearing] = useState(false);
  const [secs, setSecs] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    void voicesReady().then((list) => {
      setVoices(list);
      setVoice(bestVoice(list));
    });
  }, []);

  // timer for the current question
  useEffect(() => {
    if (phase !== "live") return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, i]);
  // read each question aloud
  useEffect(() => {
    if (phase === "live" && questions[i]) speak(questions[i].q, readAloud, voice);
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);

  const profile = [state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year, (state.setup?.skills.familiar ?? []).join(", ")].filter(Boolean).join(" · ");

  const start = async () => {
    if (!role.trim()) return setError("Write the role you’re preparing for.");
    if (kind === "custom" && !topics.trim()) return setError("Write the topics you want to be asked about.");
    setError("");
    setPhase("preparing");
    try {
      const qs = await makeQuestions({ role: role.trim(), kind, level, count, profile, topics: kind === "custom" ? topics.trim() : undefined });
      if (!qs.length) throw new AssistantError("Couldn’t prepare questions. Try again.");
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setI(0);
      setPhase("live");
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t prepare questions. Try again.");
      setPhase("setup");
    }
  };

  const setAnswer = (text: string) => setAnswers((a) => a.map((x, k) => (k === i ? text : x)));

  const mic = async () => {
    if (rec) {
      rec.stop();
      setRec(null);
      return;
    }
    try {
      speak("", false);
      const r = await startRecording(async (audio) => {
        setHearing(true);
        try {
          const text = await transcribe(audio, lang);
          if (text) setAnswers((a) => a.map((x, k) => (k === i ? (x ? `${x} ${text}` : text) : x)));
        } catch {
          actions.toast("Couldn’t understand the recording. Try again or type your answer.");
        } finally {
          setHearing(false);
        }
      });
      setRec(r);
    } catch {
      actions.toast("Microphone isn’t available. Allow mic access or type your answer.");
    }
  };

  const finish = async (final: string[]) => {
    rec?.cancel();
    setRec(null);
    speak("", false);
    setPhase("scoring");
    try {
      const fb: Feedback = await evaluate({ role: role.trim(), kind, level, topics: kind === "custom" ? topics.trim() : undefined, items: questions.map((q, k) => ({ q: q.q, a: final[k] ?? "" })) });
      const record: InterviewRecord = { id: uid("iv"), at: Date.now(), role: role.trim(), kind, level, questions, answers: final, feedback: fb, ...(kind === "custom" && topics.trim() ? { topics: topics.trim() } : {}) };
      actions.patch({ interviews: [record, ...history].slice(0, MAX_SAVED) });
      setResult(record);
      setOpen(0);
      setPhase("result");
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t score the interview. Try again.");
      setPhase("live");
    }
  };

  const next = () => {
    if (i < questions.length - 1) {
      rec?.stop();
      setRec(null);
      setI(i + 1);
      setTimeout(() => box.current?.focus(), 50);
    } else void finish(answers);
  };

  /* ---------- gate ---------- */
  if (loading) return <div className="px-6 py-7 lg:px-8"><div className="h-[420px] animate-pulse rounded-3xl bg-white/[0.04]" /></div>;
  if (!premium) {
    return (
      <div className="px-6 py-7 lg:px-8">
        <PracticeHeader active="interview" />
        <div className="mt-6">
          <PremiumGate
            icon="chat"
            title="Walk into interviews prepared"
            text="An AI interviewer asks the questions real companies and campus placements ask for your role. Answer by typing or speaking, then see what went well and how to answer better."
            points={["HR, technical or mixed rounds for any role", "Speak your answers in English, Hindi or Kannada", "A score out of 100, feedback on every answer and model answers", "Your past interviews saved to track progress"]}
          />
        </div>
      </div>
    );
  }

  /* ---------- live ---------- */
  if (phase === "live" || phase === "scoring") {
    const q = questions[i];
    return (
      <div className="px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-[820px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium tracking-wide text-accent uppercase">{role} · {KIND_LABEL[kind]}</p>
              <p className="mt-0.5 text-[13px] text-white/55">
                Question {i + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setReadAloud((v) => !v); speak(q.q, !readAloud, voice); }} className={cn("flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] transition", readAloud ? "border-accent/50 text-accent" : "border-white/10 text-white/55")} title="Read questions aloud">
                <VolumeIcon size={14} /> {readAloud ? "Voice on" : "Voice off"}
              </button>
              {readAloud && voices.length > 1 && (
                <select
                  value={voice?.name ?? ""}
                  onChange={(e) => {
                    const v = englishVoices().find((x) => x.name === e.target.value) ?? null;
                    setVoice(v);
                    if (v) saveVoice(v.name);
                    speak(q.q, true, v);
                  }}
                  className="hidden h-9 max-w-[180px] rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-white/75 outline-none sm:block"
                  aria-label="Interviewer voice"
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>{v.name.replace(/^(Microsoft|Google)\s*/, "").replace(/\s*\(.*\)$/, "").replace(/ Online$/, "")}</option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="ghost" onClick={() => window.confirm("End the interview now? Unanswered questions count as skipped.") && finish(answers)} disabled={phase === "scoring"}>
                End
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {questions.map((_, k) => (
              <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-all", k < i ? "bg-accent" : k === i ? "bg-accent/60" : "bg-white/10")} />
            ))}
          </div>

          <Card glow className="mt-6 p-6 sm:p-8">
            {phase === "scoring" ? (
              <div className="flex flex-col items-center py-12 text-center">
                <FancyIcon name="sparkle" tone="violet" size={64} float />
                <p className="mt-5 text-[18px] font-semibold text-white">Scoring your interview…</p>
                <p className="mt-1 text-[13px] text-white/55">Reading every answer and writing feedback. About 10–20 seconds.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <span className="relative shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/20" />
                    <FancyIcon name="bot" tone="violet" size={52} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-white/45">Interviewer{q.focus ? ` · ${q.focus}` : ""}</p>
                    <p key={i} className="land-screen-in mt-1 text-[19px] leading-snug font-semibold text-white sm:text-[21px]">{q.q}</p>
                    <button type="button" onClick={() => speak(q.q, true, voice)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-white/50 hover:text-accent">
                      <VolumeIcon size={13} /> Hear again
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <textarea
                    ref={box}
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={6}
                    placeholder={rec ? "Listening… press Stop when you’re done." : "Type your answer, or press the mic and speak."}
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[14.5px] leading-relaxed text-white placeholder:text-white/35 outline-none focus:border-accent"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={mic}
                        disabled={hearing}
                        className={cn("relative flex h-11 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold transition", rec ? "bg-rose-500 text-[#ffffff]" : "border border-white/15 text-white hover:border-accent/50")}
                      >
                        {rec && <span className="absolute inset-0 animate-ping rounded-xl bg-rose-500/40" />}
                        {rec ? <StopIcon size={14} className="relative" /> : <MicIcon size={15} />}
                        <span className="relative">{hearing ? "Writing it down…" : rec ? "Stop" : "Speak answer"}</span>
                      </button>
                      <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-[12.5px] text-white/75 outline-none" aria-label="Language you speak in">
                        {VOICE_LANGS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[12.5px] tabular-nums", secs > 150 ? "text-amber-300" : "text-white/45")}>{fmt(secs)} {secs > 150 ? "· try to wrap up" : ""}</span>
                      <Button variant="ghost" size="sm" onClick={next}>Skip</Button>
                      <Button variant="primary" onClick={next} disabled={!(answers[i] ?? "").trim() || !!rec || hearing}>
                        {i < questions.length - 1 ? "Next question" : "Finish & get score"} <ArrowRightIcon size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
                {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
              </>
            )}
          </Card>
          <p className="mt-4 text-center text-[12px] text-white/40">Tip: answer like a real interview. Use a short example (situation, what you did, result).</p>
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */
  if (phase === "result" && result) {
    const fb = result.feedback;
    return (
      <div className="px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <PageHeader title="Your interview result" sub={`${result.role} · ${KIND_LABEL[result.kind]} · ${new Date(result.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`} actions={<PremiumBadge />} />
          <Card glow className="mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <ScoreRing value={fb.overall} />
            <div>
              <p className="text-[22px] font-semibold text-white">{fb.verdict || "Interview complete"}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/65">{fb.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3.5">
                  <p className="text-[12px] font-semibold text-emerald-300">What went well</p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-white/75">{fb.strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3.5">
                  <p className="text-[12px] font-semibold text-amber-200">Work on next</p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-white/75">{fb.tips.map((s) => <li key={s}>• {s}</li>)}</ul>
                </div>
              </div>
            </div>
          </Card>

          <h2 className="mt-8 text-[16px] font-semibold text-white">Answer by answer</h2>
          <div className="mt-3 space-y-3">
            {result.questions.map((q, k) => {
              const it = fb.items[k];
              const on = open === k;
              return (
                <Card key={k} className="overflow-hidden">
                  <button type="button" onClick={() => setOpen(on ? null : k)} className="flex w-full items-center gap-4 p-4 text-left">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold", (it?.score ?? 0) >= 8 ? "bg-emerald-400/15 text-emerald-300" : (it?.score ?? 0) >= 5 ? "bg-amber-300/15 text-amber-200" : "bg-rose-400/15 text-rose-300")}>
                      {it?.score ?? 0}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-medium text-white">{q.q}</span>
                    <ChevronDownIcon size={16} className={cn("shrink-0 text-white/45 transition", on && "rotate-180")} />
                  </button>
                  {on && it && (
                    <div className="space-y-3 border-t border-white/[0.07] p-4 text-[13.5px]">
                      <div>
                        <p className="text-[11.5px] font-semibold tracking-wide text-white/45 uppercase">Your answer</p>
                        <p className="mt-1 whitespace-pre-wrap text-white/75">{result.answers[k] || <i className="text-white/40">Skipped</i>}</p>
                      </div>
                      <p><span className="font-semibold text-emerald-300">Good: </span><span className="text-white/75">{it.good}</span></p>
                      <p><span className="font-semibold text-amber-200">Improve: </span><span className="text-white/75">{it.improve}</span></p>
                      <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-3.5">
                        <p className="text-[11.5px] font-semibold tracking-wide text-violet-200 uppercase">A strong answer</p>
                        <p className="mt-1 text-white/80">{it.better}</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" icon={<RefreshIcon size={14} />} onClick={() => void start()}>Practise again</Button>
            <Button onClick={() => setPhase("setup")}>New interview</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- setup ---------- */
  const stats = interviewStats(history);
  const openRecord = (h: InterviewRecord) => {
    setResult(h);
    setOpen(0);
    setRole(h.role);
    setKind(h.kind);
    setLevel(h.level);
    setTopics(h.topics ?? "");
    setCount(h.questions.length);
    setPhase("result");
  };
  const recentScores = history.slice(0, 8).map((h) => h.feedback.overall).reverse();
  const typeOn = (k: InterviewKind) => kind === k || (k === "role" && kind === "mixed");
  return (
    <div className="px-6 py-7 lg:px-8">
      <PracticeHeader active="interview" />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {phase === "preparing" ? (
            <Card className="p-6">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <span className="ui-live" aria-hidden /> Writing your questions
              </p>
              <p className="mt-1 text-[13px] text-white/55">
                {count} {LEVEL_LABEL[level].toLowerCase()} questions for {role}. This takes a few seconds.
              </p>
              <div className="mt-6 space-y-3" aria-hidden>
                {Array.from({ length: Math.min(count, 5) }, (_, k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="w-6 text-[12px] text-white/35 tabular-nums">{k + 1}.</span>
                    <span className="h-3 flex-1 animate-pulse rounded-full bg-white/[0.06]" style={{ maxWidth: `${90 - k * 9}%`, animationDelay: `${k * 120}ms` }} />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-6 py-5">
                <div>
                  <h2 className="text-[17px] font-semibold text-white">New mock interview</h2>
                  <p className="mt-0.5 text-[13px] text-white/55">Questions are written for your role and level. Answer by typing or speaking; you get a score and a model answer for each.</p>
                </div>
                <button type="button" onClick={() => setHow((v) => !v)} aria-expanded={how} className="text-[12.5px] font-medium text-accent hover:underline">
                  {how ? "Hide steps" : "How it works"}
                </button>
              </div>

              {how && (
                <ol className="grid gap-4 border-b border-white/[0.07] bg-white/[0.015] px-6 py-4 sm:grid-cols-4">
                  {[
                    ["Pick a type", "Technical, behavioral, job role or your own topics."],
                    ["Set role and level", "Questions match the role and difficulty."],
                    ["Answer", "Type or speak. Questions can be read aloud."],
                    ["Get feedback", "A score, what to improve, a model answer."],
                  ].map(([h, d], n) => (
                    <li key={h} className="text-[12.5px]">
                      <span className="font-semibold text-white">{n + 1}. {h}</span>
                      <span className="mt-0.5 block leading-relaxed text-white/55">{d}</span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="space-y-6 px-6 py-6">
                {/* type */}
                <fieldset>
                  <legend className="mb-2.5 text-[12.5px] font-semibold text-white/80">Interview type</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TYPES.map((t) => {
                      const on = typeOn(t.kind);
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.kind}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setKind(t.kind)}
                          className={cn("group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors", on ? "border-accent/60 bg-[var(--color-plum)]" : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]")}
                        >
                          <Icon size={17} className={cn("mt-0.5 shrink-0", on ? "text-[var(--cyan)]" : "text-white/45")} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-white">{t.title.replace(" Interview", "")}</span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-white/50">{t.text}</span>
                          </span>
                          <span className={cn("mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on ? "border-accent" : "border-white/25")}>
                            {on && <span className="iv-dot h-2 w-2 rounded-full bg-accent" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p key={kind} className="explain-in mt-3 flex items-start gap-2 text-[12.5px] text-white/50">
                    <span className="shrink-0 font-medium text-white/40">Example:</span>
                    <span className="text-white/70 italic">{EXAMPLE[kind === "mixed" ? "role" : kind]}</span>
                  </p>
                </fieldset>

                {kind === "custom" && (
                  <div>
                    <Label htmlFor="iv-topics">Topics you want to be asked about</Label>
                    <input id="iv-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. GST basics, Excel, Tally, my final-year project" className="h-10 w-full rounded-lg border border-white/10 bg-field px-3.5 text-[13.5px] text-white outline-none focus:border-accent" />
                  </div>
                )}

                {/* role */}
                <div>
                  <Label htmlFor="iv-role">Role</Label>
                  <input id="iv-role" list="iv-roles" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Accounts executive, AI/ML intern" className="h-10 w-full rounded-lg border border-white/10 bg-field px-3.5 text-[13.5px] text-white outline-none focus:border-accent" />
                  <datalist id="iv-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
                  {roles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="py-1 text-[11.5px] text-white/40">Suggested:</span>
                      {roles.map((r) => (
                        <button key={r} type="button" onClick={() => setRole(r)} className={cn("rounded-md border px-2 py-0.5 text-[12px] transition-colors", role === r ? "border-accent/60 bg-accent/10 text-white" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white")}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* level + count */}
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-semibold text-white/80">Difficulty</p>
                    <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-lg border border-white/10 p-0.5">
                      {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                        <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)} className={cn("h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors", level === l ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
                          {LEVEL_LABEL[l]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-semibold text-white/80">Questions</p>
                    <div role="radiogroup" aria-label="Number of questions" className="inline-flex rounded-lg border border-white/10 p-0.5">
                      {[5, 8, 10].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={cn("h-8 w-11 rounded-md text-[12.5px] font-medium tabular-nums transition-colors", count === n ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-6 py-4">
                <p className="text-[12.5px] text-white/50">
                  About {count * 2} minutes · {KIND_LABEL[kind]} · {LEVEL_LABEL[level]}
                </p>
                <Button variant="primary" icon={<MicIcon size={14} />} onClick={() => void start()} disabled={!role.trim() || (kind === "custom" && !topics.trim())}>
                  Start interview
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* right column */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] font-semibold text-white">Your progress</p>
              {stats && <span className="text-[11.5px] text-white/45">last {Math.min(history.length, 8)} interviews</span>}
            </div>
            {!stats ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">Take your first interview to see your scores here.</p>
            ) : (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  {[
                    { label: "Interviews", value: String(stats.taken) },
                    { label: "Average", value: `${stats.avg}%` },
                    { label: "Best", value: `${stats.best}%` },
                    { label: "Change", value: stats.improvement == null ? "—" : `${stats.improvement > 0 ? "+" : ""}${stats.improvement}%`, tone: stats.improvement == null ? "" : stats.improvement >= 0 ? "text-emerald-400" : "text-rose-400" },
                  ].map((r) => (
                    <div key={r.label}>
                      <dt className="text-[11.5px] text-white/45">{r.label}</dt>
                      <dd className={cn("mt-0.5 text-[20px] font-semibold tracking-tight text-white tabular-nums", r.tone)}>{r.value}</dd>
                    </div>
                  ))}
                </dl>
                <Spark values={recentScores} />
              </>
            )}
          </Card>

          <Card id="iv-recent" className="scroll-mt-24 p-5">
            <p className="text-[14px] font-semibold text-white">Recent interviews</p>
            {history.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-white/50">Your interviews and scores will show here.</p>
            ) : (
              <ul className="mt-2 max-h-[360px] divide-y divide-white/[0.06] overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => openRecord(h)} className="group flex w-full items-center gap-3 py-2.5 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white group-hover:text-accent">{h.role}</span>
                        <span className="block text-[11.5px] text-white/45">
                          {KIND_LABEL[h.kind]} · {LEVEL_LABEL[h.level]} · {ago(h.at)}
                        </span>
                      </span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums", h.feedback.overall >= 75 ? "bg-emerald-400/10 text-emerald-400" : h.feedback.overall >= 50 ? "bg-amber-400/10 text-amber-300" : "bg-rose-500/10 text-rose-400")}>
                        {h.feedback.overall}%
                      </span>
                      <ChevronRightIcon size={14} className="text-white/30 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
