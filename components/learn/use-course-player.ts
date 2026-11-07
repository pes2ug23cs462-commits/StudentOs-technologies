"use client";

/* Shared video-course player logic: picks the module video, splits it into
   short lessons, tracks real watch time and completes lessons/modules.
   Used by the course page and by a study session that is linked to a course. */

import { useEffect, useMemo, useState } from "react";
import { useLearning } from "@/components/learn/use-learning";
import { useTopVideos } from "@/components/learn/use-top-videos";
import { WATCHED_SHARE, courseStats, lessonsFor, moduleKey, parseLength, type Course } from "@/lib/learn";

export function useCoursePlayer(course: Course | undefined) {
  const { learning, setModule, setCourse, actions, blankModule, getModule } = useLearning();
  const firstOpen = course ? (course.modules.find((m) => !learning.modules[moduleKey(course.id, m.id)]?.done) ?? course.modules[0]).id : "";
  const [active, setActive] = useState(firstOpen);
  const [notes, setNotes] = useState("");
  const [lessonOverride, setLessonOverride] = useState<number | null>(null);
  const [untracked, setUntracked] = useState(false);

  const key = course ? moduleKey(course.id, active) : "";
  const mp = learning.modules[key] ?? blankModule;
  const activeModule = course?.modules.find((m) => m.id === active) ?? course?.modules[0];
  // Most viewed videos for this module’s topic (empty when no YouTube API key is set).
  const top = useTopVideos(activeModule?.topic);
  const best = top.videos[0];
  const video = mp.yt
    ? { key: mp.yt, title: mp.ytTitle ?? "", channel: mp.ytChannel ?? "", secs: mp.secs || mp.d || 0 }
    : best
      ? { key: `v:${best.id}`, title: best.title, channel: best.channel, secs: best.seconds }
      : activeModule
        ? { key: activeModule.yt, title: "", channel: activeModule.channel, secs: parseLength(activeModule.length) }
        : null;

  // Long videos are split into short lessons (about 25 minutes each).
  const lessons = useMemo(() => lessonsFor(video?.secs ?? 0), [video?.secs]);
  const done = mp.lessonsDone ?? [];
  const firstUndone = lessons.findIndex((_, i) => !done.includes(i));
  const lessonIdx = Math.min(lessonOverride ?? mp.lesson ?? (firstUndone < 0 ? 0 : firstUndone), lessons.length - 1);
  const lesson = lessons[lessonIdx];
  // resume inside the lesson if the student stopped part-way
  const start = mp.t > lesson.start && (lesson.end === 0 || mp.t < lesson.end - 10) && !done.includes(lessonIdx) ? mp.t : lesson.start;

  useEffect(() => {
    if (course && !learning.courses[course.id]) setCourse(course.id, {});
    // only on first visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);
  useEffect(() => {
    setNotes(mp.notes);
    setLessonOverride(null);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!course || !activeModule) return null;

  const mod = activeModule;
  const idx = course.modules.indexOf(mod);
  const stats = courseStats(course, learning);
  const cp = stats.progress;
  // keep the same video and lesson split once the student has started
  const lockVideo = { yt: mp.yt ?? video?.key, ytTitle: mp.ytTitle ?? video?.title, ytChannel: mp.ytChannel ?? video?.channel, secs: mp.secs || video?.secs || 0 };

  const goLesson = (i: number) => {
    setLessonOverride(i);
    setModule(key, { ...lockVideo, lesson: i });
  };

  const finishLesson = (i: number, extra: Partial<typeof mp> = {}) => {
    const cur = getModule(key);
    const set = Array.from(new Set([...(cur.lessonsDone ?? []), i]));
    const moduleDone = set.length >= lessons.length;
    const nextLesson = lessons.findIndex((_, k) => !set.includes(k));
    setModule(key, { ...lockVideo, ...extra, lessonsDone: set, done: moduleDone || cur.done, lesson: nextLesson < 0 ? i : nextLesson });
    if (moduleDone && !cur.done) {
      const next = course.modules[idx + 1];
      actions.toast(next ? `Module ${idx + 1} complete. Up next: ${next.title}` : "All modules done. The quiz is unlocked.");
      if (next) setActive(next.id);
    } else if (nextLesson >= 0) {
      setLessonOverride(nextLesson);
      actions.toast(`Lesson ${i + 1} done. Starting lesson ${nextLesson + 1}.`);
    }
  };

  // A lesson only counts when ~90% of it was really played. Skipping to the end doesn’t count.
  const lessonLength = (i: number, d = mp.d) => {
    const l = lessons[i];
    return Math.max(0, (l.end || mp.secs || video?.secs || d) - l.start);
  };
  const watchedOf = (i: number) => mp.watched?.[i] ?? 0;

  const onProgress = (t: number, d: number, w: number, ended: boolean) => {
    const cur = getModule(key);
    const total = Math.min((cur.watched?.[lessonIdx] ?? 0) + w, lessonLength(lessonIdx, d) || Infinity);
    const watched = { ...(cur.watched ?? {}), [lessonIdx]: total };
    const len = lessonLength(lessonIdx, d);
    const already = (cur.lessonsDone ?? []).includes(lessonIdx);
    if (!already && len > 0 && total >= len * WATCHED_SHARE) return finishLesson(lessonIdx, { watched, t, d });
    setModule(key, { ...lockVideo, secs: cur.secs || lockVideo.secs || d, t, d, lesson: lessonIdx, watched });
    if (ended && !already && len > 0) {
      const left = Math.ceil((len * WATCHED_SHARE - total) / 60);
      actions.toast(`Lesson ${lessonIdx + 1} isn’t complete yet. Watch about ${left} more min of it, skipping ahead doesn’t count.`);
    }
  };
  const saveNotes = () => notes !== mp.notes && setModule(key, { notes });

  const noteSections = () =>
    course.modules.map((m, i) => {
      const p = learning.modules[moduleKey(course.id, m.id)];
      return { heading: `Module ${i + 1}: ${m.title}`, sub: p?.ytTitle || undefined, text: m.id === mod.id ? notes : (p?.notes ?? "") };
    });

  return {
    course, learning, actions, setModule, mod, idx, stats, cp, key, mp, top, video, lessons, lessonIdx, lesson, start, done,
    notes, setNotes, saveNotes, goLesson, finishLesson, onProgress, untracked, setUntracked, lessonLength, watchedOf, setActive, noteSections,
  };
}

export type CoursePlayer = NonNullable<ReturnType<typeof useCoursePlayer>>;
