"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterPills } from "@/components/free/parts";
import { EyeIcon, ThumbUpIcon } from "@/components/ui/icons";
import { activeGoals, goalSubject } from "@/lib/catalog";
import type { Goal } from "@/lib/types";
import { compact, hms, schoolTopics, topicsFor, type YtVideo } from "@/lib/youtube";
import type { SetupData } from "@/lib/setup";
import { useTopVideos } from "./use-top-videos";

export function VideoTile({ v, href }: { v: YtVideo; href: string }) {
  return (
    <Link href={href} className="lift-3d depth group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-accent/40">
      <span className="relative block aspect-video bg-white/[0.05]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-cover" />
        <span className="absolute right-1.5 bottom-1.5 rounded bg-[#000000]/75 px-1.5 py-0.5 text-[10.5px] font-medium text-[#ffffff]">{hms(v.seconds)}</span>
      </span>
      <span className="block p-3">
        <span className="line-clamp-2 text-[12.5px] leading-snug font-medium text-white group-hover:text-accent">{v.title}</span>
        <span className="mt-1 block truncate text-[11.5px] text-white/50">{v.channel}</span>
        <span className="mt-1 flex items-center gap-3 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1"><EyeIcon size={11} /> {compact(v.views)} views</span>
          <span className="inline-flex items-center gap-1"><ThumbUpIcon size={11} /> {compact(v.likes)}</span>
        </span>
      </span>
    </Link>
  );
}

/** “Popular for your goals and interests”: most viewed videos for each goal first, then each interest topic. */
export function PopularVideos({ interests, goals = [], academic }: { interests: string[]; goals?: Goal[]; academic?: SetupData["academic"] }) {
  const fromGoals = activeGoals(goals).map((g) => ({ label: goalSubject(g), q: `${goalSubject(g)} full course`.toLowerCase().slice(0, 100) }));
  // school students: their class subjects come right after their goals
  const fromClass = schoolTopics(academic);
  const school = academic?.type === "school";
  const seen = new Set([...fromGoals, ...fromClass].map((t) => t.q));
  const topics = [...fromGoals, ...fromClass, ...(interests.length || (!fromGoals.length && !fromClass.length) ? topicsFor(interests, school && fromClass.length > 0) : []).filter((t) => !seen.has(t.q))];
  if (!topics.length) topics.push(...topicsFor([]));
  const [pick, setQ] = useState<string>();
  // follows the first goal until the student picks a topic (goals can load after the page)
  const q = pick && topics.some((t) => t.q === pick) ? pick : topics[0].q;
  const { loading, videos, available } = useTopVideos(q);

  if (!available) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-white/15 p-4 text-center text-[12.5px] text-white/55">
        Popular videos aren’t available right now. Try again later.
        {process.env.NODE_ENV === "development" && (
          <span className="mt-1 block text-[11.5px] text-white/40">
            Developer note: add <code>YOUTUBE_API_KEY</code> to <code>.env.local</code> to show the most-viewed videos for each interest here.
          </span>
        )}
      </p>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="text-[17px] font-semibold text-white">{fromGoals.length ? "Popular for your goals" : fromClass.length ? "Popular for your class" : "Popular for your interests"}</h2>
      <p className="mt-0.5 text-[12.5px] text-white/55">The most viewed and liked full-length videos on YouTube, playing right here.</p>
      <div className="mt-3">
        <FilterPills value={q} onChange={setQ} options={topics.map((t) => ({ value: t.q, label: t.label }))} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/[0.05]" />)
          : videos.slice(0, 8).map((v) => <VideoTile key={v.id} v={v} href={`/learn/watch?v=${v.id}&q=${encodeURIComponent(q)}`} />)}
      </div>
      {!loading && !videos.length && <p className="mt-3 text-[12.5px] text-white/50">No videos found for this topic right now.</p>}
    </section>
  );
}
