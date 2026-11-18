/* POST /api/tts  { text (≤ 200 chars), voice, lang ("en" | "hi" | "kn") }  → audio/wav
   The AI interviewer's and the "Explain with AI" narrator's voice.
   - English for Premium: Orpheus on Groq (GROQ_API_KEY), the most natural voice.
   - Everyone else, every language, and when Groq is busy: Google Cloud
     Text-to-Speech (free up to 4 million characters a month, see google-tts.ts).
   On any error the player falls back to the device's own voice. */

import { NextResponse } from "next/server";
import { LINE_MAX, isVoice } from "@/lib/explainer";
import { verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";
import { adminConfigured } from "@/lib/server/firestore-admin";
import { GoogleTtsError, googleSpeak, type TtsLang } from "@/lib/server/google-tts";

export const maxDuration = 30;

/* Own limits (characters are what TTS is billed by), kept in memory per student. */
const DAILY_CHARS = { premium: 30_000, free: 12_000 };
const usage = new Map<string, { day: string; chars: number; minute: number[] }>();

function take(uid: string, chars: number, premium: boolean) {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(uid) ?? { day, chars: 0, minute: [] };
  if (u.day !== day) Object.assign(u, { day, chars: 0 });
  u.minute = u.minute.filter((t) => now - t < 60_000);
  if (u.minute.length >= 40) return "slow-down";
  if (u.chars + chars > DAILY_CHARS[premium ? "premium" : "free"]) return "daily-limit";
  u.minute.push(now);
  u.chars += chars;
  if (usage.size > 5000) usage.clear();
  usage.set(uid, u);
  return null;
}

/** When Groq's voice is out of free minutes, skip it for a while. */
let groqCoolUntil = 0;

const wav = (b: ArrayBuffer) => new Response(b, { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" } });

export async function POST(req: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const google = adminConfigured();
  if (!groqKey && !google) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { text?: unknown; voice?: unknown; lang?: unknown };
  const text = String(b.text ?? "").replace(/\s+/g, " ").trim().slice(0, LINE_MAX + 10);
  if (!text) return NextResponse.json({ error: "failed" }, { status: 400 });
  const voice = isVoice(b.voice) ? b.voice : "hannah";
  const lang: TtsLang = b.lang === "hi" || b.lang === "kn" ? b.lang : "en";
  const premium = await isPremium(uid);
  const limited = take(uid, text.length, premium);
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  let busy = false;

  // 1. Premium English: Orpheus on Groq
  if (lang === "en" && premium && groqKey && Date.now() > groqCoolUntil) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({ model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english", voice, input: text, response_format: "wav" }),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (res.ok) return wav(await res.arrayBuffer());
      console.error("tts groq", res.status, (await res.text().catch(() => "")).slice(0, 300));
      if (res.status === 429) {
        busy = true;
        groqCoolUntil = Date.now() + 60_000;
      }
    } catch (e) {
      console.error("tts groq", e instanceof Error ? e.message : e);
    }
  }

  // 2. Google voice (everyone, every language)
  if (google) {
    try {
      return wav(await googleSpeak(text, lang));
    } catch (e) {
      console.error("tts google", e instanceof GoogleTtsError ? `${e.status} ${e.message}` : e);
      if (e instanceof GoogleTtsError && e.status === 429) busy = true;
    }
  }

  return busy ? NextResponse.json({ error: "busy" }, { status: 429 }) : NextResponse.json({ error: "failed" }, { status: 502 });
}
