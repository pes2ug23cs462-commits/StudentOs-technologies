"use client";

/* A company's AI technical interview, taken on StudentOS in strict mode: Asha asks
   the company's questions one at a time (spoken), the student answers by speaking
   or typing, and the camera checks for looking away, a second person and a voice
   that isn't theirs. The report goes to the company, not to the student. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon, MicIcon, ShieldIcon } from "@/components/ui/icons";
import { Interviewer } from "@/components/interview/interviewer";
import { enterFullscreen, MAX_WARNINGS, ProctorBadge, ProctorWarning, SelfView, STRICT_SHELL, useProctor, type Breach } from "@/components/interview/proctor";
import { partnerApi, partnerErrorText, type IvKind, type IvView, type StudentIvInfo } from "@/lib/partner";
import { createTalker, type Talker } from "@/lib/talker";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Rec = { start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };

/** Where the interview talks to: a company drive (/api/partner) or a StudentOS careers application (/api/careers). */
export type IvIO = {
  info: () => Promise<StudentIvInfo>;
  start: () => Promise<IvView>;
  answer: (body: { index: number; answer: string; secs: number; follow?: boolean }) => Promise<IvView>;
  /** ask the interviewer to repeat or explain the question (never for the answer) */
  ask: (body: { message: string }) => Promise<{ reply: string }>;
  finish: (body: { warnings: Breach[]; ended: boolean }) => Promise<unknown>;
  errorText: (e: unknown) => string;
  back: { label: string; href?: string; onClick?: () => void };
  /** after finishing: who reviews it and how they hear next */
  next: string;
  none: string;
  key: string;
};

function Back({ back, className }: { back: IvIO["back"]; className: string }) {
  return back.href ? <Link href={back.href} className={className}>{back.label}</Link> : <button type="button" onClick={back.onClick} className={className}>{back.label}</button>;
}

export function CompanyIvRun({ cid, pid, kind = "technical" }: { cid: string; pid: string; kind?: IvKind }) {
  const io: IvIO = {
    info: () => partnerApi<StudentIvInfo>("student-iv-info", { cid, pid, kind }),
    start: () => partnerApi<IvView>("student-iv-start", { cid, pid, kind }),
    answer: (body) => partnerApi<IvView>("student-iv-answer", { cid, pid, kind, ...body }),
    ask: (body) => partnerApi<{ reply: string }>("student-iv-ask", { cid, pid, kind, ...body }),
    finish: (body) => partnerApi("student-iv-finish", { cid, pid, kind, ...body }),
    errorText: partnerErrorText,
    back: { label: "Back to my applications", href: "/placement?tab=drives" },
    next: "reviews them and tells you about the next round here.",
    none: "It opens for students the company moves to its interview round.",
    key: `${cid}:${pid}:${kind}`,
  };
  return <IvRun io={io} kind={kind} />;
}

export function IvRun({ io, kind = "technical" }: { io: IvIO; kind?: IvKind }) {
  const { actions } = useStore();
  const ioRef = useRef(io);
  ioRef.current = io;
  const [info, setInfo] = useState<StudentIvInfo | null>(null);
  const [v, setV] = useState<IvView | null>(null);
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [askText, setAskText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { ended: boolean }>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [qAt, setQAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const rec = useRef<Rec | null>(null);
  const finishing = useRef(false);
  const talker = useMemo<Talker | null>(() => (typeof window === "undefined" ? null : createTalker({ lang: "en" })), []);
  const canSpeak = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  useEffect(() => {
    ioRef.current
      .info()
      .then((r) => {
        setInfo(r);
        if (r.attempt?.done) setDone({ ended: false });
      })
      .catch((e) => setErr(ioRef.current.errorText(e)));
  }, [io.key]);
  useEffect(() => () => talker?.dispose(), [talker]);

  const finish = useCallback(
    async (warnings: Breach[], ended: boolean) => {
      if (finishing.current) return;
      finishing.current = true;
      rec.current?.stop();
      talker?.stop();
      setBusy("finish");
      try {
        await ioRef.current.finish({ warnings, ended });
        setDone({ ended });
        setV(null);
      } catch (e) {
        finishing.current = false;
        actions.toast(ioRef.current.errorText(e));
      } finally {
        setBusy("");
      }
    },
    [talker, actions],
  );
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const live = !!v && !v.done && !done;
  // the fourth warning ends the interview with the answers given so far
  const proctor = useProctor(live, (log) => void finishRef.current(log, true));

  // Asha reads each new question aloud
  useEffect(() => {
    if (!live || !v?.question || !talker) return;
    setQAt(Date.now());
    setSpeaking(true);
    void talker.say(v.question).finally(() => setSpeaking(false));
    return () => talker.stop();
  }, [live, v?.question, talker]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);

  const start = async () => {
    enterFullscreen();
    setBusy("start");
    try {
      const r = await io.start();
      setV(r);
    } catch (e) {
      actions.toast(io.errorText(e));
    } finally {
      setBusy("");
    }
  };
  const mic = () => {
    if (listening) return rec.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const R = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!R) return;
    talker?.stop();
    setSpeaking(false);
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
    try {
      const r = await io.answer({ index: v.index, answer, secs: Math.round((Date.now() - qAt) / 1000), follow: !!v.followup });
      setAnswer("");
      setReply("");
      setAsking(false);
      if (r.followup) setV(r); // Asha asks one follow-up on that answer
      else if (r.index >= r.total) {
        proctor.stop();
        await finish(proctor.log, false);
      } else setV(r);
    } catch (e) {
      actions.toast(io.errorText(e));
    } finally {
      setBusy((b) => (b === "next" ? "" : b));
    }
  };

  const askAsha = async (message: string) => {
    if (!message.trim() || busy) return;
    rec.current?.stop();
    talker?.stop();
    setBusy("ask");
    try {
      const r = await io.ask({ message: message.trim() });
      setReply(r.reply);
      setAskText("");
      if (talker && r.reply) {
        setSpeaking(true);
        void talker.say(r.reply).finally(() => setSpeaking(false));
      }
    } catch (e) {
      actions.toast(io.errorText(e));
    } finally {
      setBusy((b) => (b === "ask" ? "" : b));
    }
  };

  if (err) return <p className="mt-16 text-center text-[14px] text-rose-300">{err}</p>;
  if (!info) return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;

  if (busy === "finish")
    return (
      <div className={cn(STRICT_SHELL, "flex items-center justify-center p-6")}>
        <div className="max-w-[460px] text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
          <p className="mt-4 text-[16px] font-semibold text-white">Sending your answers…</p>
          <p className="mt-1 text-[13px] text-white/55">The AI is writing notes for {info.iv?.company ?? "the company"}. Keep this page open for about half a minute.</p>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-8 text-center">
        <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", done.ended ? "bg-rose-500/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300")}>{done.ended ? <AlertCircleIcon size={24} /> : <CheckIcon size={24} />}</span>
        <h1 className="mt-4 text-[22px] font-semibold text-white">{done.ended ? "Interview ended" : "Interview done"}</h1>
        <p className="mt-2 text-[13.5px] text-white/60">{done.ended ? `It closed after ${MAX_WARNINGS} warnings, with the answers you had given.` : "Thank you. Your answers are in."} {info.iv?.company ?? "The company"} {io.next}</p>
        <Back back={io.back} className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-black" />
      </div>
    );

  if (!info.iv)
    return (
      <div className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-8 text-center">
        <p className="text-[15px] font-semibold text-white">No AI interview for you right now</p>
        <p className="mt-2 text-[13px] text-white/55">{io.none}</p>
        <Back back={io.back} className="mt-5 inline-block text-[13px] text-accent hover:underline" />
      </div>
    );

  if (!v) {
    const resuming = !!info.attempt && !info.attempt.done;
    return (
      <div className="mx-auto mt-6 max-w-[620px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-7">
        <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">{info.iv.company} · {info.iv.role}</p>
        <h1 className="mt-1 text-[24px] font-semibold text-white">{info.iv.title}</h1>
        <p className="mt-1 text-[13.5px] text-white/60">Asha, the AI interviewer, asks {info.iv.count} {kind === "hr" ? "HR questions: about you, why this company, and how you work with others" : "questions"}. Answer each by speaking or typing, about 1–2 minutes each. Like a real interviewer, she may ask a follow-up on an answer, and you can ask her to repeat or explain a question. {kind === "hr" ? "Be yourself and give real examples." : ""}</p>
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-100"><ShieldIcon size={15} /> Strict mode</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/70">
            <li>Full screen, no other tabs. Look at the screen and stay in view.</li>
            <li>Only you answer: the camera checks your lips move when a voice is heard, and that no one else is with you.</li>
            <li>After {MAX_WARNINGS} warnings, the next one ends the interview.</li>
            <li>One attempt. If you close the page, you continue from the same question.</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-white/45">Camera and mic are checked on this device only. Your spoken answers are turned into text for the company; no audio or video is saved.</p>
        </div>
        {!info.open && !resuming ? (
          <p className="mt-5 rounded-lg bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/65">Not open right now. {info.iv.company} opens it at the interview time. Come back here then.</p>
        ) : (
          <Button variant="primary" className="mt-5 w-full" loading={busy === "start"} onClick={() => void start()}>{busy === "start" ? "Preparing your questions…" : resuming ? "Continue the interview" : "Start the interview"}</Button>
        )}
      </div>
    );
  }

  const secs = Math.max(0, Math.round((now - qAt) / 1000));
  return (
    <div className={cn(STRICT_SHELL, "px-5 py-5 lg:px-8")}>
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">{info.iv.company} · {info.iv.title}</p>
            <p className="text-[13px] text-white/60">{v.followup ? `Follow-up on question ${v.index}` : `Question ${v.index + 1} of ${v.total}`}</p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: v.total }, (_, i) => <span key={i} className={cn("h-1.5 w-7 rounded-full", i < v.index ? "bg-emerald-400" : i === v.index ? "bg-violet-400" : "bg-white/10")} />)}
          </div>
          <ProctorBadge left={proctor.left} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0a14]">
              <Interviewer talker={talker} listening={listening} />
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-[12px] text-white">Asha · {speaking ? "asking" : listening ? "listening" : "waiting for your answer"}</span>
            </div>
            <SelfView onBreach={proctor.report} voice={{ paused: speaking }} className="mx-auto w-[260px]" />
          </div>
          <div className="flex flex-col rounded-3xl border border-white/10 bg-[#121118] p-5 sm:p-6">
            {v.followup && <p className="mb-1 w-fit rounded-md bg-violet-400/15 px-2 py-0.5 text-[11.5px] font-semibold text-violet-200">Follow-up</p>}
            <p className="text-[18px] leading-snug font-semibold text-white">{v.question}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => talker && (setSpeaking(true), void talker.say(v.question).finally(() => setSpeaking(false)))} className="text-[12.5px] text-accent hover:underline">Hear it again</button>
              <button type="button" onClick={() => setAsking((x) => !x)} className="text-[12.5px] text-accent hover:underline">{asking ? "Close" : "Ask Asha about the question"}</button>
            </div>
            {asking && (
              <div className="mt-3 rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {["Please repeat the question", "What do you mean by this?", "Can you give an example?"].map((c) => (
                    <button key={c} type="button" disabled={!!busy} onClick={() => void askAsha(c)} className="h-8 rounded-lg border border-white/12 px-2.5 text-[12px] text-white/75 hover:border-violet-400/50 hover:text-white">{c}</button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void askAsha(askText); }} className="mt-2 flex gap-2">
                  <input value={askText} onChange={(e) => setAskText(e.target.value)} maxLength={300} placeholder="Or type your question for Asha…" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-field px-3 text-[13px] text-white placeholder:text-white/35" />
                  <Button size="sm" type="submit" loading={busy === "ask"} disabled={!askText.trim()}>Ask</Button>
                </form>
                {reply && <p className="mt-2.5 rounded-lg bg-[#0b0a14] px-3 py-2 text-[13px] leading-relaxed text-white/85"><b className="text-violet-200">Asha:</b> {reply}</p>}
                <p className="mt-2 text-[11px] text-white/40">Asha can explain the question, not answer it. {info.iv.company} sees what you asked.</p>
              </div>
            )}
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} placeholder={canSpeak ? "Tap Speak and answer out loud, or type…" : "Type your answer…"} className="mt-4 min-h-[200px] w-full flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-violet-400/60" />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canSpeak && (
                <button type="button" onClick={mic} className={cn("flex h-12 items-center gap-2 rounded-xl border px-4 text-[14px] font-medium transition", listening ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-white/15 text-white/80 hover:text-white")}>
                  <MicIcon size={16} /> {listening ? "Stop" : "Speak"}
                </button>
              )}
              <span className={cn("text-[12.5px] tabular-nums", secs > 150 ? "text-amber-300" : "text-white/45")}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}{secs > 150 && " · try to wrap up"}</span>
              <Button variant="primary" className="ml-auto h-12 px-6" loading={busy === "next"} disabled={answer.trim().length < 2} onClick={() => void next()}>
                {(v.followup ? v.index >= v.total : v.index + 1 >= v.total) ? "Finish" : v.followup ? "Next question" : "Submit answer"} <ArrowRightIcon size={15} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ProctorWarning warn={proctor.warn} count={proctor.log.length} onResume={proctor.resume} />
    </div>
  );
}
