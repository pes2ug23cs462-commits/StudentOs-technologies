"use client";

import { useEffect, useState } from "react";
import type { YtVideo } from "@/lib/youtube";

type State = { loading: boolean; videos: YtVideo[]; available: boolean };
const memo = new Map<string, { videos: YtVideo[]; available: boolean }>();

/** Most viewed videos for a topic, from /api/videos (cached in memory and for the browser session). */
export function useTopVideos(q: string | undefined, min = 20): State {
  const key = q ? `${q}|${min}` : "";
  const [state, setState] = useState<State>(() => {
    const hit = key ? memo.get(key) : undefined;
    return hit ? { loading: false, ...hit } : { loading: !!key, videos: [], available: true };
  });

  useEffect(() => {
    if (!key) return;
    const hit = memo.get(key);
    if (hit) return setState({ loading: false, ...hit });
    try {
      const saved = sessionStorage.getItem(`studentos:yt:${key}`);
      if (saved) {
        const v = JSON.parse(saved);
        memo.set(key, v);
        return setState({ loading: false, ...v });
      }
    } catch {
      /* storage unavailable */
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/videos?q=${encodeURIComponent(q!)}&min=${min}`)
      .then((r) => (r.headers.get("content-type")?.includes("json") ? r.json() : { videos: [], reason: "no-api" }))
      .then((j: { videos?: YtVideo[]; reason?: string }) => {
        const v = { videos: j.videos ?? [], available: !j.reason };
        if (v.available) {
          memo.set(key, v);
          try {
            sessionStorage.setItem(`studentos:yt:${key}`, JSON.stringify(v));
          } catch {
            /* ignore */
          }
        }
        if (alive) setState({ loading: false, ...v });
      })
      .catch(() => alive && setState({ loading: false, videos: [], available: false }));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
