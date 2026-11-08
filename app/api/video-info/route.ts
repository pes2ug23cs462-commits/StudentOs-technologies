/* GET /api/video-info?ids=a,b,c
   Fresh title, channel, length and chapters for videos a student has in their
   courses. Used to refresh stored video data every 30 days (YouTube policy).
   Videos that were deleted or made private are simply missing from the answer. */

import { NextResponse } from "next/server";
import { YtError, videoDetails } from "@/lib/server/youtube";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

export async function GET(req: Request) {
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((x) => /^[\w-]{11}$/.test(x)))].sort().slice(0, 50);
  if (!ids.length) return NextResponse.json({ videos: [] });
  try {
    return NextResponse.json({ videos: await videoDetails(ids), checked: ids });
  } catch (e) {
    if (e instanceof YtError) return NextResponse.json({ videos: [], reason: e.reason }, { status: e.status });
    return NextResponse.json({ videos: [], reason: "network" }, { status: 502 });
  }
}
