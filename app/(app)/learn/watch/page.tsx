"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { VideoTile } from "@/components/learn/popular-videos";
import { useLearning } from "@/components/learn/use-learning";
import { useTopVideos } from "@/components/learn/use-top-videos";
import { ArrowLeftIcon, EyeIcon, ThumbUpIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { YouTubePlayer } from "@/components/videos/player";
import { compact, hms } from "@/lib/youtube";

function Watch() {
  const params = useSearchParams();
  const id = params.get("v") ?? "";
  const q = params.get("q") ?? "";
  const valid = /^[\w-]{11}$/.test(id);
  const { learning, setModule, blankModule } = useLearning();
  const { videos } = useTopVideos(q || undefined);
  const info = videos.find((v) => v.id === id);
  const key = `watch/${id}`;
  const mp = learning.modules[key] ?? blankModule;
  const [notes, setNotes] = useState(mp.notes);
  useEffect(() => setNotes(mp.notes), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch: Parameters<typeof setModule>[1]) => setModule(key, { yt: `v:${id}`, ytTitle: info?.title ?? mp.ytTitle, ytChannel: info?.channel ?? mp.ytChannel, ...patch });

  return (
    <div className="px-6 py-7 lg:px-8">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white">
        <ArrowLeftIcon size={13} /> Learning
      </Link>
      {!valid ? (
        <p className="mt-6 text-[13px] text-white/60">This video link isn’t valid.</p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <YouTubePlayer key={id} videoKey={`v:${id}`} start={mp.t} onProgress={(t, d) => save({ t: Math.max(t, mp.t), d })} />
            <h1 className="mt-4 text-[18px] leading-snug font-semibold text-white">{info?.title ?? mp.ytTitle ?? "Video"}</h1>
            {(info || mp.ytChannel) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-white/55">
                <span>{info?.channel ?? mp.ytChannel}</span>
                {info && (
                  <>
                    <span className="inline-flex items-center gap-1"><EyeIcon size={12} /> {compact(info.views)} views</span>
                    <span className="inline-flex items-center gap-1"><ThumbUpIcon size={12} /> {compact(info.likes)} likes</span>
                    <span>{hms(info.seconds)}</span>
                  </>
                )}
              </p>
            )}
            <Card className="mt-4 p-4">
              <label htmlFor="watch-notes" className="text-[13px] font-semibold text-white">My notes</label>
              <textarea
                id="watch-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== mp.notes && save({ notes })}
                rows={4}
                placeholder="Write what you learned. Saved to your account."
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-accent"
              />
            </Card>
            <p className="mt-3 text-[11.5px] text-white/40">Single videos don’t have a quiz or certificate. Take a full course in Learning for that.</p>
          </div>
          <aside>
            <p className="text-[13.5px] font-semibold text-white">More popular videos</p>
            <div className="mt-3 grid gap-3">
              {videos
                .filter((v) => v.id !== id)
                .slice(0, 5)
                .map((v) => (
                  <VideoTile key={v.id} v={v} href={`/learn/watch?v=${v.id}&q=${encodeURIComponent(q)}`} />
                ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <Watch />
    </Suspense>
  );
}
