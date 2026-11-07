/* POST /api/transcribe  (multipart form: audio=<recording>)
   Turns a short voice recording into text with Groq’s Whisper (free tier).
   Header: Authorization: Bearer <Firebase ID token>. Returns { text } or { error }. */

import { NextResponse } from "next/server";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "no-key" }, { status: 503 });

  let audio: File | null = null;
  let lang = "en-IN";
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) audio = f;
    lang = String(form.get("lang") ?? "en-IN");
  } catch {
    /* bad form */
  }
  if (!audio || audio.size === 0) return NextResponse.json({ error: "no-audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "too-long" }, { status: 413 });

  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const out = new FormData();
  out.append("file", audio, audio.name || "voice.webm");
  out.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  out.append("response_format", "json");
  out.append("temperature", "0");
  if (lang === "kn-IN") {
    out.append("language", "kn");
    out.append("prompt", "ವಿದ್ಯಾರ್ಥಿ ಓದಿನ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳುತ್ತಿದ್ದಾರೆ.");
  } else if (lang === "hi-IN") {
    out.append("language", "hi");
    out.append("prompt", "छात्र पढ़ाई के बारे में सवाल पूछ रहा है।");
  } else {
    // Nudges Hindi/Hinglish speech to be written in English letters, the way students type.
    out.append("prompt", "Student asking a study question in English or Hinglish, written in English letters.");
  }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429) return NextResponse.json({ error: "busy" }, { status: 429 });
    if (!res.ok) {
      console.error("[transcribe]", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
    const j = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (j.text ?? "").trim() });
  } catch (e) {
    console.error("[transcribe]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
