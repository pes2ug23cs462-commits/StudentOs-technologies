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

/* Searching by view count makes YouTube return popular videos that only loosely fit
   (a "professional communication" search gave an essay-writing video). So we search by
   relevance, keep videos whose title is about the topic, then pick the most viewed of those. */
const GENERIC = new Set(["full", "course", "complete", "beginner", "beginners", "tutorial", "tutorials", "lecture", "lectures", "class", "one", "shot", "oneshot", "revision", "important", "concept", "concepts", "explained", "explain", "example", "examples", "with", "and", "for", "the", "of", "in", "to", "on", "a", "an", "basics", "basic", "introduction", "intro", "learn", "learning", "free", "part", "chapter", "skills", "skill", "topic", "topics", "questions", "question", "interview"]);
const stemWord = (w: string) => (w.length > 4 ? w.replace(/(ies|es|s|ing)$/, "") : w);
const keyWords = (q: string) => [...new Set(q.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !GENERIC.has(w)).map(stemWord))];
/** Videos about the query: most of its key words in the title, else at least one; else all. */
function onTopic(videos: YtVideo[], q: string) {
  const want = keyWords(q);
  if (!want.length) return videos;
  const hits = (v: YtVideo) => {
    const have = new Set(keyWords(v.title));
    return want.filter((w) => have.has(w)).length;
  };
  const need = Math.max(1, Math.ceil(want.length / 2));
  const strong = videos.filter((v) => hits(v) >= need);
  if (strong.length) return strong;
  const some = videos.filter((v) => hits(v) >= 1);
  return some.length ? some : videos;
}

/** Most viewed, embeddable videos for a topic (100 quota units, so it is cached).
    kind "oneshot": only videos whose title says one shot; "lecture": chapter
    lectures ranked by relevance, one-shot videos left out. */
async function search(q: string, minMinutes: number, kind: VideoKind = "any"): Promise<YtVideo[]> {
  const sj = await get<{ items?: { id?: { videoId?: string } }[] }>("search", {
    part: "snippet",
    q,
    type: "video",
    order: "relevance",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoDuration: minMinutes >= 20 ? "long" : "any",
    relevanceLanguage: "en",
    safeSearch: "strict",
    maxResults: "25",
  });
  const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  let videos = onTopic((await details(ids)).filter((v) => v.seconds >= minMinutes * 60), q);
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

export const searchVideos = unstable_cache(search, ["yt-search-v3"], { revalidate: YT_KEEP_SECONDS });
// checked daily, so a deleted or private video is noticed quickly
export const videoDetails = unstable_cache(details, ["yt-details-v1"], { revalidate: 24 * 60 * 60 });
