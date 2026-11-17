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
  /** the live mic stream, e.g. to draw a level meter */
  stream: MediaStream;
  stop: () => void;
  cancel: () => void;
}

/** Starts recording from the mic. Calls onDone with the audio when stopped.
    `pause`: stop by itself once they've spoken and then stayed quiet this long (ms),
    so a conversation can take turns like people do. */
export async function startRecording(onDone: (audio: Blob) => void, opts: { pause?: number } = {}): Promise<Recorder> {
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
  // pause detection: a level meter on the mic; speech is ~1/3 s above the room's noise, a pause is quiet after it
  let ctx: AudioContext | null = null;
  let watch = 0;
  if (opts.pause) {
    try {
      ctx = new AudioContext();
      void ctx.resume().catch(() => {}); // started without a tap (hands-free): make sure it runs
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      // the room's noise: the quietest level heard lately, rising slowly (so speaking at once doesn't fool it)
      let floor = 0, loud = 0, quietSince = 0, spoke = false;
      watch = window.setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        floor = !floor ? rms : rms < floor ? rms : floor * 1.002;
        const talking = rms > Math.max(0.01, floor * 3);
        if (talking) {
          loud += 50;
          quietSince = 0;
          if (loud > 300) spoke = true;
        } else {
          loud = Math.max(0, loud - 25);
          if (!quietSince) quietSince = Date.now();
          if (spoke && Date.now() - quietSince > opts.pause!) {
            window.clearInterval(watch);
            if (rec.state === "recording") rec.stop();
          }
        }
      }, 50);
    } catch {
      /* no pause detection: they press Done */
    }
  }
  const off = () => {
    window.clearInterval(watch);
    void ctx?.close().catch(() => {});
  };
  rec.addEventListener("stop", off);
  return {
    stream,
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
