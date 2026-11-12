"use client";

/* Premium · AI mock interview (/interview).
   setup → the AI writes questions for the role → an on-screen interviewer (Asha)
   asks each one aloud with lip sync, then the mic turns on and the student
   answers by speaking or typing → the AI scores every answer and gives
   feedback with a model answer → saved to history. */

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/free/parts";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PremiumBadge, PremiumGate } from "@/components/premium/premium-gate";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BotIcon, BriefcaseIcon, BulbIcon, CheckIcon, VideoIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, CodeIcon, LaptopIcon, LayersIcon, MicIcon, PlayIcon, RefreshIcon, RepeatIcon, SparkleIcon, StopIcon, UsersIcon, VolumeIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { AssistantError } from "@/lib/assistant";
import { KIND_LABEL, LANG_LABEL, LEVEL_LABEL, RUBRIC_LABEL, STYLE_LABEL, codeEvaluate, type PracticeItem, type InterviewLang, type InterviewStyle, MAX_SAVED, interviewStats, evaluate, makeQuestions, suggestRoles, type Feedback, type InterviewKind, type InterviewLevel, type InterviewRecord, type Question } from "@/lib/interview";
import { usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";
import { TODAY, addDays, addMinutes, cn, fmt as dfmt, uid } from "@/lib/utils";
import { stopSpeaking } from "@/lib/tts";
import { createTalker, hasHindiVoice, type Talker } from "@/lib/talker";
import { VOICE_LANGS, startRecording, transcribe, type Recorder } from "@/lib/voice";
import { Interviewer, MicBars } from "@/components/interview/interviewer";
import { CodingRound, type RoundResult } from "@/components/interview/coding-round";
import { CodingReport } from "@/components/interview/coding-report";
import { PROBLEMS } from "@/lib/coding/problems";
import { saveRecording } from "@/lib/recordings";
import { wantsCoding } from "@/lib/coding/use-coding";
import { LANG_LABEL as CODE_LANG_LABEL, type Lang, type Level, type Problem } from "@/lib/coding/types";
import type { StudySession } from "@/lib/types";

type Phase = "setup" | "preparing" | "live" | "scoring" | "result" | "coding" | "coding-scoring";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const INTERVIEWER = "Asha";
const LINES: Record<InterviewLang, { hello: string; lead: string[] }> = {
  en: { hello: `Hi, I’m ${INTERVIEWER}. Let’s begin.`, lead: ["Okay, thank you.", "Got it, thanks.", "Alright.", "Thank you. Next one.", "Okay."] },
  hi: { hello: "नमस्ते, मैं आशा हूँ। चलिए शुरू करते हैं।", lead: ["ठीक है, धन्यवाद।", "अच्छा, समझ गई।", "बहुत बढ़िया।", "धन्यवाद। अगला सवाल।", "ठीक है।"] },
};

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

function ago(at: number) {
  const d = Math.floor((Date.now() - at) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const TRACKS: { kind: string; title: string; text: string; icon: typeof LaptopIcon; soon?: boolean }[] = [
  { kind: "coding", title: "Coding", text: "A real problem in a live code editor", icon: CodeIcon },
  { kind: "technical", title: "Technical", text: "Core concepts, answered aloud", icon: BulbIcon },
  { kind: "hr", title: "Behavioural", text: "STAR answers, with follow-ups", icon: UsersIcon },
  { kind: "design", title: "System design", text: "Whiteboard a small service", icon: LayersIcon, soon: true },
  { kind: "role", title: "Role-based", text: "A full round for one job role", icon: BriefcaseIcon },
];
const CODE_MINUTES = [20, 30, 45];
const RecordDotIcon = ({ size = 14, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </svg>
);
const CODE_LEVEL: Record<string, Level> = { beginner: "Easy", intermediate: "Medium", advanced: "Hard" };
const DURATIONS = [{ min: 10, count: 5 }, { min: 15, count: 8 }, { min: 20, count: 10 }];
const DIFF_LABEL: Record<"beginner" | "intermediate" | "advanced", string> = { beginner: "Easy", intermediate: "Medium", advanced: "Hard" };

/* One example question per type, typed out on the setup screen. */
const EXAMPLE: Record<string, string> = {
  coding: "Merge overlapping intervals. Explain your plan, code it, run the tests, then answer follow-ups.",
  technical: "Walk me through how you would find a duplicate in a list of a million numbers.",
  hr: "Tell me about a time a team project went wrong. What did you do?",
  role: "What would you check first if this month’s numbers don’t match last month’s?",
  custom: "Questions come only from the topics you type below.",
};

export default function InterviewPage() {
  const { premium, loading } = usePremium();
  const { state, actions } = useStore();
  const roles = suggestRoles(state.setup);
  const history = state.interviews ?? [];

  const [phase, setPhase] = useState<Phase>("setup");
  const [role, setRole] = useState(roles[0] ?? "");
  const [kind, setKind] = useState<InterviewKind>(() => (wantsCoding(state) ? "coding" : "technical"));
  const [level, setLevel] = useState<InterviewLevel>("beginner");
  const [topics, setTopics] = useState("");
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
  const [talker, setTalker] = useState<Talker | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [total, setTotal] = useState(0);
  const micRef = useRef<() => void>(() => {});
  const [ilang, setIlang] = useState<InterviewLang>("en");
  const [noHindi, setNoHindi] = useState(false);
  const [style, setStyle] = useState<InterviewStyle>("neutral");
  const [customRole, setCustomRole] = useState(false);
  const [histTab, setHistTab] = useState<"all" | InterviewKind>("all");
  const [checking, setChecking] = useState<MediaStream | null>(null);
  const [codeMin, setCodeMin] = useState(30);
  const [codeLang, setCodeLang] = useState<Lang>("python");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [recordOn, setRecordOn] = useState(false);
  const voice = readAloud && handsFree;
  const setVoice = (on: boolean) => {
    setReadAloud(on);
    setHandsFree(on);
  };
  const checkMic = async () => {
    if (checking) {
      checking.getTracks().forEach((t) => t.stop());
      setChecking(null);
      return;
    }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      setChecking(st);
      setTimeout(() => {
        st.getTracks().forEach((t) => t.stop());
        setChecking((c) => (c === st ? null : c));
      }, 8000);
    } catch {
      actions.toast("Microphone isn’t available. Allow mic access in your browser.");
    }
  };
  useEffect(() => {
    const t = createTalker({ voice: "hannah", lang: ilang });
    setTalker(t);
    return () => t.dispose();
  }, [ilang]);
  useEffect(() => {
    if (ilang === "hi") void hasHindiVoice().then((ok) => setNoHindi(!ok));
    else setNoHindi(false);
  }, [ilang]);
  const quiet = () => {
    talker?.stop();
    setSpeaking(false);
  };
  const ask = async (k: number, again = false) => {
    const q = questions[k];
    if (!talker || !q) return;
    const L = LINES[ilang];
    const text = again ? q.q : k === 0 ? `${L.hello} ${q.q}` : `${L.lead[k % L.lead.length]} ${q.q}`;
    if (questions[k + 1]) talker.prefetch(questions[k + 1].q);
    setSpeaking(true);
    const r = await talker.say(text);
    setSpeaking(false);
    return r;
  };

  // timer for the current question
  useEffect(() => {
    if (phase !== "live") return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, i]);
  // whole-interview clock
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setTotal((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  // the interviewer asks each question, then (hands-free) starts listening
  useEffect(() => {
    if (phase !== "live" || !questions[i] || !talker) return;
    if (!readAloud) return;
    let live = true;
    void ask(i).then((r) => {
      if (live && r === "done" && handsFree && !(answers[i] ?? "").trim()) micRef.current();
    });
    return () => {
      live = false;
    };
  }, [phase, i, talker]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);

  const profile = [state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year, (state.setup?.skills.familiar ?? []).join(", ")].filter(Boolean).join(" · ");

  const start = async () => {
    if (!role.trim() && kind !== "coding") return setError("Write the role you’re preparing for.");
    if (kind === "custom" && !topics.trim()) return setError("Write the topics you want to be asked about.");
    setError("");
    checking?.getTracks().forEach((t) => t.stop());
    setChecking(null);
    if (kind === "coding") {
      const want = CODE_LEVEL[level] ?? "Easy";
      const done = new Set(history.map((h) => h.coding?.problemId).filter(Boolean));
      const pool = PROBLEMS.filter((p) => p.level === want);
      const fresh = pool.filter((p) => !done.has(p.id));
      const list = fresh.length ? fresh : pool;
      setProblem(list[Math.floor(Math.random() * list.length)]);
      setRoundKey((k) => k + 1);
      setPhase("coding");
      return;
    }
    setPhase("preparing");
    try {
      const qs = await makeQuestions({ role: role.trim(), kind, level, count, profile, style, topics: kind === "custom" ? topics.trim() : undefined, lang: ilang });
      if (!qs.length) throw new AssistantError("Couldn’t prepare questions. Try again.");
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setI(0);
      setTotal(0);
      setPhase("live");
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t prepare questions. Try again.");
      setPhase("setup");
    }
  };

  const finishCoding = async (r: RoundResult) => {
    if (!problem) return;
    setPhase("coding-scoring");
    try {
      const cand = PROBLEMS.filter((p) => p.id !== problem.id).map((p) => ({ id: p.id, title: p.title, level: p.level, topics: p.topics }));
      const ev = await codeEvaluate({ problem: { title: problem.title, statement: problem.statement, level: problem.level }, code: r.code, lang: codeLang, passed: r.passed, total: r.total, seconds: r.seconds, level, style, ilang, history: r.chat, events: r.events, candidates: cand });
      const record: InterviewRecord = {
        id: uid("iv"),
        at: Date.now(),
        role: role.trim() || "Coding round",
        kind: "coding",
        level,
        questions: [{ q: problem.title, focus: problem.topics.join(", ") }],
        answers: [r.code],
        feedback: { overall: ev.overall, verdict: ev.verdict, summary: ev.summary, strengths: [], tips: [], items: [] },
        lang: ilang,
        style,
        coding: {
          problemId: problem.id,
          title: problem.title,
          lang: codeLang,
          code: r.code,
          passed: r.passed,
          total: r.total,
          seconds: r.seconds,
          rubric: ev.rubric.map((x) => ({ ...x, label: RUBRIC_LABEL[x.key] })),
          moments: ev.moments,
          practice: ev.practice,
          transcript: r.chat,
        },
      };
      const saved = r.audio ? await saveRecording(record.id, r.audio) : false;
      if (r.presence) record.coding!.presence = r.presence;
      if (saved) {
        record.coding!.recorded = true;
        record.coding!.recStart = r.recStart ?? 0;
      }
      actions.patch({ interviews: [record, ...history].slice(0, MAX_SAVED) });
      setResult(record);
      setPhase("result");
    } catch (e) {
      actions.toast(e instanceof AssistantError ? e.message : "Couldn’t score the round. Your code is safe — try ending again.");
      setPhase("coding");
    }
  };

  /** Practice items go into tomorrow's plan, one after another from 6 pm. */
  const addPractice = (items: PracticeItem[]) => {
    const date = addDays(TODAY, 1);
    let at = "18:00";
    for (const p of items) {
      const session: StudySession = {
        id: uid("s"),
        goalId: "",
        title: `Interview practice · ${p.title}`,
        short: p.title,
        summary: "Interview practice",
        objective: p.detail,
        week: 1,
        date,
        start: at,
        minutes: p.minutes,
        priority: "Core",
        status: "planned",
        tasks: p.problemId ? [{ id: uid("t"), label: `Solve ${PROBLEMS.find((x) => x.id === p.problemId)?.title ?? "the problem"} in Coding practice`, done: false }] : [],
        notes: "",
        countsToward: "Mock interviews",
      };
      actions.addSession(session);
      at = addMinutes(at, p.minutes + 10);
    }
    actions.toast(items.length === 1 ? `Added to your plan for tomorrow, ${dfmt.time("18:00")}.` : `Added ${items.length} sessions to your plan for tomorrow from ${dfmt.time("18:00")}.`);
  };

  const setAnswer = (text: string) => setAnswers((a) => a.map((x, k) => (k === i ? text : x)));

  const mic = async (auto = false) => {
    if (rec) {
      rec.stop();
      setRec(null);
      return;
    }
    try {
      quiet();
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
      // the automatic mic just switches itself off; a tap on the mic explains why
      if (auto) setHandsFree(false);
      else actions.toast("Microphone isn’t available. Allow mic access or type your answer.");
    }
  };

  micRef.current = () => {
    if (!rec && !hearing) void mic(true);
  };

  const finish = async (final: string[]) => {
    rec?.cancel();
    setRec(null);
    quiet();
    setPhase("scoring");
    try {
      const fb: Feedback = await evaluate({ role: role.trim(), kind, level, style, topics: kind === "custom" ? topics.trim() : undefined, lang: ilang, items: questions.map((q, k) => ({ q: q.q, a: final[k] ?? "" })) });
      const record: InterviewRecord = { id: uid("iv"), at: Date.now(), role: role.trim(), kind, level, questions, answers: final, feedback: fb, lang: ilang, style, ...(kind === "custom" && topics.trim() ? { topics: topics.trim() } : {}) };
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
    quiet();
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

  /* ---------- coding round ---------- */
  if ((phase === "coding" || phase === "coding-scoring") && problem) {
    if (phase === "coding-scoring")
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="ui-live" aria-hidden />
          <p className="text-[16px] font-semibold text-white">Asha is writing your feedback</p>
          <p className="max-w-[360px] text-[13px] text-white/55">She’s reading your code, the tests and what you said. This takes a few seconds.</p>
        </div>
      );
    return (
      <CodingRound
        key={roundKey}
        problem={problem}
        lang={codeLang}
        title={`${role.trim() || "Coding"} · Coding round`}
        sub={`${problem.level} · ${CODE_LANG_LABEL[codeLang]} · ${STYLE_LABEL[style]} interviewer`}
        minutes={codeMin}
        ilang={ilang}
        voice={voice}
        style={style}
        talker={talker}
        camera={cameraOn}
        record={recordOn}
        onQuit={() => setPhase("setup")}
        onEnd={(r) => void finishCoding(r)}
      />
    );
  }

  /* ---------- live ---------- */
  if (phase === "live" || phase === "scoring") {
    const q = questions[i];
    const words = (answers[i] ?? "").trim().split(/\s+/).filter(Boolean).length;
    const status = phase === "scoring" ? "scoring" : speaking ? "asking" : hearing ? "writing" : rec ? "listening" : "waiting";
    return (
      <div className="px-6 py-6 lg:px-8">
        {/* top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-white">Interview in progress</p>
              <p className="truncate text-[12.5px] text-white/55">{role} · {KIND_LABEL[kind]} · {LEVEL_LABEL[level]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-white/60 tabular-nums">{fmt(total)}</span>
            <button type="button" disabled={phase === "scoring"} onClick={() => window.confirm("End the interview now? Unanswered questions count as skipped.") && finish(answers)} className="h-9 rounded-lg border border-rose-400/40 px-3.5 text-[12.5px] font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40">
              End interview
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {/* video */}
            <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9] rounded-2xl border border-white/[0.08] bg-[#0b0a14] shadow-[0_20px_60px_-30px_rgba(124,58,237,0.6)]">
              <Interviewer talker={talker} listening={status === "listening"} />
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
                <span className={cn("h-2 w-2 rounded-full", speaking ? "bg-violet-400" : "bg-white/30")} />
                <span className="text-[12.5px] font-medium text-white">{INTERVIEWER} · AI interviewer</span>
                {speaking && (
                  <span className="ml-1 flex h-3 items-end gap-[2px]" aria-hidden>
                    {[0, 1, 2, 3].map((k) => <span key={k} className="iv-eq w-[2px] rounded-full bg-violet-300" style={{ animationDelay: `${k * 0.12}s` }} />)}
                  </span>
                )}
              </div>
              <span className="absolute top-3 right-3 rounded-lg bg-black/40 px-2.5 py-1.5 text-[12px] text-white/75 backdrop-blur">
                Question {i + 1} of {questions.length}
              </span>
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                <button type="button" onClick={() => void mic()} disabled={hearing || phase === "scoring"} title={rec ? "Done answering" : "Answer by voice"} className={cn("flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur transition", rec ? "border-rose-400/60 bg-rose-500 text-[#ffffff]" : "border-white/15 bg-black/45 text-white hover:border-accent/60")}>
                  {rec ? <StopIcon size={16} /> : <MicIcon size={18} />}
                </button>
                <button type="button" onClick={() => { const on = !readAloud; setReadAloud(on); if (on) void ask(i, true); else quiet(); }} title={readAloud ? "Mute interviewer" : "Unmute interviewer"} className={cn("flex h-12 w-12 items-center justify-center rounded-full border bg-black/45 backdrop-blur transition", readAloud ? "border-white/15 text-white" : "border-white/10 text-white/40")}>
                  <VolumeIcon size={18} />
                </button>
                <button type="button" onClick={() => void ask(i, true)} disabled={speaking || phase === "scoring"} title="Ask again" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:border-accent/60 disabled:opacity-40">
                  <RepeatIcon size={17} />
                </button>
                <button type="button" disabled={phase === "scoring"} onClick={() => window.confirm("End the interview now? Unanswered questions count as skipped.") && finish(answers)} title="End interview" className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-[#ffffff] transition hover:bg-rose-600 disabled:opacity-40">
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            {/* question + answer */}
            <div className="mt-4 rounded-2xl border border-accent/30 bg-[#0f0f13] p-5 shadow-[0_0_0_1px_rgba(167,139,250,0.08),0_0_40px_-18px_rgba(167,139,250,0.7)] sm:p-6">
              {phase === "scoring" ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <FancyIcon name="sparkle" tone="violet" size={56} float />
                  <p className="mt-4 text-[17px] font-semibold text-white">Scoring your interview…</p>
                  <p className="mt-1 text-[13px] text-white/55">Reading every answer and writing feedback. About 10–20 seconds.</p>
                </div>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-[12.5px] font-medium text-accent">
                    <BotIcon size={14} /> {INTERVIEWER} asks{q.focus ? ` · ${q.focus}` : ""}
                  </p>
                  <p key={i} className="land-screen-in mt-2 text-[18px] leading-snug font-semibold text-white sm:text-[20px]">{q.q}</p>

                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    {status === "listening" ? (
                      <>
                        <MicBars stream={rec?.stream ?? null} />
                        <p className="mt-1 text-center text-[12.5px] text-white/60">Listening… speak your answer, then press <b className="text-white">Done</b>.</p>
                      </>
                    ) : (
                      <p className="flex h-10 items-center justify-center gap-2 text-center text-[12.5px] text-white/55">
                        {status === "asking" && <>
                          <span className="flex h-3 items-end gap-[2px]" aria-hidden>{[0, 1, 2, 3, 4].map((k) => <span key={k} className="iv-eq w-[3px] rounded-full bg-violet-400" style={{ animationDelay: `${k * 0.1}s` }} />)}</span>
                          {INTERVIEWER} is asking…
                        </>}
                        {status === "writing" && "Writing down your answer…"}
                        {status === "waiting" && (answers[i] ? "Add more, or go to the next question." : "Press the mic to answer by voice, or type below.")}
                      </p>
                    )}
                  </div>

                  <textarea
                    ref={box}
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={4}
                    placeholder="Your answer appears here. You can also type or edit it."
                    className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[14.5px] leading-relaxed text-white placeholder:text-white/35 outline-none focus:border-accent"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void mic()} disabled={hearing} className={cn("relative flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition", rec ? "bg-rose-500 text-[#ffffff]" : "border border-white/15 text-white hover:border-accent/50")}>
                        {rec ? <StopIcon size={14} /> : <MicIcon size={15} />}
                        {hearing ? "Writing it down…" : rec ? "Done" : "Speak answer"}
                      </button>
                      <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#121216] px-2 text-[12.5px] text-white/75 outline-none" aria-label="Language you speak in">
                        {VOICE_LANGS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={next}>Skip</Button>
                      <Button variant="primary" onClick={next} disabled={!(answers[i] ?? "").trim() || !!rec || hearing}>
                        {i < questions.length - 1 ? "Next question" : "Finish & get score"} <ArrowRightIcon size={14} />
                      </Button>
                    </div>
                  </div>
                  {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
                </>
              )}
            </div>
          </div>

          {/* side */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f11] p-5">
              <p className="text-[13.5px] font-semibold text-white">This answer</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-[11.5px] text-white/45">Time</p>
                  <p className={cn("mt-1 text-[20px] font-semibold tabular-nums", secs > 150 ? "text-amber-300" : "text-white")}>{fmt(secs)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <p className="text-[11.5px] text-white/45">Words</p>
                  <p className={cn("mt-1 text-[20px] font-semibold tabular-nums", words >= 60 ? "text-emerald-300" : "text-white")}>{words}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (words / 120) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[11.5px] text-white/45">Good answers are usually 60–150 words, about 1–2 minutes.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f11] p-5">
              <p className="text-[13.5px] font-semibold text-white">Questions</p>
              <ol className="mt-3 space-y-1.5">
                {questions.map((x, k) => (
                  <li key={k} className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12.5px]", k === i ? "bg-[var(--color-plum)] text-white" : "text-white/55")}>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold", k < i ? "bg-emerald-400/20 text-emerald-300" : k === i ? "bg-accent text-[#120826]" : "bg-white/[0.06]")}>
                      {k < i ? <CheckIcon size={11} /> : k + 1}
                    </span>
                    <span className="truncate">{x.focus || `Question ${k + 1}`}</span>
                    {k < i && !(answers[k] ?? "").trim() && <span className="ml-auto text-[11px] text-white/35">skipped</span>}
                  </li>
                ))}
              </ol>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#0f0f11] p-4">
              <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#a78bfa]" />
              <span>
                <span className="block text-[13px] font-medium text-white">Talk like a real interview</span>
                <span className="mt-0.5 block text-[12px] text-white/50">After {INTERVIEWER} asks, the mic turns on by itself.</span>
              </span>
            </label>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
              <p className="text-[12.5px] font-semibold text-cyan-300">Tip</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">Answer with a short real example: the situation, what you did, and the result.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */
  if (phase === "result" && result?.coding) {
    const prevRound = history.find((h) => h.kind === "coding" && h.id !== result.id && h.at < result.at);
    return (
      <CodingReport
        record={result}
        prev={prevRound ? prevRound.feedback.overall : null}
        onBack={() => setPhase("setup")}
        onRetry={() => {
          const p = PROBLEMS.find((x) => x.id === result.coding?.problemId);
          if (!p) return setPhase("setup");
          setCodeLang(result.coding!.lang);
          setProblem(p);
          setRoundKey((k) => k + 1);
          setPhase("coding");
        }}
        onAdd={addPractice}
      />
    );
  }
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
    setKind(h.kind === "mixed" ? "role" : h.kind);
    setLevel(h.level === "fresher" ? "beginner" : h.level === "experienced" ? "intermediate" : h.level);
    setIlang(h.lang ?? "en");
    setTopics(h.topics ?? "");
    setCount(h.questions.length);
    setStyle(h.style ?? "neutral");
    setPhase("result");
  };
  const byKind = (["coding", "technical", "hr", "role", "custom"] as const)
    .map((k) => {
      const list = history.filter((h) => (h.kind === "mixed" ? "role" : h.kind) === k).slice(0, 5);
      return { k, n: list.length, avg: list.length ? Math.round(list.reduce((a, h) => a + h.feedback.overall, 0) / list.length) : null };
    })
    .filter((x) => x.avg != null);
  const untried = TRACKS.find((t) => !t.soon && !history.some((h) => h.kind === t.kind));
  const weakest = [...byKind].sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0];
  const nextKind: InterviewKind | null = untried ? untried.kind as InterviewKind : weakest ? weakest.k : null;
  const ready = stats?.readiness ?? 0;
  const mins = kind === "coding" ? codeMin : DURATIONS.find((d) => d.count === count)?.min ?? count * 2;
  const shown = histTab === "all" ? history : history.filter((h) => (h.kind === "mixed" ? "role" : h.kind) === histTab);
  const roleChips = [...new Set([...(role && !customRole && !roles.includes(role) ? [role] : []), ...roles])].slice(0, 6);
  const seg = (on: boolean) => cn("h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium transition-colors", on ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/50 hover:text-white");
  return (
    <div className="px-6 py-7 lg:px-8">
      <PracticeHeader active="interview" />

      {/* hero */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0d0b16] px-6 py-6 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/3 h-72 w-[38rem] rounded-full bg-violet-600/25 blur-[90px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2.5 py-1 text-[11.5px] font-semibold text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" /> New · AI interviewer
            </span>
            <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.02em] text-white sm:text-[34px]">Mock Interviews</h1>
            <p className="mt-1 max-w-[560px] text-[14px] text-white/60">Practise real interview rounds out loud with {INTERVIEWER}, our AI interviewer. Get a score for every answer and a model answer to learn from.</p>
          </div>
          <a href="#iv-history" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium text-white/80 transition hover:border-white/25 hover:text-white">
            <ClockIcon size={14} /> Interview history
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
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
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-white">Set up your next round</h2>
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11.5px] text-white/55 tabular-nums">~{mins} min</span>
              </div>

              {/* tracks */}
              <div role="radiogroup" aria-label="Interview type" className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {TRACKS.map((t) => {
                  const on = !t.soon && kind === t.kind;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.kind}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={t.soon}
                      onClick={() => setKind(t.kind as InterviewKind)}
                      className={cn(
                        "relative flex flex-col items-start rounded-xl border p-3.5 text-left transition",
                        on ? "border-cyan-400/70 bg-cyan-400/[0.07] shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_10px_30px_-18px_rgba(34,211,238,0.8)]" : "border-white/[0.08] bg-white/[0.015] hover:border-white/20",
                        t.soon && "cursor-not-allowed opacity-55 hover:border-white/[0.08]",
                      )}
                    >
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", on ? "bg-cyan-400/20 text-cyan-300" : "bg-violet-500/15 text-violet-300")}>
                        <Icon size={16} />
                      </span>
                      <span className="mt-3 text-[13.5px] font-semibold text-white">{t.title}</span>
                      <span className="mt-0.5 text-[11.5px] leading-snug text-white/50">{t.text}</span>
                      {t.soon && <span className="absolute top-2.5 right-2.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">Soon</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p key={kind} className="explain-in text-[12px] text-white/45">
                  Example: <span className="text-white/65 italic">{EXAMPLE[kind === "mixed" ? "role" : kind]}</span>
                </p>
                <button type="button" onClick={() => setKind(kind === "custom" ? "technical" : "custom")} className={cn("text-[12px] font-medium transition", kind === "custom" ? "text-cyan-300" : "text-white/50 hover:text-white")}>
                  {kind === "custom" ? "✓ Using my own topics" : "+ Ask from my own topics"}
                </button>
              </div>
              {kind === "custom" && (
                <input value={topics} onChange={(e) => setTopics(e.target.value)} aria-label="Your topics" placeholder="e.g. GST basics, Excel, Tally, my final-year project" className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-field px-3.5 text-[13.5px] text-white outline-none focus:border-cyan-400/70" />
              )}

              {/* role */}
              <p className="mt-5 mb-2 text-[12px] font-semibold text-white/60">Target role</p>
              <div className="flex flex-wrap gap-1.5">
                {roleChips.map((r) => {
                  const on = role === r && !customRole;
                  return (
                    <button key={r} type="button" onClick={() => { setRole(r); setCustomRole(false); }} className={cn("flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] transition", on ? "border-cyan-400/70 bg-cyan-400/[0.08] text-cyan-200" : "border-white/10 text-white/70 hover:border-white/25 hover:text-white")}>
                      {on && <CheckIcon size={12} />} {r}
                    </button>
                  );
                })}
                <button type="button" onClick={() => { setCustomRole(true); setRole(""); }} className={cn("h-8 rounded-lg border border-dashed px-3 text-[12.5px] transition", customRole ? "border-cyan-400/70 text-cyan-200" : "border-white/15 text-white/60 hover:text-white")}>
                  + Custom role
                </button>
              </div>
              {customRole && (
                <input autoFocus value={role} onChange={(e) => setRole(e.target.value)} aria-label="Your role" placeholder="e.g. Accounts executive, ML intern, Bank PO" className="mt-2 h-10 w-full max-w-[420px] rounded-lg border border-white/10 bg-field px-3.5 text-[13.5px] text-white outline-none focus:border-cyan-400/70" />
              )}

              {/* difficulty · duration · style */}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-white/60">Difficulty</p>
                  <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                    {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                      <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)} className={seg(level === l)}>{DIFF_LABEL[l]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-white/60">Duration</p>
                  <div role="radiogroup" aria-label="Duration" className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                    {kind === "coding"
                      ? CODE_MINUTES.map((m) => (
                          <button key={m} type="button" role="radio" aria-checked={codeMin === m} onClick={() => setCodeMin(m)} className={seg(codeMin === m)}>{m} min</button>
                        ))
                      : DURATIONS.map((d) => (
                          <button key={d.min} type="button" role="radio" aria-checked={count === d.count} onClick={() => setCount(d.count)} title={`${d.count} questions`} className={seg(count === d.count)}>{d.min} min</button>
                        ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-white/60">Interviewer style</p>
                  <div role="radiogroup" aria-label="Interviewer style" className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                    {(["friendly", "neutral", "tough"] as const).map((x) => (
                      <button key={x} type="button" role="radio" aria-checked={style === x} onClick={() => setStyle(x)} className={seg(style === x)}>{STYLE_LABEL[x]}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* voice · language */}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-white/70">
                <label className="flex cursor-pointer items-center gap-2">
                  <MicIcon size={14} className="text-white/45" /> Voice interview
                  <button type="button" role="switch" aria-checked={voice} onClick={() => setVoice(!voice)} className={cn("relative h-5 w-9 rounded-full transition", voice ? "bg-cyan-400" : "bg-white/15")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", voice ? "left-[18px]" : "left-0.5")} />
                  </button>
                </label>
                {kind === "coding" &&
                  ([
                    { on: cameraOn, set: setCameraOn, label: "Camera on", Icon: VideoIcon },
                    { on: recordOn, set: setRecordOn, label: "Save recording", Icon: RecordDotIcon },
                  ] as const).map(({ on, set, label, Icon }) => (
                    <label key={label} className="flex cursor-pointer items-center gap-2">
                      <Icon size={14} className="text-white/45" /> {label}
                      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={cn("relative h-5 w-9 rounded-full transition", on ? "bg-cyan-400" : "bg-white/15")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
                      </button>
                    </label>
                  ))}
                {kind === "coding" && (
                  <div className="flex items-center gap-2">
                    <CodeIcon size={14} className="text-white/45" /> Language
                    <div role="radiogroup" aria-label="Coding language" className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                      {(["python", "javascript"] as const).map((l) => (
                        <button key={l} type="button" role="radio" aria-checked={codeLang === l} onClick={() => setCodeLang(l)} className={cn(seg(codeLang === l), "h-7 px-2.5")}>{CODE_LANG_LABEL[l]}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <VolumeIcon size={14} className="text-white/45" /> {INTERVIEWER} speaks in
                  <div role="radiogroup" aria-label="Interview language" className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                    {(["en", "hi"] as const).map((l) => (
                      <button key={l} type="button" role="radio" aria-checked={ilang === l} onClick={() => { setIlang(l); setLang(l === "hi" ? "hi-IN" : "en-IN"); }} className={cn(seg(ilang === l), "h-7 px-2.5")}>{LANG_LABEL[l]}</button>
                    ))}
                  </div>
                </div>
              </div>
              {noHindi && <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[12.5px] text-amber-200">This device has no Hindi voice, so {INTERVIEWER} can’t speak Hindi here. Questions will still show in Hindi. Chrome or Edge on a laptop, or Android, usually have one.</p>}
              {checking && (
                <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                  <MicBars stream={checking} />
                  <p className="mt-1 text-center text-[12px] text-white/55">Say something. If the bars move, your mic works.</p>
                </div>
              )}
              {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/[0.07] pt-5">
                <button type="button" onClick={() => void start()} disabled={(!role.trim() && kind !== "coding") || (kind === "custom" && !topics.trim())} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-[13.5px] font-semibold text-[#06141a] transition hover:bg-cyan-300 disabled:opacity-40">
                  <PlayIcon size={13} /> Start interview
                </button>
                <button type="button" onClick={() => void checkMic()} className="flex h-10 items-center gap-2 rounded-xl border border-white/12 px-3.5 text-[13px] font-medium text-white/80 transition hover:border-white/25 hover:text-white">
                  <MicIcon size={14} /> {checking ? "Stop mic check" : "Check mic"}
                </button>
                <p className="min-w-[200px] flex-1 text-[11.5px] leading-snug text-white/45">
                  {kind === "coding" ? `One ${CODE_LEVEL[level]} problem, ${codeMin} minutes · ` : `${count} questions · `}{kind === "coding" ? `${voice ? `${INTERVIEWER} talks to you; tap the mic to answer and think out loud.` : "Type your answers to Asha."}${cameraOn || recordOn ? " Camera and recording stay on this device — nothing is uploaded." : ""}` : voice ? `${INTERVIEWER} asks out loud and the mic turns on by itself.` : "You read the questions and type or speak your answers."} Your voice is only used to write down your answer.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* readiness */}
        <div>
          <Card className="h-full p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-white">Interview readiness</p>
              {stats && <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/50">Last {Math.min(history.length, 3)} rounds</span>}
            </div>
            {!stats ? (
              <div className="mt-5 flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-white/[0.07]">
                  <span className="text-[22px] font-semibold text-white/30">—</span>
                </div>
                <p className="mt-4 text-[13.5px] font-medium text-white">No score yet</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">Take your first round. Your readiness score and your strong and weak areas will show here.</p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-[84px] w-[84px] shrink-0">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-white/10" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-cyan-400" strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 15.5} strokeDashoffset={2 * Math.PI * 15.5 * (1 - ready / 100)} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[24px] font-bold text-white tabular-nums">{ready}</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{ready >= 75 ? "Ready for real rounds" : ready >= 50 ? "Getting close" : "Keep practising"}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-white/50">
                      {stats.improvement != null && stats.improvement > 0 ? `Up ${stats.improvement} points since your first round. ` : ""}
                      {stats.taken} round{stats.taken === 1 ? "" : "s"} taken · best {stats.best}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3.5">
                  {byKind.map((x) => (
                    <div key={x.k}>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/65">{KIND_LABEL[x.k]}</span>
                        <span className="font-semibold text-white tabular-nums">{x.avg}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${x.avg}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {nextKind && stats && (
              <button type="button" onClick={() => setKind(nextKind)} className="mt-5 flex w-full items-start gap-2.5 rounded-xl border border-violet-400/25 bg-violet-500/[0.1] p-3 text-left transition hover:border-violet-400/50">
                <SparkleIcon size={15} className="mt-0.5 shrink-0 text-violet-300" />
                <span className="text-[12px] leading-snug text-white/75">
                  <b className="text-white">Next:</b> a {KIND_LABEL[nextKind].toLowerCase()} round — {untried ? "you haven’t tried one yet." : "your weakest area right now."} <span className="text-violet-300">Set it up →</span>
                </span>
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* history */}
      <div id="iv-history" className="mt-8 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-white">Interview history</h2>
          <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {(["all", "coding", "technical", "hr", "role", "custom"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setHistTab(t)} className={seg(histTab === t)}>{t === "all" ? "All" : KIND_LABEL[t]}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <Card className="mt-3 p-6 text-center text-[13px] text-white/50">{history.length ? "No rounds of this type yet." : "Your rounds and scores will show here after your first interview."}</Card>
        ) : (
          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {shown.map((h) => (
              <button key={h.id} type="button" onClick={() => openRecord(h)} className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5 text-left transition hover:border-white/20">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums", h.feedback.overall >= 75 ? "bg-emerald-400/10 text-emerald-400" : h.feedback.overall >= 50 ? "bg-amber-400/10 text-amber-300" : "bg-rose-500/10 text-rose-400")}>{h.feedback.overall}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-white group-hover:text-cyan-200">{h.role}</span>
                  <span className="block text-[11.5px] text-white/45">{KIND_LABEL[h.kind]} · {LEVEL_LABEL[h.level]} · {ago(h.at)}</span>
                </span>
                <ChevronRightIcon size={14} className="text-white/30 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
