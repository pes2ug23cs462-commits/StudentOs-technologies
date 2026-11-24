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
  snippet?: { title?: string; channelTitle?: string; channelId?: string; description?: string; defaultAudioLanguage?: string; defaultLanguage?: string };
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
    ...(v.snippet?.channelId ? { channelId: v.snippet.channelId } : {}),
    ...(spokenIn(v) ? { lang: spokenIn(v) } : {}),
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
export type VideoLang = "any" | "en" | "hi" | "kn";

const DEVANAGARI = /[\u0900-\u097F]/;
const KANNADA = /[\u0C80-\u0CFF]/;
const HINDI_WORDS = /\b(hindi|hinglish|हिंदी|हिन्दी)\b|हिंदी|हिन्दी/i;
const KANNADA_WORDS = /\bkannada\b/i;
const ENGLISH_WORDS = /\b(in english|english medium|english explanation|explained in english)\b/i;

/** Language the teacher speaks: YouTube's audio language when the creator set it, else signs in
    the title and description ("in Hindi", Devanagari, "Kannada", "in English"). "" = not known. */
function spokenIn(v: Item): string {
  const audio = (v.snippet?.defaultAudioLanguage ?? "").slice(0, 2).toLowerCase();
  if (audio) return audio;
  const title = v.snippet?.title ?? "";
  const desc = (v.snippet?.description ?? "").slice(0, 600);
  if (KANNADA.test(title) || KANNADA_WORDS.test(title)) return "kn";
  if (DEVANAGARI.test(title) || HINDI_WORDS.test(title)) return "hi";
  if (ENGLISH_WORDS.test(title)) return "en";
  if (KANNADA.test(desc) || KANNADA_WORDS.test(desc)) return "kn";
  if (DEVANAGARI.test(desc) || HINDI_WORDS.test(desc)) return "hi";
  if (ENGLISH_WORDS.test(desc)) return "en";
  return "";
}

/** Only videos taught in the student's language. English: videos known to be in English first;
    if too few, add the ones with no sign of another language. Never videos known to be in another language,
    unless nothing else is left. */
function inLanguage(videos: YtVideo[], lang: VideoLang) {
  if (lang === "any") return videos;
  const sure = videos.filter((v) => v.lang === lang);
  if (sure.length >= 2) return sure;
  const maybe = videos.filter((v) => v.lang === lang || !v.lang);
  if (lang === "en" && maybe.length) return maybe;
  if (maybe.length >= 2 && sure.length) return maybe;
  return sure.length ? sure : maybe.length ? maybe : videos;
}
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
async function search(q: string, minMinutes: number, kind: VideoKind = "any", lang: VideoLang = "any"): Promise<YtVideo[]> {
  const sj = await get<{ items?: { id?: { videoId?: string } }[] }>("search", {
    part: "snippet",
    q: lang === "hi" ? `${q} in hindi` : lang === "kn" ? `${q} in kannada` : lang === "en" ? `${q} in english` : q,
    type: "video",
    order: "relevance",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoDuration: minMinutes >= 20 ? "long" : "any",
    relevanceLanguage: lang === "any" ? "en" : lang,
    safeSearch: "strict",
    maxResults: "25",
  });
  const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  let videos = inLanguage(onTopic((await details(ids)).filter((v) => v.seconds >= minMinutes * 60), q), lang);
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
/** Searches in one language (English / Hindi / Kannada) get their own cache, so a change to the
    language rules doesn't wait for old results to expire. */
export const searchVideosIn = unstable_cache((q: string, minMinutes: number, kind: VideoKind, lang: VideoLang) => search(q, minMinutes, kind, lang), ["yt-search-lang-v2"], { revalidate: YT_KEEP_SECONDS });
// checked daily, so a deleted or private video is noticed quickly
export const videoDetails = unstable_cache(details, ["yt-details-v1"], { revalidate: 24 * 60 * 60 });

/* ---------- "same teacher": one channel's videos and playlists ---------- */

const CHANNEL = /^UC[\w-]{22}$/;
export const validChannel = (id: string) => CHANNEL.test(id);

/** Videos on a topic from one channel, most relevant first (100 units, cached). */
async function inChannel(q: string, channelId: string): Promise<YtVideo[]> {
  const sj = await get<{ items?: { id?: { videoId?: string } }[] }>("search", { part: "snippet", q, channelId, type: "video", order: "relevance", videoEmbeddable: "true", safeSearch: "strict", maxResults: "15" });
  const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  const byId = new Map((await details(ids)).map((v) => [v.id, v]));
  // keep YouTube's relevance order, only videos about the topic
  return onTopic(ids.map((id) => byId.get(id)).filter((v): v is YtVideo => !!v), q).slice(0, 8);
}

export type YtPlaylist = { id: string; title: string; channel: string; count: number };

/** A channel's playlists for a subject, e.g. "1st PUC Physics" (100 + 1 units, cached). */
async function channelPlaylists(channelId: string, q: string): Promise<YtPlaylist[]> {
  const sj = await get<{ items?: { id?: { playlistId?: string } }[] }>("search", { part: "snippet", q, channelId, type: "playlist", order: "relevance", safeSearch: "strict", maxResults: "10" });
  const ids = (sj.items ?? []).map((i) => i.id?.playlistId).filter(Boolean) as string[];
  if (!ids.length) return [];
  const pj = await get<{ items?: { id: string; snippet?: { title?: string; channelTitle?: string }; contentDetails?: { itemCount?: number }; status?: { privacyStatus?: string } }[] }>("playlists", { part: "snippet,contentDetails,status", id: ids.join(",") });
  const byId = new Map((pj.items ?? []).map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p) => p && p.status?.privacyStatus !== "private" && (p.contentDetails?.itemCount ?? 0) >= 2)
    .map((p) => ({ id: p!.id, title: p!.snippet?.title ?? "", channel: p!.snippet?.channelTitle ?? "", count: p!.contentDetails?.itemCount ?? 0 }));
}

/** First 50 playable videos of a playlist, in playlist order (2 units, cached). */
async function playlistVideos(playlistId: string): Promise<YtVideo[]> {
  const j = await get<{ items?: { contentDetails?: { videoId?: string } }[] }>("playlistItems", { part: "contentDetails", playlistId, maxResults: "50" });
  const ids = (j.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[];
  const byId = new Map((await details(ids)).map((v) => [v.id, v]));
  return ids.map((id) => byId.get(id)).filter((v): v is YtVideo => !!v);
}

export const searchChannel = unstable_cache(inChannel, ["yt-channel-v1"], { revalidate: YT_KEEP_SECONDS });
export const searchPlaylists = unstable_cache(channelPlaylists, ["yt-playlists-v1"], { revalidate: YT_KEEP_SECONDS });
export const playlistItems = unstable_cache(playlistVideos, ["yt-playlist-items-v1"], { revalidate: 24 * 60 * 60 });
