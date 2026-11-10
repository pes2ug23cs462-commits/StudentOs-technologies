"use client";

/* Personalised courses for the signed-in student. Made once from their profile
   setup and assessment, and again when that profile changes (or on “Refresh”). */

import { useEffect, useState } from "react";
import { suggestCourses } from "@/lib/assistant";
import { profileKey } from "@/lib/catalog";
import { useLearning } from "./use-learning";

let inflight: Promise<unknown> | null = null;

export function useCatalog() {
  const { state, learning, setCatalog } = useLearning();
  const key = profileKey(state.setup, state.goals);
  const [busy, setBusy] = useState(false);
  const stale = !learning.catalog?.length || (!!key && learning.catalogFor !== key);

  const build = async () => {
    if (inflight) return;
    setBusy(true);
    inflight = suggestCourses(state.setup, state.goals)
      .then(({ courses }) => {
        // keep courses the student already started, even if they aren't suggested any more
        const started = (learning.catalog ?? []).filter((c) => learning.courses[c.id] && !courses.some((n) => n.id === c.id));
        setCatalog([...courses, ...started], key);
      })
      .finally(() => {
        inflight = null;
        setBusy(false);
      });
  };

  useEffect(() => {
    if (stale && !inflight) void build();
  }, [stale, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { courses: learning.catalog ?? [], loading: busy || (stale && !learning.catalog?.length), refresh: build, refreshing: busy };
}
