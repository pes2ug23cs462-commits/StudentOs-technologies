"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCoursePlayer } from "@/components/learn/use-course-player";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, EyeIcon, ThumbUpIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, FileIcon, LockIcon, PlayIcon, TrophyIcon } from "@/components/ui/icons";
import { Card, EmptyState, Pill } from "@/components/ui/primitives";
import { YouTubePlayer, watchUrl } from "@/components/videos/player";
import { downloadPdf, downloadWord } from "@/lib/export-notes";
import { QUIZ_PASS, QUIZ_SECONDS, QUIZ_SIZE, WATCHED_SHARE, clock, findCourse, isVideoCourse, moduleKey, moduleLessons } from "@/lib/learn";
import { useStore } from "@/lib/store";
import { LEVEL_INFO } from "@/lib/setup";
import { compact, hms } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export default function CoursePage() {
  const { course: courseId } = useParams<{ course: string }>();
  const { state } = useStore();
  const player = useCoursePlayer(findCourse(courseId, state.learning));

  if (!player) {
    return (
      <div className="px-6 py-7 lg:px-8">
        <EmptyState title="Course not found" className="py-16">
          <Link href="/learn" className="text-accent hover:underline">Back to Learning</Link>
        </EmptyState>
      </div>
    );
  }
  const {
    learning, setModule, mod, idx, stats, cp, key, mp, top, video, lessons, lessonIdx, lesson, start, done,
    notes, setNotes, saveNotes, goLesson, onProgress, untracked, setUntracked, lessonLength, watchedOf, setActive, noteSections,
  } = player;
  const course = player.course;
  return (
    <div className="px-6 py-7 lg:px-8">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white">
        <ArrowLeftIcon size={13} /> Learning
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-[24px] font-semibold tracking-tight text-white">{course.title}</h1>
        {isVideoCourse(course) ? <Pill tone="cyan">Popular video</Pill> : <Pill tone="green">{LEVEL_INFO[course.level].label}</Pill>}
      </div>
      {isVideoCourse(course) && learning.videos?.[course.id.slice(3)]?.gone && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/[0.08] p-3 text-[12.5px] text-amber-300">
          This video was removed from YouTube or made private, so it may not play. Your notes are still here. You can remove it from Learning → My courses.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {top.loading && !mp.yt ? (
            <div className="aspect-video w-full animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          ) : !video ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-[14px] font-semibold text-white">Video couldn’t load</p>
              <p className="max-w-[420px] text-[12.5px] text-white/55">This module picks the most viewed YouTube video for “{mod.topic}”. Check your internet and refresh. If it keeps happening, the YouTube key may be missing or its daily limit used up.</p>
            </div>
          ) : (
            <YouTubePlayer
              key={`${key}|${video.key}|${lessonIdx}`}
              videoKey={video.key}
              start={start}
              end={lesson.end}
              onProgress={onProgress}
              onUntracked={() => setUntracked(true)}
            />
          )}

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium tracking-wide text-accent uppercase">
                Module {idx + 1} of {course.modules.length}
                {lessons.length > 1 && ` · Lesson ${lessonIdx + 1} of ${lessons.length}`}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-white">{mod.title}</h2>
              {video?.title && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-white/75">{video.title}</p>}
              <p className="mt-0.5 text-[12px] text-white/50">
                {video?.channel || mod.channel}
                {lessons.length > 1
                  ? ` · this lesson ${clock(lesson.start)} – ${lesson.end ? clock(lesson.end) : "end"}`
                  : video?.secs
                    ? ` · ${hms(video.secs)}`
                    : ""}
              </p>
            </div>
            <div className="w-full sm:w-[220px]">
              {done.includes(lessonIdx) ? (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.1] px-3 py-1.5 text-[12.5px] font-semibold text-accent">
                  <CheckCircleIcon size={14} /> Lesson complete
                </p>
              ) : (
                (() => {
                  const len = lessonLength(lessonIdx);
                  const pct = len ? Math.min(100, Math.round((watchedOf(lessonIdx) / (len * WATCHED_SHARE)) * 100)) : 0;
                  return (
                    <div>
                      <div className="flex justify-between text-[11.5px] text-white/55">
                        <span>Watched</span>
                        <span className="tabular-nums">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-white/45">Completes on its own when you’ve watched the lesson.</p>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">{mod.about}</p>

          <Card className="mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="module-notes" className="text-[13px] font-semibold text-white">
                My notes for this module
              </label>
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  icon={<FileIcon size={12} />}
                  onClick={() => {
                    saveNotes();
                    downloadPdf(course.title, noteSections());
                  }}
                >
                  PDF
                </Button>
                <Button
                  size="xs"
                  icon={<FileIcon size={12} />}
                  onClick={() => {
                    saveNotes();
                    downloadWord(course.title, noteSections());
                  }}
                >
                  Word
                </Button>
              </div>
            </div>
            <textarea
              id="module-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={5}
              placeholder="Write what you learned. Your notes are saved to your account."
              className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-accent"
            />
            <p className="mt-1.5 text-[11px] text-white/40">Downloads include your notes from every module of this course. For PDF, choose “Save as PDF” in the print window.</p>
          </Card>
          {untracked ? (
            <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/[0.08] p-3 text-[12px] text-amber-300">
              Your progress can’t be saved right now because the YouTube player didn’t load fully. Refresh the page; ad or script blockers can cause this.
            </p>
          ) : (
            <p className="mt-3 text-[11.5px] text-white/40">
              Lessons complete only when you watch them here. Skipping ahead or watching{" "}
              <a href={watchUrl(video?.key ?? mod.yt)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                on YouTube
              </a>{" "}
              doesn’t count.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold text-white">Modules</p>
              <p className="text-[11.5px] text-white/50">
                {stats.done}/{stats.total} done
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
            </div>
            <ol className="mt-3 space-y-1.5">
              {course.modules.map((m, i) => {
                const p = learning.modules[moduleKey(course.id, m.id)];
                const on = m.id === mod.id;
                const count = on ? lessons.length : m.to != null || p?.secs ? moduleLessons(m, p?.secs ?? 0).length : 0;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        saveNotes();
                        setActive(m.id);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition",
                        on ? "border-accent/50 bg-accent/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          p?.done ? "bg-accent text-black" : on ? "border border-accent text-accent" : "border border-white/20 text-white/60",
                        )}
                      >
                        {p?.done ? <CheckIcon size={12} /> : on ? <PlayIcon size={8} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-snug font-medium text-white">{m.title}</span>
                        <span className="block text-[11.5px] text-white/50">
                          {count > 1 ? `${(p?.lessonsDone ?? []).length}/${count} lessons` : `Module ${i + 1}`}
                        </span>
                      </span>
                      {on && lessons.length > 1 && <ChevronDownIcon size={14} className="mt-1 text-white/50" />}
                    </button>
                    {on && lessons.length > 1 && (
                      <ol className="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-3">
                        {lessons.map((l, k) => (
                          <li key={k}>
                            <button
                              type="button"
                              onClick={() => goLesson(k)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition",
                                k === lessonIdx ? "bg-accent/[0.1] font-medium text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                              )}
                            >
                              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full", done.includes(k) ? "bg-accent text-black" : "border border-white/25")}>
                                {done.includes(k) && <CheckIcon size={9} />}
                              </span>
                              Lesson {k + 1}
                              <span className="ml-auto text-[11px] text-white/45 tabular-nums">
                                {clock(l.start)}–{l.end ? clock(l.end) : "end"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          {top.videos.length > 1 && (
            <Card className="p-4">
              <p className="text-[13.5px] font-semibold text-white">Most viewed on this topic</p>
              <p className="mt-0.5 text-[11.5px] text-white/50">Ranked by views and likes. Pick another if you prefer its teacher.</p>
              <ul className="mt-3 space-y-1.5">
                {top.videos.slice(0, 5).map((v) => {
                  const on = video?.key === `v:${v.id}`;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        disabled={on}
                        onClick={() => setModule(key, { yt: `v:${v.id}`, ytTitle: v.title, ytChannel: v.channel, secs: v.seconds, ytAt: Date.now(), t: 0, d: 0, lessonsDone: [], lesson: 0, done: false, watched: {} })}
                        className={cn("flex w-full gap-2.5 rounded-lg border p-2 text-left transition", on ? "border-accent/50 bg-accent/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="aspect-video w-[88px] shrink-0 rounded-md bg-white/[0.06] object-cover" />
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-[12px] leading-snug font-medium text-white">{v.title}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/50">
                            <span className="inline-flex items-center gap-0.5"><EyeIcon size={11} /> {compact(v.views)}</span>
                            <span className="inline-flex items-center gap-0.5"><ThumbUpIcon size={11} /> {compact(v.likes)}</span>
                            <span>{hms(v.seconds)}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {isVideoCourse(course) ? (
            <Card className="p-4">
              <p className="text-[13.5px] font-semibold text-white">Popular video</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
                Split into {course.modules.length} module{course.modules.length > 1 ? "s" : ""} of short lessons and saved in My courses. Single videos don’t have a quiz or certificate. Take a StudentOS course for that.
              </p>
            </Card>
          ) : (
          <Card className={cn("p-4", stats.ready && "border-accent/40")}>
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
              {stats.ready ? <TrophyIcon size={15} className="text-accent" /> : <LockIcon size={14} className="text-white/50" />}
              Final quiz & certificate
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
              {QUIZ_SIZE} questions, {QUIZ_SECONDS} seconds. Get {QUIZ_PASS === QUIZ_SIZE ? "all" : QUIZ_PASS} right to unlock your StudentOS certificate.
            </p>
            {cp?.certId ? (
              <Link href={`/learn/${course.id}/certificate`} className="mt-3 inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-black">
                View certificate
              </Link>
            ) : stats.ready ? (
              <Link href={`/learn/${course.id}/quiz`} className="mt-3 inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-black">
                {cp?.attempts ? "Try the quiz again" : "Start the quiz"}
              </Link>
            ) : (
              <p className="mt-3 text-[12px] text-white/45">Finish all {stats.total} modules to unlock it.</p>
            )}
            {!!cp?.attempts && !cp.certId && (
              <p className="mt-2 text-[11.5px] text-white/45">
                Best so far: {cp.best}/{QUIZ_SIZE} · {cp.attempts} attempt{cp.attempts > 1 ? "s" : ""}
              </p>
            )}
          </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
