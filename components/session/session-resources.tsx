"use client";

/* Learning resources for one study session, picked from its subject and
   topic: the most viewed videos (played right here, no course or
   certificate), free places to read and practise, and quick AI help. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { YouTubePlayer } from "@/components/videos/player";
import { ArrowRightIcon, BookIcon, ChatIcon, EyeIcon, PlayIcon, SparkleIcon, VideoIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { useTopVideos } from "@/components/learn/use-top-videos";
import { goalSubject } from "@/lib/catalog";
import type { Goal, StudySession } from "@/lib/types";
import { compact, hms } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/** "Week 3 · Lecture 3 · Loops practice" → "Lecture 3 Loops" */
const topicOf = (title: string) =>
  title
    .replace(/^week\s*\d+\s*[·:\-–]\s*/i, "")
    .replace(/\b(practice|revision|review|session \d+|learn \d+|shorts?)\b/gi, "")
    .replace(/[·:|–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TECH = /python|java|c\+\+|\bc\b|javascript|react|sql|dbms|data structure|algorithm|operating system|network|web|cs50|programming|coding|machine learning/i;

export function SessionResources({ session, goal }: { session: StudySession; goal?: Goal }) {
  const subject = goal ? goalSubject(goal) : "";
  const topic = topicOf(session.title) || session.short || subject;
  const query = `${subject} ${topic}`.replace(/\s+/g, " ").trim().slice(0, 90);
  const [mode, setMode] = useState<"topic" | "full">("topic");
  const q = mode === "topic" ? `${query} explained` : `${subject || topic} full course`;
  const { loading, videos, available } = useTopVideos(q.toLowerCase(), mode === "topic" ? 4 : 20);
  const [playing, setPlaying] = useState<string | null>(null);
  const tech = TECH.test(`${subject} ${topic}`);

  // “Lecture 3”, “Week 2”… mean nothing to a search site: use the subject instead
  const generic = /^(lecture|week|unit|chapter|module|part|session|day)\s*\d+$/i.test(topic);
  const readTopic = generic && subject ? subject : topic;
  const read = useMemo(() => {
    const term = encodeURIComponent(readTopic === subject ? subject : `${readTopic} ${subject}`.trim());
    const t = encodeURIComponent(readTopic);
    return [
      { label: "Wikipedia", sub: "Quick overview", href: `https://en.wikipedia.org/w/index.php?search=${t}` },
      { label: "Khan Academy", sub: "Lessons and practice", href: `https://www.khanacademy.org/search?page_search_query=${t}` },
      { label: "NPTEL", sub: "IIT lectures and notes", href: `https://nptel.ac.in/courses?searchText=${term}` },
      ...(tech ? [{ label: "GeeksforGeeks", sub: "Articles and coding problems", href: `https://www.geeksforgeeks.org/search/?gq=${t}` }] : []),
    ];
  }, [readTopic, subject, tech]);

  const ask = (what: string) => `/assistant?ask=${encodeURIComponent(`${what} “${topic}”${subject && subject !== topic ? ` (${subject})` : ""}. Explain simply with an example, then give me 3 quick questions to check.`)}`;
  const current = videos.find((v) => v.id === playing);

  return (
    <div className="space-y-4">
      {/* videos */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <VideoIcon size={15} className="text-[var(--cyan)]" /> Videos for this session
            </p>
            <p className="mt-0.5 truncate text-[12px] text-white/50">Most viewed on YouTube for “{mode === "topic" ? query : subject || topic}”. They play here.</p>
          </div>
          <div role="radiogroup" aria-label="Video length" className="inline-flex rounded-lg border border-white/10 p-0.5">
            {(
              [
                ["topic", "This topic"],
                ["full", "Full course"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => { setMode(k); setPlaying(null); }} className={cn("h-7 rounded-md px-2.5 text-[12px] font-medium", mode === k ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {current && (
          <div className="mt-4">
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[16/11] animate-pulse rounded-xl bg-white/[0.05]" />)
            : videos.slice(0, 4).map((v) => (
                <button key={v.id} type="button" onClick={() => setPlaying(v.id)} className={cn("group overflow-hidden rounded-xl border text-left transition-colors", playing === v.id ? "border-accent/60" : "border-white/[0.08] hover:border-white/20")}>
                  <span className="relative block aspect-video bg-white/[0.05]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    <span className="absolute inset-0 flex items-center justify-center bg-[#000000]/0 transition-colors group-hover:bg-[#000000]/30">
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
        {!loading && !videos.length && <p className="mt-3 text-[12.5px] text-white/50">{available ? "No videos found for this topic. Try “Full course”." : "Videos aren’t available right now."}</p>}
      </Card>

      {/* read + AI */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <BookIcon size={15} className="text-[var(--cyan)]" /> Read and practise
          </p>
          <p className="mt-0.5 text-[12px] text-white/50">Free sites, searched for “{readTopic}”.</p>
          <ul className="mt-3 space-y-1.5">
            {read.map((r) => (
              <li key={r.label}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-white">{r.label}</span>
                    <span className="block text-[11.5px] text-white/45">{r.sub}</span>
                  </span>
                  <span className="text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <SparkleIcon size={14} className="text-[var(--cyan)]" /> Learn it with AI
          </p>
          <p className="mt-0.5 text-[12px] text-white/50">Opens the assistant with this topic filled in.</p>
          <div className="mt-3 space-y-1.5">
            {[
              ["Explain", "Explain this topic simply"],
              ["Give me practice questions on", "Give me practice questions"],
              ["What are the most important points of", "Most important points for exams"],
            ].map(([q, label]) => (
              <Link key={label} href={ask(q)} className="group flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2.5 text-[12.5px] text-white/80 transition-colors hover:border-white/20 hover:text-white">
                <span className="flex items-center gap-2">
                  <ChatIcon size={12} className="text-white/40" /> {label}
                </span>
                <ArrowRightIcon size={12} className="text-white/30 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
