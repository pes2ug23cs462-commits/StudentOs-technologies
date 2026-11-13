"use client";

/* Keeps stored YouTube details fresh. YouTube's Developer Policies say API data may
   be kept for 30 days, then it must be refreshed or deleted. When a student opens
   Learning or a course, any video details older than 30 days are fetched again
   (1 quota unit for up to 50 videos). If a video was deleted or made private, an
   unfinished module gets a new video and a popular video is marked as gone. */

import { useEffect } from "react";
import { YT_REFRESH_MS, type ModuleProgress } from "@/lib/learn";
import { ytFetch, type YtVideo } from "@/lib/youtube";
import { useLearning } from "./use-learning";

let running = false;
const checkedThisSession = new Set<string>();

export function useYtRefresh() {
  const { learning, setModule, setVideo, getModule, actions } = useLearning();

  useEffect(() => {
    if (running) return;
    const now = Date.now();
    const old = (t: number | undefined) => !t || now - t > YT_REFRESH_MS;

    const modules = Object.entries(learning.modules).filter(
      ([k, p]) => p.yt?.startsWith("v:") && !k.startsWith("yt-") && !k.startsWith("watch/") && old(p.ytAt) && !checkedThisSession.has(k),
    );
    const videos = Object.entries(learning.videos ?? {}).filter(([id, v]) => !v.gone && old(v.refreshedAt ?? v.addedAt) && !checkedThisSession.has(`yt-${id}`));
    if (!modules.length && !videos.length) return;

    const ids = [...new Set([...modules.map(([, p]) => p.yt!.slice(2)), ...videos.map(([id]) => id)])].slice(0, 50);
    running = true;
    ytFetch(`/api/video-info?ids=${ids.join(",")}`)
      .then((r) => (r.headers.get("content-type")?.includes("json") ? r.json() : {}))
      .then((j: { videos?: YtVideo[]; checked?: string[]; reason?: string }) => {
        if (j.reason || !j.checked) return; // YouTube unavailable: try again next time
        const found = new Map((j.videos ?? []).map((v) => [v.id, v]));
        const checked = new Set(j.checked);
        let replaced = 0;

        for (const [key, p] of modules) {
          const id = p.yt!.slice(2);
          if (!checked.has(id)) continue;
          checkedThisSession.add(key);
          const v = found.get(id);
          if (v) setModule(key, { ytTitle: v.title, ytChannel: v.channel, ytAt: now });
          else if (getModule(key).done) setModule(key, { ytTitle: undefined, ytChannel: undefined, ytAt: now });
          else {
            // the video is gone: forget it so the module picks the current most-viewed one
            const reset: Partial<ModuleProgress> = { yt: undefined, ytTitle: undefined, ytChannel: undefined, ytAt: undefined, secs: undefined, t: 0, d: 0, lesson: 0, lessonsDone: [], watched: {} };
            setModule(key, reset);
            replaced++;
          }
        }
        for (const [id, meta] of videos) {
          if (!checked.has(id)) continue;
          checkedThisSession.add(`yt-${id}`);
          const v = found.get(id);
          if (!v) setVideo(id, { gone: true, refreshedAt: now });
          else {
            // keep the module split (length and chapter times) the student started with
            const sameChapters = (v.chapters ?? []).map((c) => c.t).join() === (meta.chapters ?? []).map((c) => c.t).join();
            setVideo(id, { title: v.title, channel: v.channel, ...(sameChapters && v.chapters ? { chapters: v.chapters } : {}), refreshedAt: now });
          }
        }
        if (replaced) actions.toast(`${replaced === 1 ? "A video" : `${replaced} videos`} in your courses was removed from YouTube, so we picked the current top video instead.`);
      })
      .catch(() => undefined)
      .finally(() => {
        running = false;
      });
  }, [learning.modules, learning.videos]); // eslint-disable-line react-hooks/exhaustive-deps
}
