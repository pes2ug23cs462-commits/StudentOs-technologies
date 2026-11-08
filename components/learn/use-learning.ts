"use client";

import { useRef } from "react";
import { emptyLearning, type Course, type CourseProgress, type Learning, type ModuleProgress, type VideoMeta } from "@/lib/learn";
import { useStore } from "@/lib/store";

const blankModule: ModuleProgress = { t: 0, d: 0, done: false, notes: "" };

export function useLearning() {
  const { state, actions } = useStore();
  const learning = state.learning ?? emptyLearning();
  // Always merge into the newest progress, even from callbacks created in an
  // earlier render (e.g. the video player reporting while it unmounts).
  const latest = useRef<Learning>(learning);
  latest.current = learning;

  const commit = (next: Learning) => {
    latest.current = next;
    actions.patch({ learning: next });
  };

  const getModule = (key: string): ModuleProgress => latest.current.modules[key] ?? blankModule;

  const setModule = (key: string, patch: Partial<ModuleProgress>) => {
    const l = latest.current;
    commit({ ...l, modules: { ...l.modules, [key]: { ...blankModule, ...l.modules[key], ...patch } } });
  };

  const setCourse = (id: string, patch: Partial<CourseProgress>) => {
    const l = latest.current;
    commit({
      ...l,
      courses: { ...l.courses, [id]: { startedAt: new Date().toISOString(), attempts: 0, best: 0, ...l.courses[id], ...patch } },
    });
  };

  /** Adds a popular video to My courses (or updates what we know about it). */
  const setVideo = (id: string, meta: Partial<VideoMeta>) => {
    const l = latest.current;
    const cur = l.videos?.[id];
    commit({ ...l, videos: { ...l.videos, [id]: { title: "", channel: "", secs: 0, addedAt: Date.now(), ...cur, ...meta } } });
  };

  const removeVideo = (id: string) => {
    const l = latest.current;
    const videos = { ...l.videos };
    delete videos[id];
    const modules = Object.fromEntries(Object.entries(l.modules).filter(([k]) => !k.startsWith(`yt-${id}/`)));
    const courses = { ...l.courses };
    delete courses[`yt-${id}`];
    commit({ ...l, videos, modules, courses });
  };

  /** Removes a course from My courses with its progress and notes. A certificate is never removed. */
  const removeCourse = (id: string) => {
    if (id.startsWith("yt-")) return removeVideo(id.slice(3));
    const l = latest.current;
    const cp = l.courses[id];
    if (cp?.certId) return;
    const modules = Object.fromEntries(Object.entries(l.modules).filter(([k]) => !k.startsWith(`${id}/`)));
    commit({ ...l, modules, courses: { ...l.courses, [id]: { startedAt: cp?.startedAt ?? new Date().toISOString(), attempts: 0, best: 0, hidden: true, ...(cp?.quizPool ? { quizPool: cp.quizPool } : {}) } } });
  };

  /** Saves the courses suggested for this student’s profile. */
  const setCatalog = (catalog: Course[], catalogFor: string) => commit({ ...latest.current, catalog, catalogFor });

  return { state, actions, learning, setModule, setCourse, setVideo, removeVideo, removeCourse, setCatalog, getModule, blankModule };
}
