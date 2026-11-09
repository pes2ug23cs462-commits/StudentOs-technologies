/* Smooth text-to-speech for the mock interviewer, using the browser’s own voices
   (free, no API). Choppy speech usually comes from a poor default voice, from
   cancel() being called right before speak(), or from Chrome cutting long text.
   So we: pick the most natural English voice available, speak sentence by
   sentence, wait a moment after cancelling, and keep Chrome’s speech alive. */

const PREFERRED = [
  // Edge / Windows neural voices: the smoothest
  /natural.*(india|en-in)/i,
  /(neerja|prabhat).*natural/i,
  /natural/i,
  // Chrome’s Google voices
  /google uk english female/i,
  /google us english/i,
  /google.*english.*india/i,
  // macOS / iOS
  /(veena|rishi|samantha|karen|daniel)/i,
  // Windows desktop voices
  /(heera|ravi|zira|aria|jenny)/i,
];

const PREF_KEY = "studentos:voice";

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

/** Voices load late in some browsers: resolves once they are there (or after 1.5 s). */
export function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const now = englishVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(englishVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

export function bestVoice(list = englishVoices()): SpeechSynthesisVoice | null {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(PREF_KEY);
  } catch {
    /* storage unavailable */
  }
  const chosen = saved && list.find((v) => v.name === saved);
  if (chosen) return chosen;
  for (const re of PREFERRED) {
    const v = list.find((x) => re.test(`${x.name} ${x.lang}`));
    if (v) return v;
  }
  return list.find((v) => v.lang === "en-IN") ?? list.find((v) => v.localService) ?? list[0] ?? null;
}

export function saveVoice(name: string) {
  try {
    localStorage.setItem(PREF_KEY, name);
  } catch {
    /* ignore */
  }
}

let keepAlive: ReturnType<typeof setInterval> | null = null;
let token = 0;

export function stopSpeaking() {
  token++;
  if (keepAlive) clearInterval(keepAlive);
  keepAlive = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Speaks the text smoothly. Calling it again stops what was being said. */
export async function speakText(text: string, opts: { voice?: SpeechSynthesisVoice | null; rate?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  stopSpeaking();
  const my = token;
  const voices = await voicesReady();
  // a short pause after cancel() avoids the stutter Chrome has when speaking straight away
  await new Promise((r) => setTimeout(r, 120));
  if (my !== token) return;

  const voice = opts.voice ?? bestVoice(voices);
  const parts = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const synth = window.speechSynthesis;
  parts.forEach((p) => {
    const u = new SpeechSynthesisUtterance(p.trim());
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = opts.rate ?? 0.97;
    u.pitch = 1;
    u.volume = 1;
    synth.speak(u);
  });
  // Chrome pauses long speech after ~15 s; a gentle nudge keeps it going
  if (/chrome/i.test(navigator.userAgent) && !/edg/i.test(navigator.userAgent)) {
    keepAlive = setInterval(() => {
      if (!synth.speaking) {
        if (keepAlive) clearInterval(keepAlive);
        keepAlive = null;
        return;
      }
      synth.pause();
      synth.resume();
    }, 10000);
  }
}
