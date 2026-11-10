"use client";

/* Most viewed YouTube videos for a search, played right here in the page
   (not added to My courses, no certificate). */

import { useState } from "react";
import { YouTubePlayer } from "@/components/videos/player";
import { EyeIcon, PlayIcon, XIcon } from "@/components/ui/icons";
import { useTopVideos } from "@/components/learn/use-top-videos";
import { compact, hms } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export function VideoGrid({ q, min = 20, kind = "any", count = 4, empty, onPlay }: { q: string; min?: number; kind?: "any" | "oneshot" | "lecture"; count?: number; empty?: string; onPlay?: (id: string) => void }) {
  const { loading, videos, available } = useTopVideos(q.toLowerCase().slice(0, 100), min, kind);
  const [playing, setPlaying] = useState<string | null>(null);
  const current = videos.find((v) => v.id === playing);
  return (
    <div>
      {current && (
        <div className="mb-4">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[#000000]">
            <YouTubePlayer key={current.id} videoKey={`v:${current.id}`} />
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="min-w-0 text-[13px] font-medium text-white">{current.title}</p>
            <button type="button" onClick={() => setPlaying(null)} aria-label="Close video" className="rounded-md p-1 text-white/45 hover:bg-white/[0.06] hover:text-white">
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {loading
          ? Array.from({ length: count }, (_, i) => <div key={i} className="aspect-[16/11] animate-pulse rounded-xl bg-white/[0.05]" />)
          : videos.slice(0, count).map((v) => (
              <button key={v.id} type="button" onClick={() => { setPlaying(v.id); onPlay?.(v.id); }} className={cn("group overflow-hidden rounded-xl border text-left transition-colors", playing === v.id ? "border-accent/60" : "border-white/[0.08] hover:border-white/20")}>
                <span className="relative block aspect-video bg-white/[0.05]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  <span className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-[#000000]/30">
                    <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full bg-[#ffffff]/90 text-[#111111] opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
                      <PlayIcon size={13} />
                    </span>
                  </span>
                  <span className="absolute right-1.5 bottom-1.5 rounded bg-[#000000]/75 px-1.5 py-0.5 text-[10.5px] font-medium text-[#ffffff]">{hms(v.seconds)}</span>
                </span>
                <span className="block p-3">
                  <span className="line-clamp-2 text-[12.5px] leading-snug font-medium text-white">{v.title}</span>
                  <span className="mt-1 flex items-center gap-2 text-[11px] text-white/50">
                    <span className="truncate">{v.channel}</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <EyeIcon size={10} /> {compact(v.views)}
                    </span>
                  </span>
                </span>
              </button>
            ))}
      </div>
      {!loading && !videos.length && <p className="mt-3 text-[12.5px] text-white/50">{available ? (empty ?? "No videos found.") : "Videos aren’t available right now."}</p>}
    </div>
  );
}
