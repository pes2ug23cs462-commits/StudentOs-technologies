/* POST /api/transcribe  (multipart form: audio=<recording>)
   Turns a short voice recording into text with Groq’s Whisper (free tier).
   Backup when Groq is busy or down: Cloudflare Workers AI Whisper
   (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN, same as the AI backup).
   Header: Authorization: Bearer <Firebase ID token>. Returns { text } or { error }. */

import { NextResponse } from "next/server";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const key = process.env.GROQ_API_KEY;
  const cf = cloudflare();
  if (!key && !cf) return NextResponse.json({ error: "no-key" }, { status: 503 });

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

  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const code = lang === "kn-IN" ? "kn" : lang === "hi-IN" ? "hi" : "";
  const prompt =
    lang === "kn-IN"
      ? "ವಿದ್ಯಾರ್ಥಿ ಓದಿನ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳುತ್ತಿದ್ದಾರೆ."
      : lang === "hi-IN"
        ? "छात्र पढ़ाई के बारे में सवाल पूछ रहा है।"
        : // Nudges Hindi/Hinglish speech to be written in English letters, the way students type.
          "Student asking a study question in English or Hinglish, written in English letters.";

  let busy = false;
  if (key && (!cf || Date.now() > groqCoolUntil)) {
    const r = await viaGroq(key, audio, code, prompt);
    if (typeof r === "string") return NextResponse.json({ text: r });
    if (r === "busy") busy = true;
  }
  if (cf) {
    const r = await viaCloudflare(cf, audio, code, prompt);
    if (typeof r === "string") return NextResponse.json({ text: r });
    if (r === "busy") busy = true;
  }
  return busy ? NextResponse.json({ error: "busy" }, { status: 429 }) : NextResponse.json({ error: "failed" }, { status: 502 });
}

/** When Groq says its limit is reached, go straight to the backup for a minute. */
let groqCoolUntil = 0;

function cloudflare() {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  return id && token ? { id, token } : null;
}

async function viaGroq(key: string, audio: File, code: string, prompt: string): Promise<string | "busy" | "failed"> {
  const out = new FormData();
  out.append("file", audio, audio.name || "voice.webm");
  out.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  out.append("response_format", "json");
  out.append("temperature", "0");
  if (code) out.append("language", code);
  out.append("prompt", prompt);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429) {
      groqCoolUntil = Date.now() + 60_000;
      return "busy";
    }
    if (!res.ok) {
      console.error("[transcribe] groq", res.status, (await res.text()).slice(0, 300));
      return "failed";
    }
    const j = (await res.json()) as { text?: string };
    return (j.text ?? "").trim();
  } catch (e) {
    console.error("[transcribe] groq", e instanceof Error ? e.message : e);
    return "failed";
  }
}

async function viaCloudflare(cf: { id: string; token: string }, audio: File, code: string, prompt: string): Promise<string | "busy" | "failed"> {
  const model = process.env.CLOUDFLARE_STT_MODEL || "@cf/openai/whisper-large-v3-turbo";
  try {
    const b64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cf.id)}/ai/run/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cf.token}` },
      body: JSON.stringify({ audio: b64, ...(code ? { language: code } : {}), initial_prompt: prompt }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429) return "busy";
    if (!res.ok) {
      console.error("[transcribe] cloudflare", res.status, (await res.text()).slice(0, 300));
      return "failed";
    }
    const j = (await res.json()) as { result?: { text?: string } };
    return (j.result?.text ?? "").trim();
  } catch (e) {
    console.error("[transcribe] cloudflare", e instanceof Error ? e.message : e);
    return "failed";
  }
}
