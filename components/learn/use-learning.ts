"use client";

import { useRef } from "react";
import { emptyLearning, type CourseProgress, type Learning, type ModuleProgress } from "@/lib/learn";
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

  return { state, actions, learning, setModule, setCourse, getModule, blankModule };
}
