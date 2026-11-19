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
export const LOOK_SECS = 2;

export type Breach = "tab" | "fullscreen" | "away" | "out" | "people" | "talk" | "voice" | "device";
export const BREACH_TEXT: Record<Breach, string> = {
  tab: "You switched to another tab or window.",
  fullscreen: "You left full screen.",
  away: "You looked away from the screen.",
  out: "You moved out of the camera.",
  people: "Someone else appeared on the camera.",
  talk: "Talking was heard. Tests are taken in silence.",
  voice: "A voice was heard while your lips weren’t moving. Only you should answer.",
  device: "A phone or another device was seen on the camera. Keep phones, tablets and books away.",
};
/** Covers the app around a strict round, so only the round is on screen. */
export const STRICT_SHELL = "fixed inset-0 z-[60] overflow-auto bg-ink";

type KeyboardLock = { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void };
const keyboard = () => (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;
export function enterFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen)
    el.requestFullscreen()
      // Chrome and Edge: while locked, shortcuts like Ctrl+T, Ctrl+W and Ctrl+N stay in the page,
      // and leaving full screen needs Esc held down
      .then(() => keyboard()?.lock?.().catch(() => {}))
      .catch(() => {});
}
function leaveFullscreen() {
  keyboard()?.unlock?.();
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
    // nothing to copy out, paste in, print or save while the round runs
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "p", "s", "u", "f", "t", "n", "w", "r", "tab"].includes(k)) e.preventDefault();
      if (k === "f12" || k === "printscreen" || (e.altKey && k === "tab")) e.preventDefault();
    };
    document.addEventListener("visibilitychange", vis);
    document.addEventListener("fullscreenchange", fs);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("keydown", keys, true);
    // closing or reloading the tab asks first
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("fullscreenchange", fs);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("keydown", keys, true);
      window.removeEventListener("beforeunload", leave);
      keyboard()?.unlock?.();
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
export function ProctorWarning({ warn, count, onResume, what = "interview" }: { warn: Breach | null; count: number; onResume: () => void; what?: "interview" | "test" }) {
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
          {last ? `This was your last warning. One more time and the ${what} ends.` : `Stay on this screen and look at the camera. After ${MAX_WARNINGS} warnings, the next one ends the ${what}.`}
        </p>
        <button type="button" autoFocus onClick={onResume} className="mt-5 h-11 w-full rounded-xl bg-accent text-[14px] font-semibold text-[#120826] transition hover:brightness-110">
          Back to {what}
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

/**
 * Listens for talking during a written test, on the device only (nothing is recorded or sent).
 * About 2 seconds of voice inside 4 seconds, louder than the room's own noise, counts once;
 * then it waits for quiet before it can count again.
 */
function useTalkWatch(on: boolean, onTalk: () => void) {
  const [mic, setMic] = useState<"off" | "on" | "blocked">("off");
  const cb = useRef(onTalk);
  cb.current = onTalk;
  useEffect(() => {
    if (!on) return;
    let dead = false, stream: MediaStream | null = null, ctx: AudioContext | null = null, timer = 0;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setMic("blocked");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((st) => {
        stream = st;
        if (dead) return st.getTracks().forEach((t) => t.stop());
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(st).connect(an);
        setMic("on");
        const bins = new Uint8Array(an.frequencyBinCount);
        const hz = ctx.sampleRate / an.fftSize;
        const lo = Math.floor(300 / hz), hi = Math.ceil(3400 / hz);
        let floor = 0, n = 0;
        const recent: boolean[] = [];
        let armed = true, quiet = 0;
        // 10 checks a second: the voice band's level against the room's slowly learned noise floor
        timer = window.setInterval(() => {
          an.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = lo; i <= hi; i++) sum += bins[i];
          const level = sum / (hi - lo + 1);
          n++;
          floor = n < 20 ? Math.max(floor, level) : floor * 0.995 + Math.min(level, floor + 4) * 0.005;
          // strict: quieter talking counts, and ~2 s of it inside 4 s is enough
          const voice = n > 20 && level > Math.max(floor * 1.4, floor + 9);
          recent.push(voice);
          if (recent.length > 40) recent.shift();
          quiet = voice ? 0 : quiet + 1;
          if (!armed && quiet >= 20) armed = true;
          if (armed && recent.filter(Boolean).length >= 15) {
            armed = false;
            recent.length = 0;
            cb.current();
          }
        }, 100);
      })
      .catch(() => setMic("blocked"));
    return () => {
      dead = true;
      window.clearInterval(timer);
      void ctx?.close().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);
  return mic;
}

/** A small camera, the mic check and the warnings left, pinned to a corner of a strict test. */
export function StrictDock({ left, onBreach, listen = true }: { left: number; onBreach: (b: Breach) => void; listen?: boolean }) {
  const mic = useTalkWatch(listen, () => onBreach("talk"));
  return (
    <div className="fixed right-4 bottom-4 z-[70] w-[210px] space-y-2">
      <SelfView onBreach={onBreach} className="shadow-2xl" />
      {listen && <p className="rounded-lg bg-[#0b0b0d]/90 px-2.5 py-1.5 text-[11px] text-white/70 backdrop-blur">{mic === "on" ? "Mic on: stay silent during the test" : mic === "blocked" ? "Mic blocked: allow it to keep strict mode fair" : "Starting mic…"}</p>}
      <div className="flex justify-end rounded-lg bg-[#0b0b0d]/90 backdrop-blur">
        <ProctorBadge left={left} />
      </div>
    </div>
  );
}

/** Thresholds for the voice check (see useVoiceMatch). */
const STILL_LIPS = 0.09; // mouth() below this = lips not moving (talking moves it 0.15+; face-tracking jitter stays under)
const VOICE_WINDOW = 30; // last 3 s (10 checks a second)
const VOICE_STILL = 6; // strict: ~0.6 s of voice with still lips in that window
const ECHO_MS = 1500; // ignore the mic this long after the interviewer stops speaking

/**
 * Voice check for a spoken interview: the mic hears speech while the camera sees the
 * student's lips still (someone else answering or prompting). Off while the AI
 * interviewer speaks, and for a moment after, so its voice from the speakers doesn't count.
 * Only numbers are used; nothing is recorded or sent.
 */
export function useVoiceMatch(on: boolean, mouth: () => number, paused: boolean, onMismatch: () => void) {
  const [mic, setMic] = useState<"off" | "on" | "blocked">("off");
  /** what the check hears right now, shown on the camera so a student (or tester) can see it working */
  const [hear, setHear] = useState<"quiet" | "you" | "other" | "paused">("quiet");
  const cb = useRef(onMismatch);
  cb.current = onMismatch;
  const mouthRef = useRef(mouth);
  mouthRef.current = mouth;
  const pausedRef = useRef(paused);
  const pausedAt = useRef(0);
  if (pausedRef.current && !paused) pausedAt.current = Date.now();
  pausedRef.current = paused;
  useEffect(() => {
    if (!on) return;
    let dead = false, stream: MediaStream | null = null, ctx: AudioContext | null = null, timer = 0;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setMic("blocked");
      return;
    }
    navigator.mediaDevices
      // noise suppression off here: it can remove a second voice farther from the mic
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      .then((st) => {
        stream = st;
        if (dead) return st.getTracks().forEach((t) => t.stop());
        ctx = new AudioContext();
        void ctx.resume().catch(() => {});
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(st).connect(an);
        setMic("on");
        const bins = new Uint8Array(an.frequencyBinCount);
        const hz = ctx.sampleRate / an.fftSize;
        const lo = Math.floor(300 / hz), hi = Math.ceil(3400 / hz);
        let floor = 0, n = 0, armed = true, quiet = 0, shown = "";
        const say = (h: "quiet" | "you" | "other" | "paused") => {
          if (h !== shown) {
            shown = h;
            setHear(h);
          }
        };
        const recent: number[] = []; // 1 = voice with still lips, 0 = anything else
        timer = window.setInterval(() => {
          an.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = lo; i <= hi; i++) sum += bins[i];
          const level = sum / (hi - lo + 1);
          n++;
          floor = n < 20 ? Math.max(floor, level) : floor * 0.995 + Math.min(level, floor + 4) * 0.005;
          // strict: a quieter voice counts too (someone whispering from the side)
          const voice = n > 20 && level > Math.max(floor * 1.2, floor + 5);
          const muted = pausedRef.current || Date.now() - pausedAt.current < ECHO_MS;
          if (muted) {
            recent.length = 0;
            say("paused");
            return;
          }
          const m = mouthRef.current();
          // strict: a voice while the lips are still, or while no face is in view, is someone else
          const still = voice && m < STILL_LIPS;
          say(!voice ? "quiet" : still ? "other" : "you");
          recent.push(still ? 1 : 0);
          if (recent.length > VOICE_WINDOW) recent.shift();
          quiet = voice ? 0 : quiet + 1;
          if (!armed && quiet >= 12) armed = true;
          if (armed && recent.reduce((a, b) => a + b, 0) >= VOICE_STILL) {
            armed = false;
            recent.length = 0;
            cb.current();
          }
        }, 100);
      })
      .catch(() => setMic("blocked"));
    return () => {
      dead = true;
      window.clearInterval(timer);
      void ctx?.close().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);
  return { mic, hear };
}

/** Camera self-view that reports looking away, leaving the frame, or a second person.
    With `voice`, it also checks that speech heard matches the student's lips moving. */
export function SelfView({ onBreach, className, voice }: { onBreach: (b: Breach) => void; className?: string; voice?: { paused: boolean } }) {
  const video = useRef<HTMLVideoElement>(null);
  const [cam, setCam] = useState<"starting" | "on" | "blocked">("starting");
  const [watching, setWatching] = useState(false);
  const cb = useRef(onBreach);
  cb.current = onBreach;
  const watcher = useRef<{ mouth: () => number } | null>(null);
  const { mic, hear } = useVoiceMatch(!!voice && watching, () => watcher.current?.mouth() ?? -1, voice?.paused ?? false, () => cb.current("voice"));
  useEffect(() => {
    let dead = false;
    let stream: MediaStream | null = null;
    let w: Awaited<ReturnType<typeof watchPresence>> = null;
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
        w = await watchPresence(video.current, clock, () => {}, { secs: LOOK_SECS, on: (k) => cb.current(k), down: !!voice });
        if (dead) return void w?.stop();
        watcher.current = w;
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
      {voice && watching && (
        <span className="absolute top-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[10.5px] text-white/80 backdrop-blur">
          {mic === "blocked" ? "Mic blocked: voice check off" : mic !== "on" ? "Starting voice check…" : hear === "paused" ? "Voice check: interviewer speaking" : hear === "you" ? "Voice check: you’re speaking ✓" : hear === "other" ? "Voice check: lips not moving ⚠" : "Voice check on: only you answer"}
        </span>
      )}
    </div>
  );
}
