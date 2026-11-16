"use client";

/* Strict mode for mock interviews: the round runs full screen, and leaving it,
   switching tabs, or looking away from the camera for a few seconds counts as a
   breach. Three breaches get a warning each; the fourth ends the interview.
   Everything is checked on the student's device; no picture leaves it. */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircleIcon, ShieldIcon } from "@/components/ui/icons";
import { watchPresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

export const MAX_WARNINGS = 3;
/** seconds of looking away (or leaving the frame) before it counts */
export const LOOK_SECS = 3;

export type Breach = "tab" | "fullscreen" | "away" | "out";
export const BREACH_TEXT: Record<Breach, string> = {
  tab: "You switched to another tab or window.",
  fullscreen: "You left full screen.",
  away: "You looked away from the screen.",
  out: "You moved out of the camera.",
};

export function enterFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
}
function leaveFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

/**
 * Watches for tab switches and leaving full screen while `on`.
 * `report` is also called by the camera check. After MAX_WARNINGS warnings the next breach calls `onExit`.
 * Call `stop()` before ending the round normally, so leaving full screen then doesn't count.
 */
export function useProctor(on: boolean, onExit: (log: Breach[]) => void) {
  const [log, setLog] = useState<Breach[]>([]);
  const [warn, setWarn] = useState<Breach | null>(null);
  const logRef = useRef<Breach[]>([]);
  const last = useRef(0);
  const done = useRef(false);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  const report = useCallback(
    (b: Breach) => {
      if (!on || done.current) return;
      // switching tabs also leaves full screen: count it once
      const t = Date.now();
      if (t - last.current < 2500) return;
      last.current = t;
      const next = [...logRef.current, b];
      logRef.current = next;
      setLog(next);
      if (next.length > MAX_WARNINGS) {
        done.current = true;
        setWarn(null);
        leaveFullscreen();
        exitRef.current(next);
      } else setWarn(b);
    },
    [on],
  );

  useEffect(() => {
    if (!on) return;
    done.current = false;
    logRef.current = [];
    last.current = 0;
    setLog([]);
    setWarn(null);
    const vis = () => document.visibilityState === "hidden" && report("tab");
    const fs = () => !document.fullscreenElement && report("fullscreen");
    document.addEventListener("visibilitychange", vis);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [on, report]);

  const resume = () => {
    setWarn(null);
    enterFullscreen();
  };
  const stop = () => {
    done.current = true;
    setWarn(null);
    leaveFullscreen();
  };
  return { log, warn, report, resume, stop, left: MAX_WARNINGS - log.length };
}

/** The warning shown after each breach. */
export function ProctorWarning({ warn, count, onResume }: { warn: Breach | null; count: number; onResume: () => void }) {
  if (!warn) return null;
  const last = count >= MAX_WARNINGS;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="pw-title" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl border border-amber-400/30 bg-[#141218] p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <AlertCircleIcon size={24} />
        </span>
        <p id="pw-title" className="mt-4 text-[18px] font-semibold text-white">Warning {count} of {MAX_WARNINGS}</p>
        <p className="mt-2 text-[14px] text-white/75">{BREACH_TEXT[warn]}</p>
        <p className={cn("mt-3 rounded-lg px-3 py-2 text-[12.5px]", last ? "bg-rose-500/12 text-rose-200" : "bg-white/[0.04] text-white/55")}>
          {last ? "This was your last warning. One more time and the interview ends." : `Stay on this screen and look at the camera. After ${MAX_WARNINGS} warnings, the next one ends the interview.`}
        </p>
        <button type="button" autoFocus onClick={onResume} className="mt-5 h-11 w-full rounded-xl bg-accent text-[14px] font-semibold text-[#120826] transition hover:brightness-110">
          Back to interview
        </button>
      </div>
    </div>
  );
}

/** A small badge with the warnings left, for the interview's top bar. */
export function ProctorBadge({ left }: { left: number }) {
  return (
    <span title="Strict mode: full screen, no other tabs, eyes on the screen" className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium", left > 1 ? "border-emerald-400/25 text-emerald-300" : left === 1 ? "border-amber-400/30 text-amber-200" : "border-rose-400/35 text-rose-300")}>
      <ShieldIcon size={13} /> Strict · {left} warning{left === 1 ? "" : "s"} left
    </span>
  );
}

/** Camera self-view that reports looking away or leaving the frame. */
export function SelfView({ onBreach, className }: { onBreach: (b: Breach) => void; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [cam, setCam] = useState<"starting" | "on" | "blocked">("starting");
  const [watching, setWatching] = useState(false);
  const cb = useRef(onBreach);
  cb.current = onBreach;
  useEffect(() => {
    let dead = false;
    let stream: MediaStream | null = null;
    let w: { stop: () => unknown } | null = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("blocked");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } })
      .then(async (st) => {
        stream = st;
        if (dead || !video.current) return st.getTracks().forEach((t) => t.stop());
        video.current.srcObject = st;
        await video.current.play().catch(() => {});
        setCam("on");
        const clock = () => performance.now() / 1000;
        w = await watchPresence(video.current, clock, () => {}, { secs: LOOK_SECS, on: (k) => cb.current(k) });
        if (dead) return void w?.stop();
        setWatching(!!w);
      })
      .catch(() => setCam("blocked"));
    return () => {
      dead = true;
      w?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black", className)}>
      <video ref={video} muted playsInline aria-label="Your camera" className="aspect-[4/3] w-full -scale-x-100 object-cover" />
      <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white/80 backdrop-blur">
        {cam === "blocked" ? "Camera blocked: allow it to keep strict mode fair" : cam === "starting" ? "Starting camera…" : watching ? "Watching: keep your eyes on the screen" : "Camera on"}
      </span>
    </div>
  );
}
