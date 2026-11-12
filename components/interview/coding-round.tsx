"use client";

/* A live coding interview with Asha: she asks for the approach, the student codes
   in the editor (run against the examples, submit against every test), then she
   asks two follow-ups about the solution. Everything that happens is logged with a
   time so the feedback report can point at real moments. */

import { useEffect, useRef, useState } from "react";
import { CodeEditor, type EditKind } from "@/components/coding/code-editor";
import { MicBars } from "@/components/interview/interviewer";
import { BulbIcon, CheckIcon, ClockIcon, MicIcon, PlayIcon, RepeatIcon, SendIcon, StopIcon, XIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { AssistantError } from "@/lib/assistant";
import { runCode, show } from "@/lib/coding/runner";
import { LANG_LABEL, type Lang, type Problem, type RunResult } from "@/lib/coding/types";
import { codeChat, codeFollowups, type ChatLine, type InterviewLang, type InterviewStyle, type RoundEvent } from "@/lib/interview";
import { watchPresence, type PresenceSummary } from "@/lib/presence";
import type { Talker } from "@/lib/talker";
import { cn } from "@/lib/utils";
import { startRecording, transcribe, type Recorder } from "@/lib/voice";

export type Stage = "intro" | "problem" | "followup" | "wrap";
const STAGES: { key: Stage; label: string }[] = [
  { key: "intro", label: "Intro" },
  { key: "problem", label: "Problem" },
  { key: "followup", label: "Follow-ups" },
  { key: "wrap", label: "Wrap-up" },
];

export type RoundResult = { code: string; passed: number; total: number; seconds: number; chat: ChatLine[]; events: RoundEvent[]; presence?: PresenceSummary; audio?: Blob; recStart?: number };

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const LINES = {
  en: {
    hello: (t: string) => `Hi, I’m Asha. Today’s problem is ${t}. Take a moment to read it. Before you code, what’s your approach, and what’s its time complexity?`,
    pass: "Nice, every test passes. Two quick follow-ups.",
    fail: (p: number, n: number) => `${p} of ${n} tests pass. Look at the failing case and try again.`,
    done: "That’s all from me. Thanks! Press End interview to see your feedback.",
    nudge: "Go ahead and code it. Run it on the examples when you’re ready.",
  },
  hi: {
    hello: (t: string) => `नमस्ते, मैं आशा हूँ। आज का problem है ${t}। पहले इसे ध्यान से पढ़िए। Code लिखने से पहले बताइए, आपका approach क्या है और उसकी time complexity क्या होगी?`,
    pass: "बहुत बढ़िया, सारे tests pass हो गए। दो छोटे follow-up सवाल।",
    fail: (p: number, n: number) => `${n} में से ${p} tests pass हुए। Fail वाला case देखिए और फिर try कीजिए।`,
    done: "मेरी तरफ़ से बस इतना ही। धन्यवाद! Feedback देखने के लिए End interview दबाइए।",
    nudge: "ठीक है, अब code लिखिए। तैयार हों तो examples पर Run कीजिए।",
  },
};

export function CodingRound({
  problem,
  lang,
  title,
  sub,
  minutes,
  ilang,
  voice,
  style,
  talker,
  camera,
  record,
  onEnd,
  onQuit,
}: {
  problem: Problem;
  lang: Lang;
  title: string;
  sub: string;
  minutes: number;
  ilang: InterviewLang;
  voice: boolean;
  style: InterviewStyle;
  talker: Talker | null;
  /** show a self-view and measure presence, on this device only */
  camera: boolean;
  /** record the round's audio, kept on this device only */
  record: boolean;
  onEnd: (r: RoundResult) => void;
  onQuit: () => void;
}) {
  const L = LINES[ilang];
  const [stage, setStage] = useState<Stage>("intro");
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const [code, setCode] = useState(problem.starter[lang]);
  const [secs, setSecs] = useState(0);
  const [asha, setAsha] = useState<"speaking" | "thinking" | "idle">("idle");
  const [input, setInput] = useState("");
  const [rec, setRec] = useState<Recorder | null>(null);
  const [hearing, setHearing] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [scope, setScope] = useState<"examples" | "all">("examples");
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"tests" | "output" | "notes">("tests");
  const [follow, setFollow] = useState<string[]>([]);
  const [fi, setFi] = useState(0);
  const [best, setBest] = useState<{ passed: number; total: number } | null>(null);
  const lastTalk = useRef(0);
  const edits = useRef(0);
  const ended = useRef(false);
  const chatBox = useRef<HTMLDivElement>(null);
  const secsRef = useRef(0);
  secsRef.current = secs;
  const now = () => secsRef.current;
  const video = useRef<HTMLVideoElement>(null);
  const streams = useRef<MediaStream[]>([]);
  const watcher = useRef<{ stop: () => PresenceSummary | null } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioParts = useRef<Blob[]>([]);
  const recStart = useRef(0);
  const [cam, setCam] = useState<"off" | "starting" | "on" | "blocked">(camera ? "starting" : "off");
  const [watching, setWatching] = useState(false);
  const [recording, setRecording] = useState(false);

  const evRef = useRef<RoundEvent[]>([]);
  const addEvent = (e: RoundEvent) => {
    evRef.current = [...evRef.current, e].sort((a, b) => a.t - b.t);
    setEvents(evRef.current);
  };
  const log = (ok: boolean, text: string, t = now()) => addEvent({ t, ok, text });
  const brief = { title: problem.title, statement: problem.statement, level: problem.level };

  const say = async (text: string) => {
    setChat((c) => [...c, { who: "asha", text, t: now() }]);
    if (!voice || !talker) return;
    setAsha("speaking");
    await talker.say(text);
    setAsha("idle");
  };

  // clock
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // camera self-view + presence, and the device-only recording
  useEffect(() => {
    let dead = false;
    const keep = (st: MediaStream) => {
      if (dead) st.getTracks().forEach((t) => t.stop());
      else streams.current.push(st);
      return !dead;
    };
    if (camera && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } })
        .then(async (st) => {
          if (!keep(st) || !video.current) return;
          video.current.srcObject = st;
          await video.current.play().catch(() => {});
          setCam("on");
          const w = await watchPresence(video.current, now, (e) =>
            addEvent({ t: e.startedAt, ok: false, text: e.kind === "away" ? `Looked away from the screen for ${e.secs} sec` : `Out of the camera frame for ${e.secs} sec` }),
          );
          if (dead) return void w?.stop();
          watcher.current = w;
          setWatching(!!w);
        })
        .catch(() => setCam("blocked"));
    }
    if (record && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then((st) => {
          if (!keep(st)) return;
          const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
          const mr = new MediaRecorder(st, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
          mr.ondataavailable = (e) => {
            if (e.data.size) audioParts.current.push(e.data);
          };
          mr.start(1000);
          recorder.current = mr;
          recStart.current = now();
          setRecording(true);
        })
        .catch(() => setRecording(false));
    }
    return () => {
      dead = true;
      watcher.current?.stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
      streams.current.forEach((st) => st.getTracks().forEach((t) => t.stop()));
      streams.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // opening line
  useEffect(() => {
    window.scrollTo(0, 0);
    void say(L.hello(problem.title));
    return () => talker?.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = chatBox.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, asha]);

  /** In a voice round, a long stretch of coding without talking is worth noting. */
  const checkQuiet = () => {
    const gap = now() - lastTalk.current;
    if (voice && stage === "problem" && gap >= 240 && edits.current > 30) log(false, `Coded silently for ${Math.round(gap / 60)} minutes`, lastTalk.current);
    lastTalk.current = now();
    edits.current = 0;
  };

  const ai = async (fn: () => Promise<string>) => {
    setAsha("thinking");
    try {
      const reply = await fn();
      setAsha("idle");
      if (reply) await say(reply);
    } catch (e) {
      setAsha("idle");
      setChat((c) => [...c, { who: "asha", text: e instanceof AssistantError ? e.message : "Sorry, I couldn’t catch that. Say it again?", t: now() }]);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || asha === "thinking") return;
    talker?.stop();
    setInput("");
    checkQuiet();
    const history = [...chat, { who: "you" as const, text, t: now() }];
    setChat(history);
    if (stage === "intro") {
      log(true, "Explained the approach before coding");
      setStage("problem");
      await ai(() => codeChat({ problem: brief, code, lang, stage: "intro", ask: "reply", history, style, ilang }).then((r) => r || L.nudge));
      return;
    }
    if (stage === "followup") {
      const next = fi + 1;
      setFi(next);
      if (follow[next]) await say(follow[next]);
      else {
        setStage("wrap");
        log(true, "Answered the follow-up questions");
        await say(L.done);
      }
      return;
    }
    await ai(() => codeChat({ problem: brief, code, lang, stage, ask: "reply", history, style, ilang }));
  };

  const hint = async () => {
    if (asha === "thinking") return;
    log(false, "Asked for a hint");
    await ai(() => codeChat({ problem: brief, code, lang, stage, ask: "hint", history: chat, style, ilang }));
  };

  const run = async (all: boolean) => {
    if (running) return;
    setRunning(true);
    setScope(all ? "all" : "examples");
    setTab("tests");
    const tests = all ? problem.tests : problem.tests.slice(0, problem.shown);
    const r = await runCode(lang, code, problem.fn[lang], tests);
    setRunning(false);
    setResult(r);
    const passed = r.cases.filter((c) => c.ok).length;
    const n = tests.length;
    if (r.status !== "ok") {
      log(false, `${all ? "Submitted" : "Ran code"} · ${r.status === "timeout" ? "time limit hit" : "error"}`);
      setTab("output");
      return;
    }
    if (!all) {
      log(passed === n, `Ran the examples · ${passed} of ${n} passing`);
      return;
    }
    setBest((b) => (!b || passed >= b.passed ? { passed, total: n } : b));
    log(passed === n, `Submitted · ${passed} of ${n} tests passing`);
    if (passed < n) {
      await say(L.fail(passed, n));
      return;
    }
    if (stage === "problem" || stage === "intro") {
      checkQuiet();
      setStage("followup");
      setAsha("thinking");
      let qs: string[] = [];
      try {
        qs = await codeFollowups({ problem: brief, code, lang, ilang });
      } catch {
        qs = [];
      }
      setAsha("idle");
      if (!qs.length) {
        setStage("wrap");
        await say(L.done);
        return;
      }
      setFollow(qs);
      setFi(0);
      await say(`${L.pass} ${qs[0]}`);
    }
  };

  const mic = async () => {
    if (rec) {
      rec.stop();
      setRec(null);
      return;
    }
    try {
      talker?.stop();
      const r = await startRecording(async (audio) => {
        setHearing(true);
        try {
          const text = await transcribe(audio, ilang === "hi" ? "hi-IN" : "en-IN");
          if (text) await send(text);
        } catch {
          setChat((c) => [...c, { who: "asha", text: "I couldn’t hear that clearly. Try again or type it.", t: now() }]);
        } finally {
          setHearing(false);
        }
      });
      setRec(r);
    } catch {
      setChat((c) => [...c, { who: "asha", text: "Your microphone isn’t available. You can type instead.", t: now() }]);
    }
  };

  const end = async () => {
    if (ended.current) return;
    ended.current = true;
    rec?.cancel();
    talker?.stop();
    checkQuiet();
    let final = best;
    if (!final) {
      const r = await runCode(lang, code, problem.fn[lang], problem.tests);
      final = { passed: r.cases.filter((c) => c.ok).length, total: problem.tests.length };
    }
    const presence = watcher.current?.stop() ?? undefined;
    watcher.current = null;
    let audio: Blob | undefined;
    const mr = recorder.current;
    if (mr && mr.state === "recording") {
      await new Promise<void>((res) => {
        mr.onstop = () => res();
        mr.stop();
      });
      if (audioParts.current.length) audio = new Blob(audioParts.current, { type: mr.mimeType || "audio/webm" });
    }
    recorder.current = null;
    streams.current.forEach((st) => st.getTracks().forEach((t) => t.stop()));
    streams.current = [];
    onEnd({ code, passed: final.passed, total: final.total, seconds: now(), chat, events: evRef.current, ...(presence ? { presence } : {}), ...(audio ? { audio, recStart: recStart.current } : {}) });
  };

  const left = minutes * 60 - secs;
  useEffect(() => {
    if (left <= 0) void end();
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const onEdit = (v: string, kind: EditKind, added: string) => {
    setCode(v);
    edits.current += Math.max(1, added.length);
    if (kind === "paste" && added.trim().split("\n").length >= 3) log(false, `Pasted ${added.trim().split("\n").length} lines of code`);
  };

  const stageIdx = STAGES.findIndex((x) => x.key === stage);
  const cases = result?.cases ?? [];
  const passing = cases.filter((c) => c.ok).length;
  const ex = problem.tests.slice(0, problem.shown);
  const status = rec ? "Listening to you…" : hearing ? "Writing down what you said…" : asha === "speaking" ? "Speaking…" : asha === "thinking" ? "Thinking…" : "Waiting for you";

  return (
    <div className="flex flex-col bg-[#08070d] lg:-mb-20 lg:h-[calc(100dvh-48px)] lg:overflow-clip">
      {/* top bar */}
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[420px] bg-gradient-to-r from-violet-700/25 to-transparent" />
        <div className="relative flex min-w-0 items-center gap-3">
          <LogoMark size={26} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">{title}</p>
            <p className="truncate text-[11.5px] text-white/50">{sub}</p>
          </div>
        </div>
        <ol aria-label="Interview stages" className="relative order-3 flex w-full items-center gap-1.5 overflow-x-auto md:order-none md:mx-auto md:w-auto">
          {STAGES.map((x, k) => (
            <li key={x.key} className="flex shrink-0 items-center gap-1.5">
              {k > 0 && <span aria-hidden className={cn("h-px w-4 sm:w-6", k <= stageIdx ? "bg-cyan-400/60" : "bg-white/15")} />}
              <span
                aria-current={k === stageIdx ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
                  k === stageIdx ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : k < stageIdx ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-white/45",
                )}
              >
                {k < stageIdx ? <CheckIcon size={11} /> : <span className={cn("h-1.5 w-1.5 rounded-full", k === stageIdx ? "bg-cyan-300" : "bg-white/30")} />}
                {x.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="relative ml-auto flex items-center gap-2 md:ml-0">
          {recording && (
            <span title="Recording on this device only" className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-2 py-1.5 text-[11px] font-semibold tracking-wide text-rose-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> REC
            </span>
          )}
          <span className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] tabular-nums", left < 120 ? "border-rose-400/40 text-rose-300" : "border-white/10 text-white/75")}>
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> <ClockIcon size={12} /> {mmss(left)} left
          </span>
          <button type="button" onClick={() => void end()} className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-[12px] font-semibold text-rose-300 transition hover:bg-rose-500/10">
            End interview
          </button>
          <button type="button" onClick={onQuit} aria-label="Leave without feedback" title="Leave without feedback" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3 p-3 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* left: Asha, problem, talk bar */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <section className="flex min-h-[220px] flex-1 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <span className={cn("relative h-10 w-10 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#c4b5fd,#7c3aed_45%,#22d3ee_100%)]", asha === "speaking" && "animate-pulse")} aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white">Asha · AI interviewer</p>
                <p className="flex items-center gap-1.5 text-[11.5px] text-cyan-300" aria-live="polite">
                  {(asha === "speaking" || rec) && (
                    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                      {[0, 1, 2, 3].map((k) => (
                        <i key={k} className="iv-eq block w-[2px] rounded-full bg-cyan-300" style={{ animationDelay: `${k * 0.12}s` }} />
                      ))}
                    </span>
                  )}
                  {status}
                </p>
              </div>
              {camera && (
                <div className="relative ml-auto h-[66px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                  <video ref={video} muted playsInline aria-label="Your camera" className="h-full w-full -scale-x-100 object-cover" />
                  {cam !== "on" && <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-white/50">{cam === "blocked" ? "Camera blocked" : "Starting…"}</span>}
                  {cam === "on" && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9.5px] text-white/80" title={watching ? "Checking that you face the screen, on this device" : "Self-view only"}>
                      You{watching ? " · ✓" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div ref={chatBox} className="max-h-[42vh] min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 lg:max-h-none lg:basis-0">
              {chat.map((m, k) => (
                <div key={k} className={cn("flex flex-col", m.who === "you" ? "items-end" : "items-start")}>
                  <span className="mb-1 text-[10.5px] text-white/35">
                    {m.who === "you" ? "You" : "Asha"} · {mmss(m.t)}
                  </span>
                  <p className={cn("max-w-[88%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed", m.who === "you" ? "bg-violet-600/35 text-white" : "border border-white/[0.07] bg-white/[0.04] text-white/85")}>{m.text}</p>
                </div>
              ))}
              {asha === "thinking" && <p className="text-[12px] text-white/40">Asha is thinking…</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-[14px] font-semibold text-white">{problem.title}</h2>
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", problem.level === "Easy" ? "bg-emerald-400/10 text-emerald-300" : problem.level === "Medium" ? "bg-amber-400/10 text-amber-300" : "bg-rose-500/10 text-rose-300")}>{problem.level}</span>
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-white/55">{problem.topics.join(" · ")}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/65">{problem.statement}</p>
            <div className="mt-2.5 space-y-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-[11.5px] text-white/70">
              {ex.slice(0, 2).map((t, k) => (
                <p key={k} className="truncate">
                  <span className="text-white/40">Input:</span> {t.args.map((a) => show(a, lang)).join(", ")} <span className="text-white/40">→</span> {show(t.expected, lang)}
                </p>
              ))}
            </div>
            {problem.constraints.length > 0 && <p className="mt-2 text-[11px] text-white/40">Constraints: {problem.constraints.join(" · ")}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void hint()} disabled={asha === "thinking" || stage === "wrap"} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white/80 transition hover:border-white/25 disabled:opacity-40">
                <BulbIcon size={13} /> Ask for a hint
              </button>
              <button type="button" onClick={() => void say(follow[fi] && stage === "followup" ? follow[fi] : `${problem.title}. ${problem.statement}`)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/60 transition hover:text-white">
                <RepeatIcon size={13} /> Repeat question
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            {rec && (
              <div className="px-2 pb-2">
                <MicBars stream={rec.stream} bars={24} />
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2"
            >
              <button type="button" onClick={() => void mic()} aria-label={rec ? "Stop talking" : "Talk to Asha"} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition", rec ? "bg-rose-500 text-white" : "bg-cyan-400 text-[#06141a] hover:bg-cyan-300")}>
                {rec ? <StopIcon size={14} /> : <MicIcon size={16} />}
              </button>
              <div className="min-w-0 flex-1">
                <input value={input} onChange={(e) => setInput(e.target.value)} aria-label="Message to Asha" placeholder={rec ? "Listening… tap stop when you’re done" : "You’re live — think out loud, or type here"} className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-[12.5px] text-white outline-none placeholder:text-white/40 focus:border-cyan-400/60" />
              </div>
              <button type="submit" disabled={!input.trim() || asha === "thinking"} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 transition hover:text-white disabled:opacity-30">
                <SendIcon size={14} />
              </button>
            </form>
          </section>
        </div>

        {/* right: editor + tests */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <section className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-2xl lg:min-h-0 border border-white/[0.07] bg-[#0b0a12]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[11.5px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> solution.{lang === "python" ? "py" : "js"}
              </span>
              <span className="text-[11.5px] text-white/40">{LANG_LABEL[lang]}</span>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => void run(false)} disabled={running} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12px] font-medium text-white/85 transition hover:border-white/30 disabled:opacity-50">
                  <PlayIcon size={11} /> {running && scope === "examples" ? "Running…" : "Run"}
                </button>
                <button type="button" onClick={() => void run(true)} disabled={running} className="flex h-8 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-[12px] font-semibold text-[#06141a] transition hover:bg-cyan-300 disabled:opacity-50">
                  <CheckIcon size={12} /> {running && scope === "all" ? "Checking…" : "Submit"}
                </button>
              </div>
            </div>
            <CodeEditor value={code} lang={lang} onChange={onEdit} className="min-h-0 flex-1" label={`${LANG_LABEL[lang]} code for ${problem.title}`} />
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-center gap-1 border-b border-white/[0.06] px-2 pt-2">
              {(["tests", "output", "notes"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-t-md px-3 py-1.5 text-[12px] font-medium", tab === t ? "bg-white/[0.06] text-white" : "text-white/45 hover:text-white")}>
                  {t === "tests" ? "Test cases" : t === "output" ? "Output" : "Interviewer notes"}
                </button>
              ))}
              {result?.status === "ok" && (
                <span className={cn("ml-auto pr-2 text-[11.5px] font-medium", passing === cases.length ? "text-emerald-300" : "text-amber-300")}>
                  {passing} of {cases.length} passing{scope === "all" ? " (all tests)" : ""}
                </span>
              )}
            </div>
            <div className="h-[170px] space-y-1.5 overflow-y-auto p-3 font-mono text-[11.5px]">
              {tab === "tests" &&
                (!result ? (
                  <p className="font-sans text-[12px] text-white/45">Run checks your code on the {ex.length} examples. Submit checks every test, including hidden ones.</p>
                ) : result.status !== "ok" ? (
                  <p className="text-rose-300">{result.error}</p>
                ) : (
                  cases.map((c, k) => (
                    <div key={k} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", c.ok ? "bg-white/[0.03]" : "bg-rose-500/10")}>
                      {c.ok ? <CheckIcon size={12} className="shrink-0 text-emerald-400" /> : <XIcon size={12} className="shrink-0 text-rose-400" />}
                      <span className="min-w-0 flex-1 truncate text-white/75">{c.args.map((a) => show(a, lang)).join(", ")}</span>
                      <span className={cn("shrink-0 truncate", c.ok ? "text-white/45" : "text-rose-300")}>
                        → {c.ok ? show(c.got, lang) : c.error ? c.error.slice(0, 60) : `expected ${show(c.expected, lang)} · got ${show(c.got, lang)}`}
                      </span>
                    </div>
                  ))
                ))}
              {tab === "output" && <pre className="whitespace-pre-wrap text-white/70">{result?.error ?? (cases.map((c) => c.logs).filter(Boolean).join("\n") || "Nothing printed yet.")}</pre>}
              {tab === "notes" &&
                (events.length === 0 ? (
                  <p className="font-sans text-[12px] text-white/45">What you do in this round shows up here: explaining your plan, runs, hints and submits.</p>
                ) : (
                  events.map((e, k) => (
                    <p key={k} className="flex gap-2 font-sans text-[12px]">
                      <span className="w-10 shrink-0 font-mono text-white/35">{mmss(e.t)}</span>
                      <span aria-hidden className={e.ok ? "text-emerald-300" : "text-amber-300"}>●</span>
                      <span className="text-white/75">{e.text}</span>
                    </p>
                  ))
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
