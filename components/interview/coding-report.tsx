"use client";

/* The feedback report after a coding round: overall score and verdict, the four
   rubric areas, the moments that mattered (with real times from the round) and
   three things to practise next, which can go straight into the study plan. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircleIcon, ArrowLeftIcon, DownloadIcon, PlayIcon, CheckCircleIcon, ChevronDownIcon, PlanIcon, PlusIcon, RefreshIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { LANG_LABEL } from "@/lib/coding/types";
import { getRecording } from "@/lib/recordings";
import { RUBRIC_LABEL, type InterviewRecord, type PracticeItem } from "@/lib/interview";
import { cn } from "@/lib/utils";

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function CodingReport({
  record,
  prev,
  onBack,
  onRetry,
  onAdd,
}: {
  record: InterviewRecord;
  prev: number | null;
  onBack: () => void;
  onRetry: () => void;
  onAdd: (items: PracticeItem[]) => void;
}) {
  const c = record.coding!;
  const fb = record.feedback;
  const [added, setAdded] = useState<number[]>([]);
  const [show2, setShow2] = useState<"code" | "chat" | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const audio = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!c.recorded) return;
    let url: string | null = null;
    let live = true;
    void getRecording(record.id).then((b) => {
      if (!live) return;
      if (!b) return setMissing(true);
      url = URL.createObjectURL(b);
      setSrc(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [record.id, c.recorded]);
  /** Plays the recording from a moment in the round. */
  const playAt = (t: number) => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = Math.max(0, t - (c.recStart ?? 0) - 2);
    void a.play();
    a.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const tone = fb.overall >= 75 ? "text-emerald-300 bg-emerald-400/10" : fb.overall >= 55 ? "text-cyan-200 bg-cyan-400/10" : "text-amber-300 bg-amber-400/10";
  const date = new Date(record.at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const add = (k: number[]) => {
    const todo = k.filter((x) => !added.includes(x));
    if (!todo.length) return;
    onAdd(todo.map((x) => c.practice[x]));
    setAdded((a) => [...a, ...todo]);
  };

  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0d0b16] px-6 py-6 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/3 h-72 w-[38rem] rounded-full bg-violet-600/25 blur-[90px]" />
        <button type="button" onClick={onBack} className="relative flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white">
          <ArrowLeftIcon size={13} /> Mock interviews
        </button>
        <div className="relative mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-white sm:text-[34px]">Interview feedback</h1>
            <p className="mt-1 text-[13px] text-white/55">
              {record.role} · Coding round · {date} · {Math.max(1, Math.round(c.seconds / 60))} min
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {src && (
              <button type="button" onClick={() => playAt(c.recStart ?? 0)} className="flex h-9 items-center gap-2 rounded-xl border border-white/12 px-3.5 text-[12.5px] font-medium text-white/85 transition hover:border-white/30">
                <PlayIcon size={11} /> Play recording
              </button>
            )}
            <button type="button" onClick={onRetry} className="flex h-9 items-center gap-2 rounded-xl border border-white/12 px-3.5 text-[12.5px] font-medium text-white/85 transition hover:border-white/30">
              <RefreshIcon size={13} /> Retry this round
            </button>
            {c.practice.length > 0 && (
              <button type="button" onClick={() => add(c.practice.map((_, k) => k))} disabled={added.length === c.practice.length} className="flex h-9 items-center gap-2 rounded-xl bg-cyan-400 px-3.5 text-[12.5px] font-semibold text-[#06141a] transition hover:bg-cyan-300 disabled:opacity-50">
                <PlanIcon size={13} /> {added.length === c.practice.length ? "Added to your plan" : "Add practice to my plan"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card className="p-5">
          <p className="text-[12px] font-semibold text-white/55">Overall</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-[92px] w-[92px] shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-white/10" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-cyan-400" strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 15.5} strokeDashoffset={2 * Math.PI * 15.5 * (1 - fb.overall / 100)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[28px] font-bold text-white tabular-nums">{fb.overall}</span>
            </div>
            <div className="min-w-0">
              {fb.verdict && <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>● {fb.verdict}</span>}
              <p className="mt-1.5 text-[12px] leading-snug text-white/60">{fb.summary}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11.5px]">
            {prev != null && <span className={cn("rounded-full px-2 py-0.5 font-medium", fb.overall >= prev ? "bg-cyan-400/10 text-cyan-200" : "bg-white/[0.06] text-white/60")}>{fb.overall >= prev ? "+" : ""}{fb.overall - prev} vs last round</span>}
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/60">{c.passed} of {c.total} tests passed</span>
          </div>
          {c.presence && (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-white/60">Facing the screen</span>
                <span className={cn("text-[17px] font-bold tabular-nums", c.presence.facing >= 75 ? "text-white" : "text-amber-300")}>{c.presence.facing}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className={cn("block h-full rounded-full", c.presence.facing >= 75 ? "bg-cyan-400" : "bg-amber-400")} style={{ width: `${c.presence.facing}%` }} />
              </div>
              <p className="mt-2 text-[11.5px] text-white/50">
                {c.presence.away === 0 && c.presence.out === 0 ? "You stayed with the interviewer the whole time." : [c.presence.away ? `Looked away ${c.presence.away} time${c.presence.away === 1 ? "" : "s"}` : "", c.presence.out ? `left the frame ${c.presence.out} time${c.presence.out === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") + "."}{" "}
                Measured on your device; no video was saved.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-white">How you were scored</p>
            <p className="text-[11.5px] text-white/40">{c.title} · {LANG_LABEL[c.lang]}</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.rubric.map((r) => (
              <div key={r.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-white/60">{RUBRIC_LABEL[r.key]}</span>
                  <span className={cn("text-[17px] font-bold tabular-nums", r.score >= 70 ? "text-white" : "text-amber-300")}>{r.score}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <span className={cn("block h-full rounded-full", r.score >= 70 ? "bg-cyan-400" : "bg-amber-400")} style={{ width: `${r.score}%` }} />
                </div>
                <p className="mt-2 text-[11.5px] leading-snug text-white/50">{r.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <p className="text-[14px] font-semibold text-white">Moments that mattered</p>
          {c.moments.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-white/45">Nothing stood out in this round.</p>
          ) : (
            <ol className="mt-3 divide-y divide-white/[0.06]">
              {c.moments.map((m, k) => (
                <li key={k} className="flex gap-3 py-3">
                  {src ? (
                    <button type="button" onClick={() => playAt(m.t)} title="Play from here" className="w-11 shrink-0 pt-0.5 text-left font-mono text-[11.5px] text-cyan-300 hover:underline">
                      {mmss(m.t)}
                    </button>
                  ) : (
                    <span className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-white/40">{mmss(m.t)}</span>
                  )}
                  {m.ok ? <CheckCircleIcon size={15} className="mt-0.5 shrink-0 text-emerald-400" /> : <AlertCircleIcon size={15} className="mt-0.5 shrink-0 text-amber-400" />}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-white">{m.text}</span>
                    {m.sub && <span className="block text-[12px] text-white/50">{m.sub}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-[14px] font-semibold text-white">What to practise next</p>
          <p className="mt-1 text-[12px] text-white/50">Add these to your study plan for tomorrow evening, or open the problem now.</p>
          <div className="mt-3 space-y-2.5">
            {c.practice.map((p, k) => (
              <div key={k} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white">{p.title}</p>
                  <p className="text-[11.5px] text-white/50">
                    {p.detail} · {p.minutes} min
                  </p>
                  {p.problemId && (
                    <Link href={`/code/${p.problemId}`} className="mt-1 inline-block text-[11.5px] font-medium text-cyan-300 hover:underline">
                      Open the problem →
                    </Link>
                  )}
                </div>
                <button type="button" onClick={() => add([k])} disabled={added.includes(k)} aria-label={added.includes(k) ? "Added to your plan" : `Add “${p.title}” to my plan`} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition", added.includes(k) ? "border-emerald-400/40 text-emerald-300" : "border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10")}>
                  {added.includes(k) ? <CheckCircleIcon size={14} /> : <PlusIcon size={14} />}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {c.recorded && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-white">Recording</p>
            {src && (
              <a href={src} download={`StudentOS-interview-${new Date(record.at).toISOString().slice(0, 10)}`} className="flex items-center gap-1.5 text-[12px] font-medium text-cyan-300 hover:underline">
                <DownloadIcon size={13} /> Download
              </a>
            )}
          </div>
          {src ? (
            <>
              <audio ref={audio} src={src} controls className="mt-3 w-full" />
              <p className="mt-2 text-[11.5px] text-white/45">Saved only on this device. Tap a time in “Moments that mattered” to hear that part.</p>
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-white/50">{missing ? "This recording is saved on the device you used for the interview, or it was cleared from this browser." : "Loading…"}</p>
          )}
        </Card>
      )}

      <div className="mt-4 space-y-2">
        {(["code", "chat"] as const).map((x) => (
          <Card key={x} className="overflow-hidden">
            <button type="button" onClick={() => setShow2(show2 === x ? null : x)} aria-expanded={show2 === x} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[13.5px] font-medium text-white">
              {x === "code" ? "Your final code" : "Conversation with Asha"}
              <ChevronDownIcon size={15} className={cn("text-white/40 transition-transform", show2 === x && "rotate-180")} />
            </button>
            {show2 === x &&
              (x === "code" ? (
                <pre className="overflow-x-auto border-t border-white/[0.06] bg-black/30 px-5 py-4 font-mono text-[12px] leading-relaxed text-white/80">{c.code}</pre>
              ) : (
                <div className="space-y-2 border-t border-white/[0.06] px-5 py-4">
                  {c.transcript.map((m, k) => (
                    <p key={k} className="text-[12.5px] leading-relaxed">
                      <span className="mr-2 font-mono text-[11px] text-white/35">{mmss(m.t)}</span>
                      <b className={m.who === "you" ? "text-violet-300" : "text-cyan-300"}>{m.who === "you" ? "You" : "Asha"}:</b> <span className="text-white/75">{m.text}</span>
                    </p>
                  ))}
                </div>
              ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
