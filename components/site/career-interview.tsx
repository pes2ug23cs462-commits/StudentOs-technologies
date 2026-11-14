"use client";

/* /careers/interview/[token]: the AI interview for a StudentOS applicant.
   No login: the link token is the key. Asha reads each question aloud (device
   voice), the applicant types or speaks the answer. The server keeps the
   questions and answers, so a refresh carries on where it stopped. When the last
   answer is in, the AI writes a report and the team is emailed. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Interviewer } from "@/components/interview/interviewer";
import { FancyIcon } from "@/components/site/fancy-icon";
import { ArrowRightIcon, MicIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { careersApi, careersErrorText, fmtWhen, type CareerStage } from "@/lib/careers";
import { createTalker, type Talker } from "@/lib/talker";
import { cn } from "@/lib/utils";

type View = { name: string; role: string; start: number; end: number; ai: boolean; stage: CareerStage; total: number; index: number; question: string };
type Rec = { start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };

const left = (ms: number) => {
  if (ms <= 0) return "0 min";
  const h = Math.floor(ms / 3600000);
  const m = Math.ceil((ms % 3600000) / 60000);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : h ? `${h} h ${m} min` : `${m} min`;
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-glow min-h-dvh bg-ink text-white">
      <header className="mx-auto flex max-w-[1100px] items-center gap-2 px-5 py-5">
        <Link href="/careers" className="flex items-center gap-2"><LogoMark size={26} /><Wordmark className="text-[16px]" /></Link>
        <span className="rounded-md border border-violet-400/40 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider text-violet-200">CAREERS</span>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 pb-16">{children}</main>
    </div>
  );
}

function Note({ icon, tone, title, text, children }: { icon: "check" | "bolt" | "target" | "mail"; tone: "emerald" | "amber" | "violet" | "cyan"; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto mt-[8vh] max-w-[520px] rounded-3xl border border-white/10 bg-[#121118] p-8 text-center">
      <div className="mx-auto w-fit"><FancyIcon name={icon} tone={tone} size={64} /></div>
      <h1 className="mt-5 text-[24px] font-semibold">{title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-white/62">{text}</p>
      {children}
    </div>
  );
}

export function CareerInterview({ token }: { token: string }) {
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [answer, setAnswer] = useState("");
  const [agree, setAgree] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [qAt, setQAt] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const flags = useRef({ tabs: 0, pastes: 0 });
  const rec = useRef<Rec | null>(null);
  const talker = useMemo<Talker | null>(() => (typeof window === "undefined" ? null : createTalker({ lang: "en" })), []);
  const canSpeak = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setErr("");
      try {
        const r = await careersApi<View>(action, { token, ...extra });
        setV(r);
        return r;
      } catch (e) {
        setErr(careersErrorText(e));
        return null;
      }
    },
    [token],
  );

  useEffect(() => {
    void call("interview-get");
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [call]);

  // a 1-second clock for the answer timer while the interview runs
  useEffect(() => {
    if (v?.stage !== "in-progress") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [v?.stage]);

  // leaving the tab during the interview is counted and shown to the team
  useEffect(() => {
    if (v?.stage !== "in-progress") return;
    const onHide = () => document.visibilityState === "hidden" && (flags.current.tabs += 1);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [v?.stage]);

  // read each new question aloud
  useEffect(() => {
    if (v?.stage !== "in-progress" || !v.question || !talker) return;
    setQAt(Date.now());
    setSpeaking(true);
    void talker.say(v.question).finally(() => setSpeaking(false));
    return () => talker.stop();
  }, [v?.stage, v?.question, talker]);

  useEffect(() => () => talker?.dispose(), [talker]);

  const mic = () => {
    if (listening) return rec.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const R = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!R) return;
    talker?.stop();
    const r = new R();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    const base = answer ? `${answer.trim()} ` : "";
    let said = "";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript + " ";
      setAnswer(base + said.trim());
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const next = async () => {
    if (!v || answer.trim().length < 2) return;
    rec.current?.stop();
    talker?.stop();
    setBusy("next");
    const r = await call("interview-answer", { index: v.index, answer, secs: Math.round((Date.now() - qAt) / 1000), flags: flags.current });
    setBusy("");
    if (!r) return;
    setAnswer("");
    if (r.index >= r.total) {
      setBusy("finish");
      await call("interview-finish");
      setBusy("");
    }
  };

  if (!v)
    return (
      <Frame>
        {err ? <Note icon="target" tone="amber" title="Can’t open this interview" text={err} /> : <div className="mx-auto mt-[12vh] h-64 max-w-[520px] animate-pulse rounded-3xl bg-white/[0.04]" />}
      </Frame>
    );

  if (!v.ai) return <Frame><Note icon="mail" tone="violet" title={`Thanks, ${v.name.split(" ")[0]}!`} text={`This role has no AI interview. Our team will read your application for ${v.role} and contact you.`} /></Frame>;
  if (busy === "finish" || (v.stage === "in-progress" && v.index >= v.total && v.total > 0))
    return (
      <Frame>
        <Note icon="bolt" tone="violet" title="Sending your answers…" text="The AI is writing notes for our team. This takes about half a minute; please keep this page open.">
          {err && (
            <>
              <p className="mt-4 text-[13px] text-rose-300">{err}</p>
              <button type="button" onClick={() => void call("interview-finish")} className="mt-3 h-11 rounded-xl bg-accent px-5 text-[14px] font-semibold text-black">Try again</button>
            </>
          )}
        </Note>
      </Frame>
    );
  if (v.stage === "completed") return <Frame><Note icon="check" tone="emerald" title="Interview done. Thank you!" text={`Your answers for ${v.role} are with the StudentOS team. If it’s a fit, we’ll call or email you. You can close this page.`} /></Frame>;
  if (v.stage === "missed") return <Frame><Note icon="target" tone="amber" title="This interview has closed" text={`The window ended ${fmtWhen(v.end)} (IST). If something went wrong, reply to the email we sent you and the team can open it again.`} /></Frame>;
  if (now < v.start)
    return (
      <Frame>
        <Note icon="bolt" tone="cyan" title="Your interview opens soon" text={`Hi ${v.name.split(" ")[0]}, your AI interview for ${v.role} opens ${fmtWhen(v.start)} and closes ${fmtWhen(v.end)} (IST).`}>
          <p className="mt-5 text-[13px] text-white/55">Opens in <b className="text-white">{left(v.start - now)}</b>. Come back to this same link.</p>
        </Note>
      </Frame>
    );

  if (v.stage === "invited")
    return (
      <Frame>
        <div className="mx-auto mt-[4vh] max-w-[620px] rounded-3xl border border-white/10 bg-[#121118] p-7 sm:p-9">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">AI interview · {v.role}</p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold">Hi {v.name.split(" ")[0]}, ready when you are</h1>
          <p className="mt-2 text-[14.5px] text-white/60">Asha, our AI interviewer, will ask you a few questions about you and the role. It takes about 15 minutes.</p>
          <ul className="mt-6 space-y-3 text-[14px] text-white/80">
            {[
              "Find a quiet place. Type your answers, or tap the mic and speak (Chrome works best).",
              "Answer each question in your own words, 1–2 minutes each. There’s no going back.",
              "Stay on this tab. Leaving it or pasting answers is noted for the team.",
              `Finish before ${fmtWhen(v.end)} (IST) · ${left(v.end - now)} left.`,
            ].map((x) => (
              <li key={x} className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /> {x}</li>
            ))}
          </ul>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-[13.5px] text-white/80">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#a78bfa]" />
            I’ll answer on my own, without help from other people or AI tools.
          </label>
          {err && <p className="mt-3 text-[13px] text-rose-300">{err}</p>}
          <button
            type="button"
            disabled={!agree || !!busy}
            onClick={async () => {
              setBusy("start");
              await call("interview-start");
              setBusy("");
            }}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[15px] font-semibold text-[#ffffff] shadow-[0_12px_40px_rgba(139,92,246,0.4)] transition disabled:opacity-50"
          >
            {busy === "start" ? "Preparing your questions…" : "Start interview"} {!busy && <ArrowRightIcon size={15} />}
          </button>
        </div>
      </Frame>
    );

  // in progress
  const secs = Math.max(0, Math.round((now - qAt) / 1000));
  return (
    <Frame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">AI interview · {v.role}</p>
          <p className="mt-1 text-[13px] text-white/55">Question {v.index + 1} of {v.total} · closes in {left(v.end - now)}</p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: v.total }, (_, i) => (
            <span key={i} className={cn("h-1.5 w-7 rounded-full", i < v.index ? "bg-emerald-400" : i === v.index ? "bg-violet-400" : "bg-white/10")} />
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0a14]">
          <Interviewer talker={talker} listening={listening} />
          <span className="absolute bottom-3 left-3 rounded-lg bg-[#000000]/55 px-2.5 py-1 text-[12px] text-[#ffffff]">Asha · {speaking ? "asking" : listening ? "listening" : "waiting for your answer"}</span>
        </div>
        <div className="flex flex-col rounded-3xl border border-white/10 bg-[#121118] p-5 sm:p-6">
          <p className="text-[18px] leading-snug font-semibold">{v.question}</p>
          <button type="button" onClick={() => talker && void talker.say(v.question)} className="mt-2 w-fit text-[12.5px] text-accent hover:underline">Hear it again</button>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onPaste={() => (flags.current.pastes += 1)}
            rows={8}
            placeholder={canSpeak ? "Type your answer, or tap the mic and speak…" : "Type your answer…"}
            className="mt-4 min-h-[180px] w-full flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-violet-400/60"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canSpeak && (
              <button type="button" onClick={mic} className={cn("flex h-12 items-center gap-2 rounded-xl border px-4 text-[14px] font-medium transition", listening ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-white/15 text-white/80 hover:text-white")}>
                <MicIcon size={16} /> {listening ? "Stop" : "Speak"}
              </button>
            )}
            <span className={cn("text-[12.5px] tabular-nums", secs > 150 ? "text-amber-300" : "text-white/45")}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")} {secs > 150 && "· try to wrap up"}</span>
            <button type="button" disabled={answer.trim().length < 2 || !!busy} onClick={() => void next()} className="ml-auto flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-[14.5px] font-semibold text-[#ffffff] disabled:opacity-50">
              {busy === "next" ? "Saving…" : v.index + 1 >= v.total ? "Finish" : "Next question"} {!busy && <ArrowRightIcon size={15} />}
            </button>
          </div>
          {err && <p className="mt-3 text-[13px] text-rose-300">{err}</p>}
        </div>
      </div>
    </Frame>
  );
}
