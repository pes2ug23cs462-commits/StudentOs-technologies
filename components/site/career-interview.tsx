"use client";

/* /careers/interview/[token]: an applicant's rounds for a StudentOS role.
   No login: the link token is the key. A role can have an online test, the AI
   interview, an AI HR interview and a live video interview with the team; all run
   in strict mode (full screen, camera, voice and tab checks). The first round opens
   when they apply; the team moves people on and emails them. Scores stay with the team. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FancyIcon } from "@/components/site/fancy-icon";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { TestRun, type TestIO } from "@/components/placement/company-test-run";
import { IvRun, type IvIO } from "@/components/placement/company-iv-run";
import { LiveStudent } from "@/components/live/live-student";
import { careersApi, careersErrorText, fmtWhen, STEP_LABEL, type CareerStage, type CareerStep } from "@/lib/careers";
import type { IvView, LiveSignal, StudentIvInfo, StudentTestInfo } from "@/lib/partner";
import { cn } from "@/lib/utils";

type Round = { index: number; total: number; done: boolean } | null;
type View = {
  name: string;
  role: string;
  steps: CareerStep[];
  at: CareerStep | "";
  stage: CareerStage;
  start: number;
  end: number;
  test: { title: string; minutes: number; count: number; coding: number; done: boolean } | null;
  ai: Round;
  hr: Round;
  live: { at: number; minutes: number } | null;
};

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

const ABOUT: Record<CareerStep, string> = {
  test: "Questions with options, and maybe a coding problem. Timed.",
  ai: "Disha, our AI interviewer, asks about you and the role. About 15 minutes. Speak or type.",
  hr: "About you, why StudentOS, and how you work with others. About 10 minutes.",
  live: "A video call with our team, here on StudentOS.",
};

export function CareerInterview({ token }: { token: string }) {
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [mode, setMode] = useState<CareerStep | null>(null);
  const [agree, setAgree] = useState(false);

  const load = useCallback(() => {
    careersApi<View>("interview-get", { token })
      .then((r) => {
        setV(r);
        setErr("");
      })
      .catch((e) => setErr(careersErrorText(e)));
  }, [token]);
  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [load]);

  const back = { label: "Back to my rounds", onClick: () => { setMode(null); load(); } };
  const call = <T,>(action: string, body: Record<string, unknown> = {}) => careersApi<T>(action, { token, ...body });

  if (!v)
    return <Frame>{err ? <Note icon="target" tone="amber" title="Can’t open this page" text={err} /> : <div className="mx-auto mt-[12vh] h-64 max-w-[520px] animate-pulse rounded-3xl bg-white/[0.04]" />}</Frame>;

  /* ----- a round in progress: the shared strict-mode screens ----- */
  if (mode === "test") {
    const io: TestIO = {
      info: () => call<StudentTestInfo>("test-info"),
      start: () => call("test-start"),
      submit: (body) => call("test-submit", body),
      errorText: careersErrorText,
      back,
      next: "team sees your score and emails you if you’re through to the next round.",
      none: "Your online test isn’t open right now.",
      storeKey: `studentos:ctest:${token}`,
    };
    return <Frame><TestRun io={io} /></Frame>;
  }
  if (mode === "ai" || mode === "hr") {
    const kind = mode;
    const io: IvIO = {
      info: () => call<StudentIvInfo>("iv-info", { kind }),
      start: () => call<IvView>("iv-start", { kind }),
      answer: (body) => call<IvView>("iv-answer", { kind, ...body }),
      ask: (body) => call<{ reply: string }>("iv-ask", { kind, ...body }),
      finish: (body) => call("iv-finish", { kind, ...body }),
      errorText: careersErrorText,
      back,
      next: "team reads your answers and emails you if you’re through to the next round.",
      none: "This interview isn’t open for you right now.",
      key: `${token}:${kind}`,
    };
    return <Frame><IvRun io={io} kind={kind === "hr" ? "hr" : "technical"} /></Frame>;
  }
  if (mode === "live" && v.live) return <Frame><LiveStudent pid="careers" room={token} other="the StudentOS team" signal={(body) => call<LiveSignal>("live-signal", { put: body.put })} /></Frame>;

  /* ----- the hub ----- */
  const first = v.name.split(" ")[0];
  if (!v.steps.length) return <Frame><Note icon="mail" tone="violet" title={`Thanks, ${first}!`} text={`Our team will read your application for ${v.role} and contact you.`} /></Frame>;

  const all: CareerStep[] = [...v.steps, ...(v.live ? (["live"] as const) : [])];
  const doneOf = (s: CareerStep) => (s === "test" ? !!v.test?.done : s === "ai" ? !!v.ai?.done : s === "hr" ? !!v.hr?.done : v.at === "live" && v.stage === "completed");
  const cur = v.at;
  const curDone = cur ? doneOf(cur) : false;
  const missed = v.stage === "missed" && !curDone;
  const liveOpen = cur === "live" && v.live && now >= v.live.at && now <= v.live.at + v.live.minutes * 60_000;
  const open = cur && cur !== "live" && !curDone && !missed && now >= v.start;
  const started = v.stage === "in-progress";

  return (
    <Frame>
      <div className="mx-auto mt-[3vh] max-w-[640px]">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">{v.role}</p>
        <h1 className="mt-2 text-[28px] leading-tight font-semibold">Hi {first}, here are your rounds</h1>
        <p className="mt-2 text-[14px] text-white/60">Each round runs here on StudentOS. Our team reviews it and emails you if you’re through to the next one.</p>

        <ol className="mt-6 space-y-2.5">
          {all.map((s, i) => {
            const done = doneOf(s);
            const isCur = s === cur;
            const status = done ? "Done" : isCur ? (missed ? "Missed" : s === "live" ? "Booked" : now < v.start ? "Opens soon" : "Open now") : all.indexOf(cur as CareerStep) > i ? "Skipped" : "If you’re shortlisted";
            return (
              <li key={s} className={cn("flex items-center gap-3 rounded-2xl border p-4", isCur && !done ? "border-violet-400/50 bg-violet-500/[0.08]" : "border-white/[0.08] bg-[#121118]")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", done ? "bg-emerald-400/15 text-emerald-300" : isCur ? "bg-violet-500/25 text-violet-100" : "bg-white/[0.06] text-white/45")}>{done ? <CheckIcon size={15} /> : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{STEP_LABEL[s]}</p>
                  <p className="text-[12.5px] text-white/55">{ABOUT[s]}</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium", done ? "bg-emerald-400/12 text-emerald-300" : isCur && !missed ? "bg-violet-400/15 text-violet-100" : missed && isCur ? "bg-amber-400/12 text-amber-200" : "bg-white/[0.05] text-white/45")}>{status}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-3xl border border-white/10 bg-[#121118] p-6">
          {cur === "live" && v.live ? (
            <>
              <p className="text-[16px] font-semibold">Live interview with the StudentOS team</p>
              <p className="mt-1 text-[14px] text-white/65">{fmtWhen(v.live.at)} (IST) · {v.live.minutes} minutes. Join at the start time; the call ends when the time is over. Use Chrome or Edge, with your camera and mic on, alone in a quiet place.</p>
              {v.stage === "completed" ? (
                <p className="mt-4 text-[13.5px] text-emerald-300">Done. Thank you! We’ll email you about the result.</p>
              ) : liveOpen ? (
                <button type="button" onClick={() => setMode("live")} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[15px] font-semibold text-[#ffffff]">Join the interview <ArrowRightIcon size={15} /></button>
              ) : (
                <p className="mt-4 rounded-lg bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/65">{now < v.live.at ? `You can join only at the booked time, not before or after. The Join button turns on at the start time · in ${left(v.live.at - now)}.` : "This interview’s time is over. Reply to our email if you missed it."}</p>
              )}
            </>
          ) : curDone || !cur ? (
            <>
              <p className="text-[16px] font-semibold">{cur ? `${STEP_LABEL[cur]} done. Thank you!` : "Thank you!"}</p>
              <p className="mt-1 text-[14px] text-white/65">Our team is reviewing it. If you’re through to the next round, we’ll email you and it will open here. You can close this page.</p>
            </>
          ) : missed ? (
            <>
              <p className="text-[16px] font-semibold">This round has closed</p>
              <p className="mt-1 text-[14px] text-white/65">The window ended {fmtWhen(v.end)} (IST). If something went wrong, reply to the email we sent you and the team can open it again.</p>
            </>
          ) : !open ? (
            <>
              <p className="text-[16px] font-semibold">Your {STEP_LABEL[cur].toLowerCase()} opens soon</p>
              <p className="mt-1 text-[14px] text-white/65">It opens {fmtWhen(v.start)} and closes {fmtWhen(v.end)} (IST). Opens in <b className="text-white">{left(v.start - now)}</b>. Come back to this same link.</p>
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold">Next: {STEP_LABEL[cur]}</p>
              <p className="mt-1 text-[14px] text-white/65">Finish before {fmtWhen(v.end)} (IST) · {left(v.end - now)} left. It runs in strict mode: full screen, camera and mic on, no other tabs.</p>
              {!started && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-[13.5px] text-white/80">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#fbbf24]" />
                  I’ll do this on my own, without help from other people or AI tools.
                </label>
              )}
              <button type="button" disabled={!started && !agree} onClick={() => setMode(cur)} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[15px] font-semibold text-[#ffffff] shadow-[0_12px_40px_rgba(245,158,11,0.4)] transition disabled:opacity-50">
                {started ? "Continue" : "Get ready"} <ArrowRightIcon size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </Frame>
  );
}
