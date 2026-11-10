"use client";

/* One long video (a one shot or full lecture) split into short modules, like
   courses in Learning: modules from the video's own chapters when it has them,
   otherwise about every 15 minutes. Each module plays on its own and is ticked
   when finished; there's a notes box for the video, and “Full screen” keeps
   the player, modules and notes inside StudentOS (YouTube's own full-screen
   button is hidden). */

import { useEffect, useMemo, useRef, useState } from "react";
import { YouTubePlayer } from "@/components/videos/player";
import { CheckIcon, MaximizeIcon, XIcon } from "@/components/ui/icons";
import type { YtVideo } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export interface VideoModule {
  title: string;
  from: number;
  to: number;
}

const TARGET = 15 * 60;
const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
};

/** Short modules: the video's chapters merged into ~15-minute pieces, or even 15-minute parts. */
export function splitVideo(v: Pick<YtVideo, "seconds" | "chapters" | "title">): VideoModule[] {
  const secs = v.seconds || 0;
  if (!secs) return [{ title: v.title, from: 0, to: 0 }];
  const ch = (v.chapters ?? []).filter((c) => c.t >= 0 && c.t < secs).sort((a, b) => a.t - b.t);
  if (ch.length >= 2) {
    const out: VideoModule[] = [];
    let cur: { titles: string[]; from: number } | null = null;
    ch.forEach((c, i) => {
      const end = ch[i + 1]?.t ?? secs;
      if (!cur) cur = { titles: [c.title], from: c.t };
      else cur.titles.push(c.title);
      if (end - cur.from >= TARGET * 0.6 || i === ch.length - 1) {
        out.push({ title: cur.titles[0] + (cur.titles.length > 1 ? ` + ${cur.titles.length - 1} more` : ""), from: cur.from, to: end });
        cur = null;
      }
    });
    if (out[0] && out[0].from > 0) out[0].from = 0;
    return out.slice(0, 30);
  }
  const n = Math.max(1, Math.min(24, Math.round(secs / TARGET)));
  return Array.from({ length: n }, (_, i) => ({ title: n > 1 ? `Part ${i + 1}` : v.title, from: Math.round((i * secs) / n), to: Math.round(((i + 1) * secs) / n) }));
}

export function ModulePlayer({
  video,
  done,
  notes,
  onDone,
  onNotes,
  onClose,
}: {
  video: YtVideo;
  /** module indexes already finished */
  done: number[];
  notes: string;
  onDone: (index: number) => void;
  onNotes: (text: string) => void;
  onClose: () => void;
}) {
  const mods = useMemo(() => splitVideo(video), [video]);
  const [i, setI] = useState(() => Math.min(mods.length - 1, Math.max(0, mods.findIndex((_, k) => !done.includes(k)))));
  const [auto, setAuto] = useState(false);
  const [text, setText] = useState(notes);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const m = mods[i];

  // notes save as you type
  useEffect(() => {
    if (text === notes) return;
    const t = setTimeout(() => onNotes(text), 500);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void box.current?.requestFullscreen?.().catch(() => {});
  };

  const finish = (k: number) => {
    if (!done.includes(k)) onDone(k);
  };
  const go = (k: number) => {
    setAuto(true);
    setI(k);
  };

  return (
    <div ref={box} className={cn("mp-box", full && "flex h-full flex-col overflow-auto bg-ink p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{video.title}</p>
          <p className="text-[11.5px] text-white/50">
            {video.channel} · {mods.length} module{mods.length > 1 ? "s" : ""} · {done.length}/{mods.length} done
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"} title={full ? "Exit full screen" : "Full screen"} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12px] text-white/75 hover:bg-white/[0.06] hover:text-white">
            <MaximizeIcon size={12} /> {full ? "Exit" : "Full screen"}
          </button>
          {!full && (
            <button type="button" onClick={onClose} aria-label="Close video" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white">
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={cn("mt-3 grid gap-4", full && "flex-1 lg:grid-cols-[1fr_340px]")}>
        <div className="min-w-0">
          <YouTubePlayer
            key={`${video.id}-${i}`}
            videoKey={`v:${video.id}`}
            start={m.from}
            end={m.to}
            fs={false}
            autoplay={auto}
            onProgress={(t, _d, _w, ended) => {
              if (ended || (m.to && t >= m.to - 3)) finish(i);
            }}
            onEnded={() => {
              finish(i);
              if (i + 1 < mods.length) go(i + 1);
            }}
          />
          <p className="mt-2 text-[12.5px] font-medium text-white">
            Module {i + 1}: {m.title}
            {m.to > 0 && (
              <span className="ml-2 font-normal text-white/45 tabular-nums">
                {clock(m.from)} – {clock(m.to)}
              </span>
            )}
          </p>
        </div>

        <div className={cn("grid gap-4", !full && "sm:grid-cols-2")}>
          <div>
            <p className="text-[12px] font-semibold text-white/70">Modules</p>
            <ol className={cn("mt-1.5 space-y-1 overflow-y-auto pr-1", full ? "max-h-[45vh]" : "max-h-[220px]")}>
              {mods.map((x, k) => (
                <li key={k}>
                  <button type="button" onClick={() => go(k)} aria-current={k === i ? "true" : undefined} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors", k === i ? "bg-[var(--color-plum)]" : "hover:bg-white/[0.04]")}>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums", done.includes(k) ? "border-emerald-400 bg-emerald-400 text-[#ffffff]" : k === i ? "border-accent text-accent" : "border-white/25 text-white/50")}>
                      {done.includes(k) ? <CheckIcon size={10} /> : k + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-white">{x.title}</span>
                      {x.to > 0 && <span className="block text-[10.5px] text-white/40 tabular-nums">{Math.max(1, Math.round((x.to - x.from) / 60))} min</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col">
            <label htmlFor={`mp-notes-${video.id}`} className="text-[12px] font-semibold text-white/70">
              My notes
            </label>
            <textarea
              id={`mp-notes-${video.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={full ? 12 : 7}
              placeholder={`Write while you watch… (Module ${i + 1}: ${m.title})`}
              className="mt-1.5 w-full flex-1 resize-none rounded-xl border border-white/10 bg-field px-3 py-2.5 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-accent"
            />
            <p className="mt-1 text-[10.5px] text-white/35">Saved automatically on your account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
