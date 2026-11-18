/* Google Cloud Text-to-Speech, signed in with the Firebase service account
   (FIREBASE_SERVICE_ACCOUNT). Free each month: 4 million characters of WaveNet
   voices. Needs the "Cloud Text-to-Speech API" enabled on the same Google Cloud
   project, and billing on (Firebase Blaze). Voices can be changed with
   GOOGLE_TTS_VOICE_EN / _HI / _KN. */

import { googleToken } from "@/lib/server/firestore-admin";

export type TtsLang = "en" | "hi" | "kn";

const VOICE: Record<TtsLang, { code: string; name: string }> = {
  en: { code: "en-IN", name: process.env.GOOGLE_TTS_VOICE_EN || "en-IN-Wavenet-A" },
  hi: { code: "hi-IN", name: process.env.GOOGLE_TTS_VOICE_HI || "hi-IN-Wavenet-A" },
  kn: { code: "kn-IN", name: process.env.GOOGLE_TTS_VOICE_KN || "kn-IN-Wavenet-A" },
};

export const googleVoiceName = (lang: TtsLang) => VOICE[lang].name;

export class GoogleTtsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Speaks text and returns a WAV file (24 kHz). Throws GoogleTtsError when Google says no. */
export async function googleSpeak(text: string, lang: TtsLang): Promise<ArrayBuffer> {
  const t = await googleToken();
  if (!t) throw new GoogleTtsError(503, "no-account");
  const v = VOICE[lang];
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.token}`, "x-goog-user-project": t.project },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: v.code, name: v.name },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000, speakingRate: lang === "en" ? 1 : 0.95 },
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 400);
    throw new GoogleTtsError(res.status, body);
  }
  const j = (await res.json()) as { audioContent?: string };
  if (!j.audioContent) throw new GoogleTtsError(502, "empty");
  const b = Buffer.from(j.audioContent, "base64");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/** Plain-language reason for the system check. */
export function googleTtsProblem(e: unknown): string {
  if (!(e instanceof GoogleTtsError)) return "Couldn’t reach Google Text-to-Speech.";
  if (e.message === "no-account") return "Needs FIREBASE_SERVICE_ACCOUNT.";
  if (/SERVICE_DISABLED|has not been used|is disabled/i.test(e.message)) return "Turn on “Cloud Text-to-Speech API” in Google Cloud Console for this project.";
  if (/BILLING_DISABLED|billing/i.test(e.message)) return "Turn on billing (Firebase Blaze plan) for this project. The first 4 million characters a month stay free.";
  if (e.status === 403) return "The service account isn’t allowed to use Text-to-Speech (403).";
  if (e.status === 400 && /voice/i.test(e.message)) return "That voice name doesn’t exist. Change GOOGLE_TTS_VOICE_*.";
  if (e.status === 429) return "Works, but busy right now (429).";
  return `Google said ${e.status}.`;
}
