"use client";

/* YouTube’s official embedded player (privacy-enhanced youtube-nocookie host),
   driven through the IFrame Player API so StudentOS can remember where the
   student stopped. Ads and YouTube branding are YouTube’s and stay as they are. */

import { useEffect, useRef, useState } from "react";
import { parseYt } from "@/lib/learn";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;
function loadApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube player could not load"));
      };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export function watchUrl(key: string) {
  const { video, list } = parseYt(key);
  return video ? `https://www.youtube.com/watch?v=${video}` : `https://www.youtube.com/playlist?list=${list}`;
}

function embedUrl(key: string, start: number, end: number) {
  const { video, list } = parseYt(key);
  const base = "https://www.youtube-nocookie.com/embed/";
  return video
    ? `${base}${video}?rel=0&playsinline=1&start=${Math.floor(start)}${end > 0 ? `&end=${Math.floor(end)}` : ""}`
    : `${base}videoseries?list=${list}&rel=0&playsinline=1`;
}

export function YouTubePlayer({
  videoKey,
  start = 0,
  end = 0,
  onProgress,
  onEnded,
  onUntracked,
  fs = true,
  autoplay = false,
}: {
  /** false: hide YouTube's own full-screen button (the page offers its own) */
  fs?: boolean;
  autoplay?: boolean;
  videoKey: string;
  start?: number;
  /** stop here (seconds); 0 = play to the end */
  end?: number;
  /** called about every 10 s while playing, on pause and on leave.
      watched = seconds really played since the last call (skips and seeks don’t count) */
  onProgress?: (t: number, d: number, watched: number, ended: boolean) => void;
  onEnded?: (d: number) => void;
  /** told when progress can’t be tracked (player API failed to load) */
  onUntracked?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onProgress, onEnded, onUntracked });
  cb.current = { onProgress, onEnded, onUntracked };
  const [mode, setMode] = useState<"api" | "plain">("api");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(false);
    if (mode !== "api" || !host.current) return;
    let player: any;
    let timer: ReturnType<typeof setInterval> | undefined;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    // Count only real playback: each second, add how far the video moved,
    // but ignore jumps (seeking ahead) and anything outside this lesson.
    let last = -1;
    let watched = 0;
    const tick = () => {
      try {
        const t = player?.getCurrentTime?.() ?? 0;
        const rate = player?.getPlaybackRate?.() ?? 1;
        const delta = t - last;
        const inRange = t >= start - 1 && (end <= 0 || t <= end + 1);
        if (last >= 0 && delta > 0 && delta <= 1.5 * rate + 0.6 && inRange) watched += delta;
        last = t;
      } catch {
        /* player gone */
      }
    };
    const mount = document.createElement("div");
    host.current.replaceChildren(mount);
    const { video, list } = parseYt(videoKey);
    const report = (ended = false) => {
      try {
        const t = player?.getCurrentTime?.() ?? 0;
        const d = player?.getDuration?.() ?? 0;
        if (t > 0) cb.current.onProgress?.(t, d, watched, ended);
        watched = 0;
      } catch {
        /* player gone */
      }
    };

    loadApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          ...(video ? { videoId: video } : {}),
          playerVars: {
            rel: 0,
            playsinline: 1,
            ...(fs ? {} : { fs: 0 }),
            ...(autoplay ? { autoplay: 1 } : {}),
            ...(video ? { start: Math.floor(start), ...(end > 0 ? { end: Math.floor(end) } : {}) } : { listType: "playlist", list }),
          },
          events: {
            onStateChange: (e: any) => {
              if (e.data === 1) {
                clearInterval(timer);
                clearInterval(ticker);
                last = player.getCurrentTime?.() ?? -1;
                ticker = setInterval(tick, 1000);
                timer = setInterval(() => report(), 10000);
              } else {
                tick();
                clearInterval(timer);
                clearInterval(ticker);
                last = -1;
                if (e.data === 2) report();
                if (e.data === 0 && video) {
                  report(true);
                  cb.current.onEnded?.(player.getDuration?.() ?? 0);
                }
              }
            },
            // 101 / 150: the owner turned off playing on other websites
            onError: (e: any) => {
              if (e.data === 101 || e.data === 150 || e.data === 100) setBlocked(true);
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMode("plain");
        cb.current.onUntracked?.();
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(ticker);
      report();
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
    // start is only read when a new video mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoKey, mode]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-[#000000]">
      {mode === "api" ? (
        <div ref={host} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      ) : (
        <iframe
          key={videoKey}
          src={embedUrl(videoKey, start, end)}
          title="YouTube video player"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
      {blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0d17] p-6 text-center">
          <p className="text-[14px] font-semibold text-[#ffffff]">This video can’t play inside StudentOS</p>
          <p className="max-w-sm text-[12.5px] text-[#ffffff]/60">Its owner only allows it on YouTube. Pick another video from “Most viewed on this topic”, or watch it on YouTube.</p>
          <a href={watchUrl(videoKey)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-black">
            Open on YouTube
          </a>
        </div>
      )}
    </div>
  );
}
