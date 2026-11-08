import { auth } from "./firebase";

/* Voice typing: records from the mic in the browser, then the server turns it
   into text with Groq’s Whisper (works in every modern browser, any language). */

export const VOICE_LANGS = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "kn-IN", label: "ಕನ್ನಡ" },
];

/* ---------- Recording + Whisper (works in every modern browser) ---------- */


export const MAX_RECORD_SECONDS = 60;

export interface Recorder {
  stop: () => void;
  cancel: () => void;
}

/** Starts recording from the mic. Calls onDone with the audio when stopped. */
export async function startRecording(onDone: (audio: Blob) => void): Promise<Recorder> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("unsupported");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  let cancelled = false;
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (!cancelled) onDone(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
  };
  rec.start();
  const limit = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_SECONDS * 1000);
  return {
    stop: () => {
      clearTimeout(limit);
      if (rec.state === "recording") rec.stop();
    },
    cancel: () => {
      cancelled = true;
      clearTimeout(limit);
      if (rec.state === "recording") rec.stop();
    },
  };
}

const VOICE_ERRORS: Record<string, string> = {
  "no-key": "Voice typing needs the AI key (GROQ_API_KEY) on the server.",
  "daily-limit": "You’ve reached today’s free assistant limit. It resets tomorrow.",
  "slow-down": "Too many requests. Wait a few seconds and try again.",
  busy: "Voice typing is busy right now. Try again in a minute.",
  "too-long": "That recording is too long. Keep it under a minute.",
  "signed-out": "Please log in again.",
  "no-audio": "Didn’t catch any sound. Try again.",
};

export async function transcribe(audio: Blob, lang = "en-IN"): Promise<string> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (!token) throw new Error(VOICE_ERRORS["signed-out"]);
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("audio", audio, `voice.${ext}`);
  form.append("lang", lang);
  let res: Response;
  try {
    res = await fetch("/api/transcribe", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  } catch {
    throw new Error("You seem to be offline.");
  }
  const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (res.ok) return j.text ?? "";
  const err = new Error(VOICE_ERRORS[j.error ?? ""] ?? "Couldn’t turn that into text. Try again.");
  (err as Error & { code?: string }).code = j.error;
  throw err;
}
