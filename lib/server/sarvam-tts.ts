/* Sarvam AI text-to-speech (Bulbul): natural Indian voices for Hindi, Kannada and
   Indian English, Hinglish included. No card needed: SARVAM_API_KEY from
   dashboard.sarvam.ai. Sign-up credits are free; after that it's pay per use.
   Voice and model can be changed with SARVAM_TTS_SPEAKER / SARVAM_TTS_MODEL. */

import type { TtsLang } from "@/lib/server/google-tts";

const CODE: Record<TtsLang, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };

export const sarvamConfigured = () => !!process.env.SARVAM_API_KEY;
export const sarvamVoice = () => `${process.env.SARVAM_TTS_MODEL || "bulbul:v2"} · ${process.env.SARVAM_TTS_SPEAKER || "anushka"}`;

export class SarvamError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Speaks text; returns a WAV file. */
export async function sarvamSpeak(text: string, lang: TtsLang): Promise<ArrayBuffer> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SarvamError(503, "no-key");
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": key },
    body: JSON.stringify({
      text,
      target_language_code: CODE[lang],
      model: process.env.SARVAM_TTS_MODEL || "bulbul:v2",
      speaker: process.env.SARVAM_TTS_SPEAKER || "anushka",
      speech_sample_rate: 24000,
      pace: lang === "en" ? 1 : 0.95,
      enable_preprocessing: true,
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new SarvamError(res.status, (await res.text().catch(() => "")).slice(0, 300));
  const j = (await res.json()) as { audios?: string[] };
  const b64 = j.audios?.[0];
  if (!b64) throw new SarvamError(502, "empty");
  const b = Buffer.from(b64, "base64");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/** Plain-language reason for the system check. */
export function sarvamProblem(e: unknown): string {
  if (!(e instanceof SarvamError)) return "Couldn’t reach Sarvam.";
  if (e.status === 401 || e.status === 403) return "Key is wrong. Copy it again from dashboard.sarvam.ai.";
  if (e.status === 402) return "Sarvam credits are used up. Add credits in Sarvam → Billing.";
  if (e.status === 429) return "Works, but busy right now (429).";
  if (e.status === 400) return `Sarvam didn’t accept the request: ${e.message.slice(0, 120)}`;
  return `Sarvam said ${e.status}.`;
}
