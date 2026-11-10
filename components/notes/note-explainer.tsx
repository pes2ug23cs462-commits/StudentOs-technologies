"use client";

/* “Explain with AI”: plays a student's notes as a short animated lesson.
   A narrator reads each line (natural Orpheus voice from /api/tts, or the
   browser's best voice if that isn't available) while the scene's visual
   builds up item by item, with live captions underneath. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, RepeatIcon, VolumeIcon, XIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { auth } from "@/lib/firebase";
import { VOICES, type Scene, type VoiceId } from "@/lib/explainer";
import { bestVoice, voicesReady } from "@/lib/tts";
import { cn } from "@/lib/utils";

const VOICE_KEY = "studentos:explain-voice";
const SPEEDS = [0.85, 1, 1.15, 1.3];

/* ---------------- narrator ---------------- */

type Said = "done" | "stopped";
const audioCache = new Map<string, Promise<string | null>>();
let cloudOff = false;

function cloudAudio(text: string, voice: VoiceId): Promise<string | null> {
  const k = `${voice}|${text}`;
  let p = audioCache.get(k);
  if (!p) {
    p = (async () => {
      if (cloudOff) return null;
      try {
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        if (!token) return null;
        const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, voice }) });
        if (!res.ok || !res.headers.get("content-type")?.includes("audio")) {
          // not set up or out of quota: use the browser voice from now on
          if (res.status !== 429) cloudOff = true;
          return null;
        }
        return URL.createObjectURL(await res.blob());
      } catch {
        return null;
      }
    })();
    audioCache.set(k, p);
    void p.then((url) => !url && audioCache.delete(k));
  }
  return p;
}

function useNarrator() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [engine, setEngine] = useState<"natural" | "browser">("natural");

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  /** Speaks one line; onProgress gets 0–1 as it goes. */
  const say = useCallback(
    async (text: string, voice: VoiceId, rate: number, onProgress: (p: number) => void): Promise<Said> => {
      stop();
      let stopped = false;
      let finish: (r: Said) => void = () => {};
      const result = new Promise<Said>((r) => (finish = r));
      stopRef.current = () => {
        stopped = true;
        finish("stopped");
      };

      const url = await cloudAudio(text, voice);
      if (stopped) return "stopped";

      if (url) {
        setEngine("natural");
        const a = (audio.current ??= new Audio());
        a.src = url;
        a.playbackRate = rate;
        let raf = 0;
        const tick = () => {
          if (a.duration) onProgress(Math.min(1, a.currentTime / a.duration));
          raf = requestAnimationFrame(tick);
        };
        a.onended = () => {
          cancelAnimationFrame(raf);
          onProgress(1);
          finish("done");
        };
        a.onerror = () => {
          cancelAnimationFrame(raf);
          finish("done");
        };
        stopRef.current = () => {
          stopped = true;
          cancelAnimationFrame(raf);
          a.pause();
          finish("stopped");
        };
        try {
          await a.play();
          raf = requestAnimationFrame(tick);
        } catch {
          finish("stopped");
        }
        return result;
      }

      // browser voice
      setEngine("browser");
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        // no voice at all: give reading time instead
        const t = setTimeout(() => finish("done"), Math.max(2500, text.length * 55));
        stopRef.current = () => {
          clearTimeout(t);
          finish("stopped");
        };
        return result;
      }
      const voices = await voicesReady();
      if (stopped) return "stopped";
      const synth = window.speechSynthesis;
      synth.cancel();
      await new Promise((r) => setTimeout(r, 80));
      if (stopped) return "stopped";
      const u = new SpeechSynthesisUtterance(text);
      const v = bestVoice(voices);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.rate = 0.97 * rate;
      u.onboundary = (e) => onProgress(Math.min(1, (e.charIndex + (e.charLength || 1)) / text.length));
      // some browsers never fire onend: move on after a generous reading time
      const guard = setTimeout(() => finish("done"), (text.length * 95) / rate + 4000);
      u.onend = () => {
        clearTimeout(guard);
        onProgress(1);
        finish("done");
      };
      u.onerror = () => {
        clearTimeout(guard);
        finish(stopped ? "stopped" : "done");
      };
      stopRef.current = () => {
        stopped = true;
        clearTimeout(guard);
        synth.cancel();
        finish("stopped");
      };
      synth.speak(u);
      return result;
    },
    [stop],
  );

  useEffect(() => () => stop(), [stop]);
  return { say, stop, engine, prefetch: (t: string, v: VoiceId) => void cloudAudio(t, v) };
}

/* ---------------- player ---------------- */

export function NoteExplainer({ title, scenes, onClose }: { title: string; scenes: Scene[]; onClose: () => void }) {
  const [scene, setScene] = useState(0);
  const [line, setLine] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [prog, setProg] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState<VoiceId>("hannah");
  const narrator = useNarrator();
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VOICE_KEY);
      if (VOICES.some((x) => x.id === v)) setVoice(v as VoiceId);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const s = scenes[scene];
  const total = useMemo(() => scenes.reduce((a, x) => a + x.lines.length, 0), [scenes]);
  const before = useMemo(() => scenes.slice(0, scene).reduce((a, x) => a + x.lines.length, 0), [scenes, scene]);

  // speak the current line while playing, then move on
  useEffect(() => {
    if (!playing || !s) return;
    let alive = true;
    setProg(0);
    const next = s.lines[line + 1] ?? scenes[scene + 1]?.lines[0];
    if (next) narrator.prefetch(next, voice);
    narrator.say(s.lines[line], voice, speed, (p) => alive && setProg(p)).then(async (r) => {
      if (!alive || r !== "done") return;
      if (line + 1 < s.lines.length) return setLine(line + 1);
      await new Promise((res) => setTimeout(res, 650));
      if (!alive) return;
      if (scene + 1 < scenes.length) {
        setScene(scene + 1);
        setLine(0);
      } else {
        setPlaying(false);
        setEnded(true);
      }
    });
    return () => {
      alive = false;
      narrator.stop();
    };
  }, [playing, scene, line, voice, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i: number) => {
    const k = Math.max(0, Math.min(scenes.length - 1, i));
    setScene(k);
    setLine(0);
    setProg(0);
    setEnded(false);
  };
  const toggle = () => {
    if (ended) {
      go(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("select")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") go(scene + 1);
    else if (e.key === "ArrowLeft") go(scene - 1);
    else if (e.key === "Escape") onClose();
  };

  useEffect(() => stage.current?.focus(), []);

  if (!s) return null;
  // how much of the visual is shown: grows with each spoken line
  const progressive = !ended && (playing || line > 0 || prog > 0);
  const share = progressive ? Math.min(1, Math.max(1, line + (prog > 0.35 ? 1 : 0)) / s.lines.length) : 1;
  const captionWords = s.lines[line].split(" ");
  const lit = Math.round(captionWords.length * prog);
  const overall = (before + line + prog) / total;

  return (
    <div ref={stage} tabIndex={-1} onKeyDown={onKey} className="outline-none" role="region" aria-label={`Animated explanation of ${title}`}>
      <div className="explain-stage relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(124,58,237,0.22),transparent_60%)]">
        <div aria-hidden className="explain-grid pointer-events-none absolute inset-0" />
        <div className="relative flex min-h-[460px] flex-col p-5 sm:aspect-video sm:min-h-0 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] font-semibold tracking-wide text-violet-300 uppercase">
              Scene {scene + 1} of {scenes.length}
            </p>
            <button type="button" onClick={onClose} aria-label="Close explanation" className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
              <XIcon size={15} />
            </button>
          </div>
          <h3 key={`t${scene}`} className="explain-in mt-1 text-[21px] leading-tight font-bold tracking-tight text-white sm:text-[26px]">
            {s.title}
          </h3>

          <div key={`v${scene}`} className="flex flex-1 items-center justify-center py-4">
            <Visual scene={s} share={share} />
          </div>

          {/* narrator + captions */}
          <div className="flex items-end gap-3">
            <Narrator speaking={playing} />
            <p aria-live="polite" className="min-h-[44px] flex-1 rounded-xl bg-[#0b0a12]/75 px-3.5 py-2.5 text-[13.5px] leading-snug text-[#ffffff] backdrop-blur sm:text-[15px]">
              {captionWords.map((w, i) => (
                <span key={i} className={cn("transition-colors duration-150", playing && i >= lit ? "text-[#ffffff]/45" : "")}>
                  {w}{" "}
                </span>
              ))}
            </p>
          </div>
        </div>
        {!playing && !ended && scene === 0 && line === 0 && prog === 0 && (
          <button type="button" onClick={toggle} className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" aria-label="Play the explanation">
            <span className="explain-pulse flex h-16 w-16 items-center justify-center rounded-full bg-accent text-black shadow-[0_10px_40px_-6px_rgba(124,58,237,0.8)]">
              <PlayIcon size={22} />
            </span>
          </button>
        )}
      </div>

      {/* progress by scene */}
      <div className="mt-3 flex gap-1" role="tablist" aria-label="Scenes">
        {scenes.map((x, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === scene}
            aria-label={`Scene ${i + 1}: ${x.title}`}
            title={x.title}
            onClick={() => go(i)}
            className="group h-3 flex-1 py-1"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-white/12 group-hover:bg-white/25">
              <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${i < scene || (ended && i === scene) ? 100 : i === scene ? ((line + prog) / x.lines.length) * 100 : 0}%` }} />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => go(scene - 1)} disabled={scene === 0} aria-label="Previous scene" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 hover:bg-white/[0.07] disabled:opacity-35">
          <ChevronLeftIcon size={16} />
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : ended ? "Play again" : "Play"} className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black hover:bg-accent-hover">
          {playing ? <PauseIcon size={16} /> : ended ? <RepeatIcon size={16} /> : <PlayIcon size={15} />}
        </button>
        <button type="button" onClick={() => go(scene + 1)} disabled={scene === scenes.length - 1} aria-label="Next scene" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 hover:bg-white/[0.07] disabled:opacity-35">
          <ChevronRightIcon size={16} />
        </button>
        <span className="ml-1 text-[12px] text-white/50 tabular-nums">{Math.round(overall * 100)}%</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12.5px] text-white/75">
            <VolumeIcon size={13} />
            <span className="sr-only">Voice</span>
            <select
              value={voice}
              onChange={(e) => {
                const v = e.target.value as VoiceId;
                setVoice(v);
                try {
                  localStorage.setItem(VOICE_KEY, v);
                } catch {
                  /* ignore */
                }
              }}
              className="bg-transparent text-white outline-none [&>option]:bg-[#ffffff] [&>option]:text-[#111111]"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {v.sub}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12.5px] text-white/75">
            <span className="sr-only">Speed</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-transparent text-white outline-none [&>option]:bg-[#ffffff] [&>option]:text-[#111111]">
              {SPEEDS.map((x) => (
                <option key={x} value={x}>
                  {x}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {narrator.engine === "browser" && <p className="mt-2 text-[11.5px] text-white/45">Using your device’s voice right now. The natural voice comes back when it’s available.</p>}
    </div>
  );
}

function Narrator({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden>
      <span className={cn("absolute inset-0 rounded-full bg-violet-500/25", speaking && "explain-ring")} />
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/40 bg-[#16131f]">
        <LogoMark size={20} />
      </span>
      <span className="absolute -right-1 -bottom-0.5 flex h-4 items-end gap-[2px] rounded-full bg-[#16131f] px-1 py-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("w-[3px] rounded-full bg-violet-300", speaking ? "explain-bar" : "h-[3px]")} style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    </div>
  );
}

/* ---------------- visuals ---------------- */

function Visual({ scene, share }: { scene: Scene; share: number }) {
  const v = scene.visual;
  const shown = (n: number) => Math.max(1, Math.ceil(n * share));
  switch (v.type) {
    case "title":
      return (
        <div className="text-center">
          <div className="explain-pop mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
            <LogoMark size={30} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {v.items.slice(0, shown(v.items.length)).map((x, i) => (
              <span key={i} className="explain-pop rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-[13px] font-medium text-violet-100">
                {x.label}
              </span>
            ))}
          </div>
        </div>
      );
    case "flow":
      return (
        <ol className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
          {v.items.slice(0, shown(v.items.length)).map((x, i, arr) => (
            <li key={i} className="flex flex-col items-center gap-2 sm:flex-row">
              <Box n={i + 1} item={x} active={i === arr.length - 1} />
              {i < v.items.length - 1 && i < arr.length - 1 && <span className="explain-arrow text-violet-300">→</span>}
            </li>
          ))}
        </ol>
      );
    case "steps":
      return (
        <ol className="w-full max-w-[520px] space-y-2.5">
          {v.items.slice(0, shown(v.items.length)).map((x, i, arr) => (
            <li key={i} className="explain-pop flex items-start gap-3">
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold", i === arr.length - 1 ? "bg-accent text-black" : "bg-violet-500/20 text-violet-200")}>{i + 1}</span>
              <span>
                <span className="block text-[14.5px] font-semibold text-white">{x.label}</span>
                {x.note && <span className="block text-[12.5px] text-white/60">{x.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      );
    case "cycle": {
      const n = v.items.length;
      const k = shown(n);
      return (
        <div className="relative aspect-square w-full max-w-[300px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="0.6" strokeDasharray="2 2" />
          </svg>
          <div className="explain-orbit absolute inset-0" aria-hidden>
            <span className="absolute top-[14%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-semibold tracking-wide text-violet-300/80 uppercase">Repeats</span>
          </div>
          {v.items.slice(0, k).map((x, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            return (
              <span
                key={i}
                className={cn("explain-pop absolute max-w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1 text-center text-[11.5px] leading-tight font-semibold sm:text-[12.5px]", i === k - 1 ? "border-accent bg-violet-500/25 text-white" : "border-white/15 bg-white/[0.08] text-white/85 backdrop-blur")}
                style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%` }}
              >
                {x.label}
              </span>
            );
          })}
        </div>
      );
    }
    case "compare": {
      const L = v.left!;
      const R = v.right!;
      const all = L.points.length + R.points.length;
      const k = shown(all);
      const col = (side: typeof L, from: number, tone: string) => (
        <div className={cn("rounded-xl border p-4", tone)}>
          <p className="text-[15px] font-bold text-white">{side.label}</p>
          <ul className="mt-2 space-y-1.5">
            {side.points.map((p, i) =>
              from + i < k ? (
                <li key={i} className="explain-pop flex gap-2 text-[13px] leading-snug text-white/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                  {p}
                </li>
              ) : null,
            )}
          </ul>
        </div>
      );
      return (
        <div className="grid w-full max-w-[720px] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          {col(L, 0, "border-violet-400/30 bg-violet-500/10")}
          <span className="explain-pop mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[11.5px] font-bold text-white">VS</span>
          {col(R, L.points.length, "border-sky-400/30 bg-sky-500/10")}
        </div>
      );
    }
    case "formula":
      return (
        <div className="w-full max-w-[620px] text-center">
          <p className="explain-pop rounded-2xl border border-violet-400/30 bg-black/30 px-4 py-4 font-mono text-[20px] font-semibold tracking-wide text-white sm:text-[26px]">{v.formula}</p>
          <dl className="mt-4 grid gap-2 text-left sm:grid-cols-2">
            {v.items.slice(0, shown(v.items.length)).map((x, i) => (
              <div key={i} className="explain-pop rounded-lg bg-white/[0.05] px-3 py-2">
                <dt className="font-mono text-[13.5px] font-bold text-violet-200">{x.label}</dt>
                {x.note && <dd className="text-[12.5px] text-white/65">{x.note}</dd>}
              </div>
            ))}
          </dl>
        </div>
      );
    default:
      return (
        <div className={cn("grid w-full max-w-[760px] gap-2.5", v.items.length > 2 ? "sm:grid-cols-2" : "")}>
          {v.items.slice(0, shown(v.items.length)).map((x, i, arr) => (
            <Box key={i} n={i + 1} item={x} active={i === arr.length - 1} wide />
          ))}
        </div>
      );
  }
}

function Box({ n, item, active, wide }: { n: number; item: { label: string; note?: string }; active: boolean; wide?: boolean }) {
  return (
    <div className={cn("explain-pop rounded-xl border px-3.5 py-3 transition-colors duration-300", wide ? "w-full" : "w-full sm:w-[150px]", active ? "border-accent/70 bg-violet-500/20 shadow-[0_0_30px_-8px_rgba(124,58,237,0.8)]" : "border-white/12 bg-white/[0.05]")}>
      <span className="flex items-start gap-2.5">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11.5px] font-bold", active ? "bg-accent text-black" : "bg-violet-500/20 text-violet-200")}>{n}</span>
        <span className="min-w-0">
          <span className="block text-[13.5px] leading-snug font-semibold text-white">{item.label}</span>
          {item.note && <span className="mt-0.5 block text-[12px] leading-snug text-white/60">{item.note}</span>}
        </span>
      </span>
    </div>
  );
}
