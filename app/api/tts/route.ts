/* POST /api/tts  (Premium)  { text (≤ 200 chars), voice }  → audio/wav
   Natural narrator voice for “Explain with AI”, using Orpheus text-to-speech on
   Groq (same GROQ_API_KEY as the AI). Model id can be changed with GROQ_TTS_MODEL.
   On any error the player falls back to the browser's own voice. */

import { NextResponse } from "next/server";
import { LINE_MAX, isVoice } from "@/lib/explainer";
import { verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

export const maxDuration = 30;

/* Own limits (characters are what TTS is billed by), kept in memory per student. */
const DAILY_CHARS = 30_000;
const usage = new Map<string, { day: string; chars: number; minute: number[] }>();

function take(uid: string, chars: number) {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(uid) ?? { day, chars: 0, minute: [] };
  if (u.day !== day) Object.assign(u, { day, chars: 0 });
  u.minute = u.minute.filter((t) => now - t < 60_000);
  if (u.minute.length >= 40) return "slow-down";
  if (u.chars + chars > DAILY_CHARS) return "daily-limit";
  u.minute.push(now);
  u.chars += chars;
  if (usage.size > 5000) usage.clear();
  usage.set(uid, u);
  return null;
}

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!(await isPremium(uid))) return NextResponse.json({ error: "premium" }, { status: 402 });

  const b = (await req.json().catch(() => ({}))) as { text?: unknown; voice?: unknown };
  const text = String(b.text ?? "").replace(/\s+/g, " ").trim().slice(0, LINE_MAX + 10);
  if (!text) return NextResponse.json({ error: "failed" }, { status: 400 });
  const voice = isVoice(b.voice) ? b.voice : "hannah";
  const limited = take(uid, text.length);
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english", voice, input: text, response_format: "wav" }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("tts", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return NextResponse.json({ error: res.status === 429 ? "busy" : "failed" }, { status: res.status === 429 ? 429 : 502 });
    }
    return new Response(await res.arrayBuffer(), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
