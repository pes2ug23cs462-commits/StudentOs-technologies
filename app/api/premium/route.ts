/* GET /api/premium → { premium: boolean } for the signed-in student. */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

export async function GET(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  return NextResponse.json({ premium: await isPremium(uid) }, { headers: { "Cache-Control": "no-store" } });
}
