/* Server-only YouTube Data API calls with a shared cache.
   YouTube's Developer Policies allow keeping API data for up to 30 days, after
   which it must be refreshed or deleted. Results here are cached for all students
   for 29 days and then fetched again automatically (failed calls are never cached). */

import { unstable_cache } from "next/cache";
import { isoSeconds, parseChapters, rank, type YtVideo } from "@/lib/youtube";

const API = "https://www.googleapis.com/youtube/v3";
export const YT_KEEP_SECONDS = 29 * 24 * 60 * 60;

export class YtError extends Error {
  constructor(public reason: "no-key" | "quota" | "youtube-error", public status = 502) {
    super(reason);
  }
}

type Item = {
  id: string;
  snippet?: { title?: string; channelTitle?: string; description?: string };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

function key() {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new YtError("no-key", 200);
  return k;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key: key() })}`, { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { errors?: { reason?: string }[] } };
    const reason = j.error?.errors?.[0]?.reason ?? "";
    throw new YtError(/quota/i.test(reason) ? "quota" : "youtube-error", res.status);
  }
  return (await res.json()) as T;
}

const toVideo = (v: Item): YtVideo => {
  const seconds = isoSeconds(v.contentDetails?.duration ?? "");
  return {
    id: v.id,
    title: v.snippet?.title ?? "",
    channel: v.snippet?.channelTitle ?? "",
    views: Number(v.statistics?.viewCount ?? 0),
    likes: Number(v.statistics?.likeCount ?? 0),
    seconds,
    chapters: parseChapters(v.snippet?.description ?? "", seconds),
  };
};
const playable = (v: Item) => v.status?.embeddable !== false && v.status?.privacyStatus === "public";

/** Details for up to 50 videos (1 quota unit). Missing ids were deleted, made private or can't be embedded. */
async function details(ids: string[]): Promise<YtVideo[]> {
  if (!ids.length) return [];
  const j = await get<{ items?: Item[] }>("videos", { part: "snippet,statistics,contentDetails,status", id: ids.join(",") });
  return (j.items ?? []).filter(playable).map(toVideo);
}

export type VideoKind = "any" | "oneshot" | "lecture";
const ONE_SHOT = /one[\s-]*shot|1[\s-]*shot|oneshot|in one video|complete chapter in/i;

/** Most viewed, embeddable videos for a topic (100 quota units, so it is cached).
    kind "oneshot": only videos whose title says one shot; "lecture": chapter
    lectures ranked by relevance, one-shot videos left out. */
async function search(q: string, minMinutes: number, kind: VideoKind = "any"): Promise<YtVideo[]> {
  const sj = await get<{ items?: { id?: { videoId?: string } }[] }>("search", {
    part: "snippet",
    q,
    type: "video",
    order: kind === "lecture" ? "relevance" : "viewCount",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoDuration: minMinutes >= 20 ? "long" : "any",
    relevanceLanguage: "en",
    safeSearch: "strict",
    maxResults: "20",
  });
  const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  let videos = (await details(ids)).filter((v) => v.seconds >= minMinutes * 60);
  if (kind === "oneshot") {
    const shots = videos.filter((v) => ONE_SHOT.test(v.title));
    if (shots.length >= 2) videos = shots;
  } else if (kind === "lecture") {
    const lectures = videos.filter((v) => !ONE_SHOT.test(v.title));
    if (lectures.length >= 2) videos = lectures;
    return videos.slice(0, 8); // keep YouTube's relevance order for lectures
  }
  return rank(videos).slice(0, 8);
}

export const searchVideos = unstable_cache(search, ["yt-search-v2"], { revalidate: YT_KEEP_SECONDS });
// checked daily, so a deleted or private video is noticed quickly
export const videoDetails = unstable_cache(details, ["yt-details-v1"], { revalidate: 24 * 60 * 60 });
