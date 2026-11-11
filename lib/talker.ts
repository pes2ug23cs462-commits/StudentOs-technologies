"use client";

/* The AI interviewer's voice (a woman's voice), with a mouth level for lip sync.

   English: the natural cloud voice (/api/tts, Premium). Every piece of the
   question is fetched first, silence at the edges is trimmed, and the pieces
   are played back to back with Web Audio, so the voice doesn't stop and start.
   The mouth follows the real loudness of the audio.

   Hindi, or if the cloud voice isn't available: the best female voice the
   device has for that language (e.g. Microsoft Swara / Google हिन्दी), with the
   mouth following the words being spoken. */

import { auth } from "@/lib/firebase";
import type { VoiceId } from "@/lib/explainer";
import { voicesReady } from "@/lib/tts";

export type SayResult = "done" | "stopped";
export type TalkLang = "en" | "hi";

/** Splits text into sentence pieces the voice API accepts (≤ 190 characters). */
export function chunks(text: string, max = 190): string[] {
  const out: string[] = [];
  for (const s of text.replace(/\s+/g, " ").trim().match(/[^.!?।]+[.!?।]*\s*/g) ?? []) {
    let rest = s.trim();
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max));
      out.push(rest.slice(0, cut > 40 ? cut : max));
      rest = rest.slice(cut > 40 ? cut + 1 : max).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/* ---------- picking a good female device voice ---------- */

const FEMALE = /female|woman|aria|jenny|ava|emma|michelle|sonia|libby|natasha|neerja|swara|ananya|kavya|samantha|victoria|karen|moira|tessa|veena|lekha|zira|heera|kalpana|susan|hazel|serena|allison|joanna|kendra|salli|raveena|aditi|google uk english female|google हिन्दी|google us english/i;
const MALE = /\bmale\b|guy|ryan|davis|andrew|brian|christopher|eric|roger|steffan|prabhat|madhur|hemant|ravi|daniel|alex|fred|rishi|aaron|arthur|thomas|oliver|george|david|mark|james|google uk english male/i;

export function pickVoice(voices: SpeechSynthesisVoice[], lang: TalkLang): SpeechSynthesisVoice | null {
  const want = lang === "hi" ? /^hi/i : /^en/i;
  const list = voices.filter((v) => want.test(v.lang) || (lang === "hi" && /hindi|हिन्दी/i.test(v.name)));
  if (!list.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (FEMALE.test(v.name)) n += 50;
    if (MALE.test(v.name)) n -= 80;
    if (/natural|online|neural|enhanced|premium/i.test(v.name)) n += 30;
    if (/google/i.test(v.name)) n += 12;
    if (lang === "en" && /en-IN/i.test(v.lang)) n += 8;
    if (lang === "en" && /en-(GB|US)/i.test(v.lang)) n += 4;
    if (v.localService === false) n += 4;
    return n;
  };
  return [...list].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Whether this device can speak Hindi at all. */
export async function hasHindiVoice() {
  return !!pickVoice(await voicesReady(), "hi");
}

/* ---------- natural cloud voice ---------- */

const cache = new Map<string, Promise<ArrayBuffer | null>>();
let cloudOff = false;

function cloud(text: string, voice: VoiceId): Promise<ArrayBuffer | null> {
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
        return await res.arrayBuffer();
      } catch {
        return null;
      }
    })();
    cache.set(k, p);
    void p.then((b) => !b && cache.delete(k));
  }
  return p;
}

/** Start and length (seconds) of the part of a clip that isn't silence. */
function trim(buf: AudioBuffer): [number, number] {
  const d = buf.getChannelData(0);
  const th = 0.012;
  let a = 0;
  let z = d.length - 1;
  while (a < z && Math.abs(d[a]) < th) a++;
  while (z > a && Math.abs(d[z]) < th) z--;
  if (z <= a) return [0, buf.duration];
  const pad = Math.round(0.04 * buf.sampleRate);
  a = Math.max(0, a - pad);
  z = Math.min(d.length - 1, z + pad);
  return [a / buf.sampleRate, (z - a) / buf.sampleRate];
}

// typed by inference so it builds on both older and newer TypeScript versions
const newBuf = (n: number) => new Uint8Array(new ArrayBuffer(n));

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

export function createTalker(opts: { voice?: VoiceId; lang?: TalkLang } = {}): Talker {
  const voice = opts.voice ?? "hannah";
  const lang = opts.lang ?? "en";
  let run = 0;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let buf: ReturnType<typeof newBuf> | null = null;
  let sources: AudioBufferSourceNode[] = [];
  let playingUntil = 0;
  let mode: "natural" | "browser" = lang === "en" ? "natural" : "browser";
  // browser-voice mouth: when the current word started and how long it is
  let browserSpeaking = false;
  let wordAt = 0;
  let wordLen = 0;
  let smooth = 0;

  const audio = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    buf = newBuf(analyser.fftSize);
    analyser.connect(ctx.destination);
    return ctx;
  };

  const naturalSay = async (parts: string[], my: number): Promise<SayResult | null> => {
    const raw = await Promise.all(parts.map((p) => cloud(p, voice)));
    if (my !== run) return "stopped";
    if (raw.some((r) => !r)) return null;
    let c: AudioContext;
    try {
      c = audio();
      await c.resume();
    } catch {
      return null;
    }
    const clips: AudioBuffer[] = [];
    for (const r of raw) {
      try {
        clips.push(await c.decodeAudioData(r!.slice(0)));
      } catch {
        return null;
      }
    }
    if (my !== run) return "stopped";
    // every piece back to back, with a short natural pause between sentences
    let t = c.currentTime + 0.06;
    sources = clips.map((clip, k) => {
      const [off, dur] = trim(clip);
      const src = c.createBufferSource();
      src.buffer = clip;
      src.connect(analyser!);
      src.start(t, off, dur);
      t += dur + (k < clips.length - 1 ? 0.16 : 0);
      return src;
    });
    playingUntil = t;
    return new Promise<SayResult>((resolve) => {
      sources[sources.length - 1].onended = () => resolve(my === run ? "done" : "stopped");
    });
  };

  const browserSay = async (text: string, my: number): Promise<SayResult> => {
    if (!("speechSynthesis" in window)) return "done";
    const v = pickVoice(await voicesReady(), lang);
    if (my !== run) return "stopped";
    for (const part of chunks(text, 220)) {
      const r = await new Promise<SayResult>((resolve) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = v?.lang ?? (lang === "hi" ? "hi-IN" : "en-IN");
        if (v) u.voice = v;
        u.rate = lang === "hi" ? 0.95 : 0.97;
        u.pitch = 1.05;
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
    for (const s of sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* not started */
      }
    }
    sources = [];
    playingUntil = 0;
    browserSpeaking = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  return {
    stop,
    engine: () => mode,
    prefetch: (text) => {
      if (lang === "en") chunks(text).forEach((c) => void cloud(c, voice));
    },
    async say(text) {
      stop();
      const my = run;
      const parts = chunks(text);
      if (!parts.length) return "done";
      if (lang === "en" && !cloudOff) {
        const r = await naturalSay(parts, my);
        if (r) {
          mode = "natural";
          return r;
        }
        if (my !== run) return "stopped";
      }
      mode = "browser";
      return browserSay(text, my);
    },
    level() {
      let target = 0;
      if (analyser && buf && ctx && ctx.currentTime < playingUntil) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let k = 0; k < buf.length; k++) {
          const v = (buf[k] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(1, Math.sqrt(sum / buf.length) * 5.5);
      } else if (browserSpeaking) {
        // open and close in beats within the current word
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
    },
  };
}
