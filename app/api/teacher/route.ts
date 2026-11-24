/* GET /api/teacher?channel=UC…&q=1st+puc+physics   → that teacher's playlists for a subject
   GET /api/teacher?playlist=PL…                     → the playlist's videos, in order
   Learning → "Follow this teacher": a student who likes one teacher gets the next chapters,
   or a whole course, from the same channel. Signed-in students only (YouTube quota);
   results are shared and cached (lib/server/youtube.ts). */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { YtError, playlistItems, searchPlaylists, validChannel } from "@/lib/server/youtube";

export const maxDuration = 60;

export async function GET(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ reason: "signed-out" }, { status: 401 });
  const url = new URL(req.url);
  const playlist = url.searchParams.get("playlist") ?? "";
  const channel = url.searchParams.get("channel") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  try {
    if (playlist) {
      if (!/^[\w-]{10,64}$/.test(playlist)) return NextResponse.json({ error: "bad playlist" }, { status: 400 });
      return NextResponse.json({ videos: await playlistItems(playlist) });
    }
    if (!validChannel(channel) || !q || q.length > 80) return NextResponse.json({ error: "bad request" }, { status: 400 });
    return NextResponse.json({ playlists: await searchPlaylists(channel, q) });
  } catch (e) {
    if (e instanceof YtError) return NextResponse.json({ reason: e.reason }, { status: e.status });
    return NextResponse.json({ reason: "network" }, { status: 502 });
  }
}
