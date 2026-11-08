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

function ReadinessRing({ value }: { value: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="iv-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3.2" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="url(#iv-ring)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1)" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-white">{value}%</span>
    </div>
  );
}

/** Hero illustration: a laptop on a desk in a video call with the AI interviewer (an illustrated avatar, not a photo). */
function InterviewScene() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none" aria-hidden style={{ perspective: 1000 }}>
      <div className="iv-float">
      <div style={{ transform: "rotateY(-12deg) rotateX(4deg)" }}>
        {/* screen */}
        <div className="rounded-t-2xl border border-[rgba(255,255,255,0.15)] bg-[#0d0a18] p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[radial-gradient(90%_90%_at_50%_30%,#3b2a6b,#1a1233_60%,#0e0a1c)]">
            <span className="absolute top-2.5 left-2.5 rounded-md bg-[rgba(0,0,0,0.5)] px-2 py-0.5 text-[10.5px] font-medium text-[rgba(255,255,255,0.90)]">Interviewer (AI)</span>
            <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[9.5px] font-bold text-[#ffffff]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffffff]" /> LIVE</span>
            {/* avatar */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-9">
              <span className="relative flex items-center justify-center">
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-violet-400/15" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-[0_0_40px_rgba(168,85,247,0.6)] sm:h-20 sm:w-20">
                  <BotIcon size={34} className="text-[#ffffff]" strokeWidth={1.6} />
                </span>
              </span>
              <span className="mt-2.5 flex h-4 items-end gap-[3px]">
                {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                  <span key={k} className="iv-wave w-[3px] rounded-full bg-violet-300/80" style={{ animationDelay: `${k * 0.12}s` }} />
                ))}
              </span>
              <span className="mt-2 max-w-[80%] rounded-lg bg-[rgba(255,255,255,0.1)] px-2.5 py-1 text-center text-[10.5px] text-[rgba(255,255,255,0.85)] backdrop-blur">“Tell me about a project you’re proud of.”</span>
            </div>
            {/* you tile */}
            <span className="absolute right-2.5 bottom-2.5 flex h-[20%] w-[18%] items-center justify-center rounded-lg border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)]"><UserIcon size={18} className="text-[rgba(255,255,255,0.60)]" /></span>
            {/* controls */}
            <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.15)] text-[#ffffff]"><MicIcon size={13} /></span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.15)] text-[#ffffff]"><VideoIcon size={13} /></span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[#ffffff]"><XIcon size={13} /></span>
            </div>
          </div>
        </div>
        {/* base */}
        <div className="mx-[-6%] h-3 rounded-b-xl bg-gradient-to-b from-[#3a3350] to-[#1c1828]" />
        <div className="mx-auto h-1.5 w-[30%] rounded-b-md bg-[#141020]" />
      </div>
      </div>
      {/* mug */}
      <div className="absolute -bottom-1 -left-3 hidden sm:block">
        <div className="relative h-14 w-11 rounded-b-xl rounded-t-sm bg-gradient-to-b from-[#2b2440] to-[#17121f] shadow-lg ring-1 ring-white/10">
          <img src="/studentos-mark.png" alt="" className="absolute inset-0 m-auto h-6 w-6 object-contain" />
          <span className="absolute top-3 -right-3 h-6 w-4 rounded-r-full border-[3px] border-l-0 border-[#2b2440]" />
        </div>
      </div>
    </div>
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
  return (
    <div className="px-6 py-7 lg:px-8">
      <PracticeHeader active="interview" action={<Button icon={<PlayIcon size={14} />} onClick={() => setHow((v) => !v)}>How it works</Button>} />

      {how && (
        <Card className="land-screen-in mt-5 grid gap-4 p-5 sm:grid-cols-4">
          {[
            ["1", "Pick a type", "Technical, behavioral, job role or your own topics."],
            ["2", "Set role & level", "Questions are written for your role and difficulty."],
            ["3", "Answer", "Type or speak each answer. Questions are read aloud."],
            ["4", "Get feedback", "A score, what to improve and a model answer for each."],
          ].map(([n, h, d]) => (
            <div key={n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[13px] font-bold text-accent">{n}</span>
              <div>
                <p className="text-[13.5px] font-semibold text-white">{h}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{d}</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {/* hero */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-[radial-gradient(120%_140%_at_85%_20%,#6d3fd6,#3b1d7a_42%,#160e2e_78%)] p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-500/20 px-3 py-1 text-[12px] font-medium text-violet-100">
                  <SparkleIcon size={13} /> AI-Powered Mock Interviews
                </span>
                <h2 className="mt-4 text-[28px] leading-[1.12] font-bold tracking-tight text-[#ffffff] sm:text-[34px] lg:text-[30px] 2xl:text-[38px]">
                  Practice. Get Feedback.
                  <br />
                  Improve. <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Get Hired.</span>
                </h2>
                <ul className="mt-5 space-y-2.5">
                  {["Realistic, role-based interview experience", "AI feedback on every answer", "Improve communication, technical & problem-solving skills"].map((x) => (
                    <li key={x} className="flex items-center gap-3 text-[14px] text-[rgba(255,255,255,0.85)]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] text-[#ffffff]"><CheckIcon size={13} /></span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <InterviewScene />
            </div>
          </div>

          {phase === "preparing" ? (
            <Card glow className="mt-6 flex flex-col items-center py-16 text-center">
              <FancyIcon name="bot" tone="violet" size={70} float />
              <p className="mt-5 text-[18px] font-semibold text-white">Preparing your interview…</p>
              <p className="mt-1 text-[13px] text-white/55">Writing {count} {LEVEL_LABEL[level].toLowerCase()} questions for {role}.</p>
            </Card>
          ) : (
            <>
              {/* type */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <h2 className="text-[20px] font-bold text-white sm:text-[22px]">Choose an Interview Type</h2>
                {history.length > 0 && (
                  <a href="#iv-recent" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                    View history <ArrowRightIcon size={13} />
                  </a>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TYPES.map((t) => {
                  const on = kind === t.kind || (t.kind === "role" && kind === "mixed");
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.kind}
                      type="button"
                      onClick={() => setKind(t.kind)}
                      aria-pressed={on}
                      className={cn(
                        "relative flex flex-col items-start justify-start rounded-2xl border p-4 text-left transition sm:p-5 hover:-translate-y-0.5",
                        on ? "border-violet-400 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_10px_30px_-10px_rgba(139,92,246,0.6)]" : "border-white/10 bg-white/[0.03] hover:border-white/25",
                      )}
                    >
                      {on && <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[#ffffff]"><CheckIcon size={13} /></span>}
                      <Icon size={30} className="text-violet-300" strokeWidth={1.6} />
                      <p className="mt-4 text-[15.5px] font-semibold text-white">{t.title}</p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{t.text}</p>
                    </button>
                  );
                })}
              </div>

              {kind === "custom" && (
                <div className="mt-5">
                  <Label htmlFor="iv-topics">Topics you want to be asked about</Label>
                  <input id="iv-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. GST basics, Excel, Tally, my final-year project" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white outline-none focus:border-accent" />
                </div>
              )}

              {/* role, difficulty, start */}
              <div className="mt-6 grid items-end gap-5 lg:grid-cols-[1fr_auto_auto]">
                <div className="min-w-0">
                  <Label htmlFor="iv-role">Select role</Label>
                  <input id="iv-role" list="iv-roles" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Accounts executive, AI/ML intern" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white outline-none focus:border-accent" />
                  <datalist id="iv-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
                </div>
                <div>
                  <Label>Interview difficulty</Label>
                  <div className="flex h-12 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={LEVEL_LABEL[level] === LEVEL_LABEL[l]} className={cn("h-full rounded-lg px-3.5 text-[13px] font-medium transition sm:px-4", LEVEL_LABEL[level] === LEVEL_LABEL[l] ? "bg-violet-500 text-[#ffffff] shadow-[0_6px_20px_-6px_rgba(139,92,246,0.8)]" : "text-white/65 hover:text-white")}>
                        {LEVEL_LABEL[l]}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => void start()} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-[14px] font-semibold text-[#ffffff] shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)] transition hover:brightness-110">
                  <PlayIcon size={15} /> Start Mock Interview <ArrowRightIcon size={14} />
                </button>
              </div>
              {roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roles.map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", role === r ? "border-accent bg-accent/10 text-white" : "border-white/10 text-white/55 hover:border-white/25")}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-white/55">
                <span>Questions:</span>
                {[5, 8, 10].map((n) => (
                  <button key={n} type="button" onClick={() => setCount(n)} className={cn("h-8 w-10 rounded-lg border text-[12.5px] transition", count === n ? "border-accent bg-accent/10 text-white" : "border-white/10 hover:border-white/25")}>{n}</button>
                ))}
                <span className="text-white/40">· about {count * 2} minutes · type or speak each answer</span>
              </div>
              {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
            </>
          )}
        </div>

        {/* right column */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[17px] font-bold text-white">Your Interview Readiness</p>
            <div className="mt-4 flex items-center gap-5">
              <ReadinessRing value={stats?.readiness ?? 0} />
              <div>
                <p className="text-[17px] font-semibold text-white">{!stats ? "Let’s begin!" : stats.readiness >= 80 ? "Job-ready!" : stats.readiness >= 60 ? "Good progress!" : "Keep going!"}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">{!stats ? "Take your first mock interview to see where you stand." : stats.readiness >= 80 ? "Your recent scores are strong. Try a harder level." : "Keep practicing to reach job-ready level."}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[17px] font-bold text-white">Your Stats</p>
            <ul className="mt-3 divide-y divide-white/[0.07]">
              {[
                { icon: MicIcon, label: "Interviews taken", value: stats ? String(stats.taken) : "0" },
                { icon: BarChartIcon, label: "Avg. score", value: stats ? `${stats.avg}%` : "—" },
                { icon: RepeatIcon, label: "Improvement", value: stats?.improvement == null ? "—" : `${stats.improvement > 0 ? "+" : ""}${stats.improvement}%`, tone: stats?.improvement == null ? "" : stats.improvement >= 0 ? "text-emerald-400" : "text-rose-400" },
                { icon: TrophyIcon, label: "Best score", value: stats ? `${stats.best}%` : "—" },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-300"><r.icon size={16} /></span>
                  <span className="flex-1 text-[13.5px] text-white/80">{r.label}</span>
                  <span className={cn("text-[15px] font-bold text-white tabular-nums", r.tone)}>{r.value}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card id="iv-recent" className="scroll-mt-24 p-5">
            <p className="text-[17px] font-bold text-white">Recent Interviews</p>
            {history.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-white/50">Your interviews and scores will show here.</p>
            ) : (
              <ul className="mt-2 max-h-[340px] divide-y divide-white/[0.07] overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => openRecord(h)} className="group flex w-full items-center gap-3 py-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-500 group-hover:text-[#ffffff]"><PlayIcon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-white">{h.role} – {LEVEL_LABEL[h.level]}</span>
                        <span className="block text-[12px] text-white/50">
                          Score: <b className={h.feedback.overall >= 75 ? "text-emerald-400" : h.feedback.overall >= 50 ? "text-amber-300" : "text-rose-400"}>{h.feedback.overall}%</b> · {KIND_LABEL[h.kind]} · {ago(h.at)}
                        </span>
                      </span>
                      <ChevronRightIcon size={15} className="text-white/35" />
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
