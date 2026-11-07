/* GET /api/videos?q=python+full+course&min=20
   Searches YouTube for embeddable videos on a topic, sorted by view count, then
   reads each video’s views, likes and length and returns the best ones.
   Needs YOUTUBE_API_KEY in .env.local (free: YouTube Data API v3).
   Each topic is cached for a day, so the free daily quota goes a long way. */

import { NextResponse } from "next/server";
import { isoSeconds, rank, type YtVideo } from "@/lib/youtube";

const API = "https://www.googleapis.com/youtube/v3";
const DAY = 60 * 60 * 24;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const minMinutes = Math.min(Math.max(Number(url.searchParams.get("min") ?? 20) || 0, 0), 600);
  if (!q || q.length > 100) return NextResponse.json({ error: "bad query", videos: [] }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ videos: [], reason: "no-key" });

  try {
    const search = new URLSearchParams({
      part: "snippet",
      q,
      type: "video",
      order: "viewCount",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      videoDuration: minMinutes >= 20 ? "long" : "any",
      relevanceLanguage: "en",
      safeSearch: "strict",
      maxResults: "20",
      key,
    });
    const s = await fetch(`${API}/search?${search}`, { next: { revalidate: DAY } });
    if (!s.ok) return NextResponse.json({ videos: [], reason: "youtube-error", status: s.status }, { status: 502 });
    const sj = (await s.json()) as { items?: { id?: { videoId?: string } }[] };
    const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
    if (!ids.length) return NextResponse.json({ videos: [] });

    const details = new URLSearchParams({ part: "snippet,statistics,contentDetails,status", id: ids.join(","), key });
    const d = await fetch(`${API}/videos?${details}`, { next: { revalidate: DAY } });
    if (!d.ok) return NextResponse.json({ videos: [], reason: "youtube-error", status: d.status }, { status: 502 });
    const dj = (await d.json()) as {
      items?: {
        id: string;
        snippet?: { title?: string; channelTitle?: string };
        statistics?: { viewCount?: string; likeCount?: string };
        contentDetails?: { duration?: string };
        status?: { embeddable?: boolean; privacyStatus?: string };
      }[];
    };

    const videos: YtVideo[] = (dj.items ?? [])
      .filter((v) => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
      .map((v) => ({
        id: v.id,
        title: v.snippet?.title ?? "",
        channel: v.snippet?.channelTitle ?? "",
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        seconds: isoSeconds(v.contentDetails?.duration ?? ""),
      }))
      .filter((v) => v.seconds >= minMinutes * 60);

    return NextResponse.json(
      { videos: rank(videos).slice(0, 8) },
      { headers: { "Cache-Control": `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}` } },
    );
  } catch {
    return NextResponse.json({ videos: [], reason: "network" }, { status: 502 });
  }
}
