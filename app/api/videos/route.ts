/* GET /api/videos?q=python+full+course&min=20
   Most viewed embeddable videos on a topic, with views, likes, length and chapters.
   Needs YOUTUBE_API_KEY in .env.local (free: YouTube Data API v3).
   Results are shared by all students and refreshed every 29 days (lib/server/youtube.ts),
   so the free daily search quota goes a long way. */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { YtError, searchVideos } from "@/lib/server/youtube";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

export async function GET(req: Request) {
  // signed-in students only, so nobody else can spend the YouTube quota
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ videos: [], reason: "signed-out" }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const minMinutes = Math.min(Math.max(Number(url.searchParams.get("min") ?? 20) || 0, 0), 600);
  if (!q || q.length > 100) return NextResponse.json({ error: "bad query", videos: [] }, { status: 400 });
  try {
    const k = url.searchParams.get("kind");
    const kind = k === "oneshot" || k === "lecture" ? k : "any";
    // "any" keeps the old two-argument call so cached searches are reused
    return NextResponse.json({ videos: await (kind === "any" ? searchVideos(q, minMinutes) : searchVideos(q, minMinutes, kind)) });
  } catch (e) {
    if (e instanceof YtError) return NextResponse.json({ videos: [], reason: e.reason }, { status: e.status });
    return NextResponse.json({ videos: [], reason: "network" }, { status: 502 });
  }
}
