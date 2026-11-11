"use client";

/* The AI interviewer's voice, with a mouth level for lip sync.
   Uses the natural cloud voice (/api/tts, Premium) and reads the real audio
   loudness for the mouth. If that isn't available it falls back to the
   browser's own voice and moves the mouth from the words being spoken. */

import { auth } from "@/lib/firebase";
import type { VoiceId } from "@/lib/explainer";
import { bestVoice, voicesReady } from "@/lib/tts";

export type SayResult = "done" | "stopped";

/** Splits text into pieces the voice API accepts (≤ 190 characters). */
export function chunks(text: string, max = 190): string[] {
  const out: string[] = [];
  for (const s of text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*\s*/g) ?? []) {
    let rest = s.trim();
    while (rest.length > max) {
      const cut = rest.lastIndexOf(" ", max);
      out.push(rest.slice(0, cut > 40 ? cut : max));
      rest = rest.slice(cut > 40 ? cut + 1 : max);
    }
    if (rest) out.push(rest);
  }
  return out;
}

const cache = new Map<string, Promise<string | null>>();
let cloudOff = false;

function cloud(text: string, voice: VoiceId): Promise<string | null> {
  const k = `${voice}|${text}`;
  let p = cache.get(k);
  if (!p) {
    p = (async () => {
      if (cloudOff) return null;
      try {
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        if (!token) return null;
        const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, voice }) });
        if (!res.ok || !res.headers.get("content-type")?.includes("audio")) {
          if (res.status !== 429) cloudOff = true;
          return null;
        }
        return URL.createObjectURL(await res.blob());
      } catch {
        return null;
      }
    })();
    cache.set(k, p);
    void p.then((u) => !u && cache.delete(k));
  }
  return p;
}

export interface Talker {
  say: (text: string) => Promise<SayResult>;
  stop: () => void;
  /** how open the mouth should be right now, 0–1 */
  level: () => number;
  /** start fetching the natural voice for text that will be said soon */
  prefetch: (text: string) => void;
  engine: () => "natural" | "browser";
  dispose: () => void;
}

export function createTalker(voice: VoiceId = "hannah"): Talker {
  let run = 0;
  let audio: HTMLAudioElement | null = null;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let buf: Uint8Array<ArrayBuffer> | null = null;
  let mode: "natural" | "browser" = "natural";
  // browser-voice mouth: when the current word started and how long it is
  let browserSpeaking = false;
  let wordAt = 0;
  let wordLen = 0;
  let smooth = 0;

  const ensureAudio = () => {
    if (audio) return audio;
    audio = new Audio();
    audio.crossOrigin = "anonymous";
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      buf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      src.connect(analyser);
      analyser.connect(ctx.destination);
    } catch {
      analyser = null;
    }
    return audio;
  };

  const play = (url: string, my: number) =>
    new Promise<SayResult>((resolve) => {
      const a = ensureAudio();
      void ctx?.resume();
      a.src = url;
      a.onended = () => resolve(my === run ? "done" : "stopped");
      a.onerror = () => resolve(my === run ? "done" : "stopped");
      a.onpause = () => my !== run && resolve("stopped");
      a.play().catch(() => resolve(my === run ? "done" : "stopped"));
    });

  const browserSay = async (text: string, my: number): Promise<SayResult> => {
    if (!("speechSynthesis" in window)) return "done";
    const voices = await voicesReady();
    if (my !== run) return "stopped";
    const v = bestVoice(voices);
    const parts = chunks(text, 220);
    for (const part of parts) {
      const r = await new Promise<SayResult>((resolve) => {
        const u = new SpeechSynthesisUtterance(part);
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        }
        u.rate = 0.98;
        u.onstart = () => {
          browserSpeaking = true;
          wordAt = performance.now();
          wordLen = 0;
        };
        u.onboundary = (e) => {
          wordAt = performance.now();
          wordLen = e.charLength || part.slice(e.charIndex).split(/\s/)[0].length;
        };
        const end = () => {
          browserSpeaking = false;
          resolve(my === run ? "done" : "stopped");
        };
        u.onend = end;
        u.onerror = end;
        window.speechSynthesis.speak(u);
      });
      if (r === "stopped" || my !== run) return "stopped";
    }
    return "done";
  };

  const stop = () => {
    run++;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    browserSpeaking = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  return {
    stop,
    engine: () => mode,
    prefetch: (text) => chunks(text).slice(0, 2).forEach((c) => void cloud(c, voice)),
    async say(text) {
      stop();
      const my = run;
      const parts = chunks(text);
      if (!parts.length) return "done";
      // natural voice, piece by piece (fetch the next piece while this one plays)
      const first = await cloud(parts[0], voice);
      if (my !== run) return "stopped";
      if (first) {
        mode = "natural";
        let url: string | null = first;
        for (let k = 0; k < parts.length; k++) {
          const nextP = k + 1 < parts.length ? cloud(parts[k + 1], voice) : null;
          if (!url) break;
          const r = await play(url, my);
          if (r === "stopped" || my !== run) return "stopped";
          url = nextP ? await nextP : null;
          if (nextP && !url) return browserSay(parts.slice(k + 1).join(" "), my);
        }
        return "done";
      }
      mode = "browser";
      return browserSay(text, my);
    },
    level() {
      let target = 0;
      if (analyser && buf && audio && !audio.paused) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let k = 0; k < buf.length; k++) {
          const v = (buf[k] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(1, Math.sqrt(sum / buf.length) * 5.5);
      } else if (browserSpeaking) {
        // open and close once per syllable-ish beat within the current word
        const t = (performance.now() - wordAt) / 1000;
        const dur = Math.max(0.18, (wordLen || 4) * 0.065);
        const env = t < dur ? Math.sin((t / dur) * Math.PI) : 0.15;
        target = 0.25 + 0.6 * env * (0.6 + 0.4 * Math.abs(Math.sin(t * 17)));
      }
      smooth += (target - smooth) * (target > smooth ? 0.55 : 0.3);
      return smooth;
    },
    dispose() {
      stop();
      void ctx?.close().catch(() => {});
      ctx = null;
      analyser = null;
      audio = null;
    },
  };
}
