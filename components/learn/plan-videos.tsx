"use client";

/* Study Plan → “Videos for this week”. Most viewed YouTube videos for the topic of
   the student's next sessions, plus their goal's StudentOS course if one fits. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterPills } from "@/components/free/parts";
import { PlayIcon, VideoIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { courseForGoal, coursePercent, emptyLearning } from "@/lib/learn";
import { isPast } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { VideoTile } from "./popular-videos";
import { useTopVideos } from "./use-top-videos";

/** "Week 3 · Loops and lists" → "Loops and lists" */
const topicOf = (title: string) => title.replace(/^week\s*\d+\s*[·:\-–]\s*/i, "").replace(/\b(practice|revision|review|session \d+|learn \d+)\b/gi, "").trim();

export function PlanVideos({ goal }: { goal: Goal }) {
  const { state } = useStore();
  const subject = (goal.course && goal.course !== "Your course" ? goal.course : goal.title).replace(/\s*[·—-]\s*(harvard|on edx|edx|coursera|udemy|nptel).*$/i, "").trim();

  // Topics of the next few sessions, without repeats.
  const topics = useMemo(() => {
    const seen = new Set<string>();
    return state.sessions
      .filter((s) => s.goalId === goal.id && s.status === "planned" && !isPast(s))
      .map((s) => topicOf(s.title))
      .filter((t) => t.length > 2 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
      .slice(0, 4);
  }, [state.sessions, goal.id]);

  const [pick, setPick] = useState("all");
  const q = pick === "all" ? `${subject} full course` : `${subject} ${pick}`;
  const { loading, videos, available } = useTopVideos(q, pick === "all" ? 20 : 5);
  const course = courseForGoal(goal, state.learning);
  const pct = course ? coursePercent(course, state.learning ?? emptyLearning()) : 0;

  return (
    <Card className="mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <VideoIcon size={15} className="text-accent" /> Videos for your plan
          </p>
          <p className="mt-1 text-[12px] text-white/55">Most viewed and liked videos for {subject}, picked for your next sessions. They play inside StudentOS.</p>
        </div>
        {course && (
          <Link href={`/learn/${course.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[12.5px] font-semibold text-black hover:bg-accent-hover">
            <PlayIcon size={10} /> {pct ? `Continue ${course.title} · ${pct}%` : `Start ${course.title}`}
          </Link>
        )}
      </div>
      {topics.length > 0 && (
        <div className="mt-4">
          <FilterPills value={pick} onChange={setPick} options={[{ value: "all", label: "Full course" }, ...topics.map((t) => ({ value: t, label: t }))]} />
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/[0.05]" />)
          : videos.slice(0, 4).map((v) => <VideoTile key={v.id} v={v} href={`/learn/watch?v=${v.id}&q=${encodeURIComponent(q)}`} />)}
      </div>
      {!loading && !videos.length && (
        <p className="mt-2 text-[12px] text-white/50">
          {available ? "No videos found for this topic. Try another one above." : "Videos need the YouTube key. Ask your admin to add it."}
        </p>
      )}
    </Card>
  );
}
