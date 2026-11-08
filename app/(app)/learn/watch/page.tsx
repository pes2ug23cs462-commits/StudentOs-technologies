"use client";

/* /learn/watch?v=<id>&q=<search> — opening a popular video adds it to My courses
   as a small course (modules + short lessons), then opens it at /learn/yt-<id>. */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useLearning } from "@/components/learn/use-learning";
import { useTopVideos } from "@/components/learn/use-top-videos";
import { videoCourseId } from "@/lib/learn";

function Watch() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("v") ?? "";
  const q = params.get("q") ?? "";
  const valid = /^[\w-]{11}$/.test(id);
  const { learning, setVideo, setCourse } = useLearning();
  const { loading, videos } = useTopVideos(valid && q ? q : undefined);
  const done = useRef(false);

  useEffect(() => {
    if (!valid || done.current || (q && loading)) return;
    done.current = true;
    const info = videos.find((v) => v.id === id);
    const saved = learning.videos?.[id];
    if (info) setVideo(id, { title: info.title, channel: info.channel, secs: saved?.secs || info.seconds, chapters: saved?.chapters ?? info.chapters, q: saved?.q ?? q, refreshedAt: Date.now(), gone: false });
    else if (!saved) setVideo(id, { q });
    if (!learning.courses[videoCourseId(id)]) setCourse(videoCourseId(id), {});
    router.replace(`/learn/${videoCourseId(id)}`);
  }, [valid, q, loading, videos, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-6 py-7 lg:px-8">
      {valid ? (
        <div className="aspect-video w-full max-w-[900px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
      ) : (
        <p className="text-[13px] text-white/60">
          This video link isn’t valid. <Link href="/learn?tab=videos" className="text-accent hover:underline">Back to popular videos</Link>
        </p>
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
