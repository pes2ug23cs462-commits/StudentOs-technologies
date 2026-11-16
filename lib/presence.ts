/* Camera presence in a mock interview, worked out on the student's own device.
   MediaPipe Face Landmarker (loaded from the jsDelivr CDN, ~3 MB model, cached by the
   browser) looks at the camera a few times a second and we keep only numbers:
   how much of the time the face was turned to the screen, how often the student
   looked away for a while, and how often they left the frame. No picture or video
   leaves the device. If the model can't load, the camera still shows a self-view. */

const VERSION = "0.10.33";
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type PresenceSummary = { facing: number; away: number; out: number };
export type PresenceEvent = { kind: "away" | "out"; startedAt: number; secs: number };

type Point = { x: number; y: number };
type Category = { categoryName: string; score: number };
type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { faceLandmarks: Point[][]; faceBlendshapes?: { categories: Category[] }[] };
  close: () => void;
};

let loading: Promise<Landmarker> | null = null;
function load(): Promise<Landmarker> {
  if (!loading) {
    loading = (async () => {
      const url = BUNDLE;
      const mp = (await import(/* webpackIgnore: true */ url)) as {
        FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
        FaceLandmarker: { createFromOptions: (v: unknown, o: unknown) => Promise<Landmarker> };
      };
      const vision = await mp.FilesetResolver.forVisionTasks(WASM);
      return mp.FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 2,
        outputFaceBlendshapes: true,
      });
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** Is the face turned to the screen? Head turn from the landmarks, sideways gaze from the blendshapes.
    Looking down is fine: in a coding round that is the keyboard. */
function facing(points: Point[], shapes: Category[] | undefined) {
  const nose = points[1], left = points[234], right = points[454], top = points[10], chin = points[152];
  if (!nose || !left || !right || !top || !chin) return false;
  const yaw = (nose.x - left.x) / Math.max(1e-6, right.x - left.x);
  const pitch = (nose.y - top.y) / Math.max(1e-6, chin.y - top.y);
  if (yaw < 0.3 || yaw > 0.7 || pitch < 0.3) return false;
  const s = (n: string) => shapes?.find((c) => c.categoryName === n)?.score ?? 0;
  const side = Math.max(s("eyeLookOutLeft") + s("eyeLookInRight"), s("eyeLookOutRight") + s("eyeLookInLeft")) / 2;
  return side < 0.6;
}

/**
 * Watches the video and reports long look-aways as they end.
 * `now()` gives the round's clock in seconds, so events line up with the rest of the round.
 * Resolves to null when the face model can't load (the self-view still works).
 */
export async function watchPresence(
  video: HTMLVideoElement,
  now: () => number,
  onEvent: (e: PresenceEvent) => void,
  /** strict mode: called once per look-away (or a second face) as soon as it lasts `secs` */
  warn?: { secs: number; on: (kind: "away" | "out" | "people") => void },
) {
  let lm: Landmarker;
  try {
    lm = await load();
  } catch {
    return null;
  }
  let samples = 0, onScreen = 0, away = 0, out = 0;
  let state: "on" | "away" | "out" = "on";
  let since = now();
  let warned = false;
  // mouth movement over the last ~1.2 s (for the voice check): jaw-open score and the gap
  // between the inner lips relative to face height; talking makes both go up and down
  const mouthHist: { t: number; jaw: number; gap: number }[] = [];
  let lastFaceAt = 0;
  // a second face on camera (someone helping): checked on its own, it can overlap a look-away
  let twoSince: number | null = null;
  let twoWarned = false;
  const flush = (next: "on" | "away" | "out") => {
    if (next === state) return;
    const secs = now() - since;
    if (state === "away" && secs >= 8) {
      away++;
      onEvent({ kind: "away", startedAt: since, secs });
    }
    if (state === "out" && secs >= 5) {
      out++;
      onEvent({ kind: "out", startedAt: since, secs });
    }
    state = next;
    since = now();
    warned = false;
  };
  const timer = setInterval(() => {
    if (video.readyState < 2 || !video.videoWidth) return;
    try {
      const r = lm.detectForVideo(video, performance.now());
      const face = r.faceLandmarks[0];
      if (r.faceLandmarks.length > 1) {
        twoSince ??= now();
        if (warn && !twoWarned && now() - twoSince >= Math.min(2, warn.secs)) {
          twoWarned = true;
          warn.on("people");
        }
      } else {
        twoSince = null;
        twoWarned = false;
      }
      if (face) {
        const s = r.faceBlendshapes?.[0]?.categories;
        const jaw = s?.find((c) => c.categoryName === "jawOpen")?.score ?? 0;
        const up = face[13], low = face[14], top = face[10], chin = face[152];
        const gap = up && low && top && chin ? Math.abs(low.y - up.y) / Math.max(1e-6, chin.y - top.y) : 0;
        const t = performance.now();
        lastFaceAt = t;
        mouthHist.push({ t, jaw, gap });
        while (mouthHist.length && t - mouthHist[0].t > 1200) mouthHist.shift();
      }
      samples++;
      const next = !face ? "out" : facing(face, r.faceBlendshapes?.[0]?.categories) ? "on" : "away";
      if (next === "on") onScreen++;
      flush(next);
      if (warn && state !== "on" && !warned && now() - since >= warn.secs) {
        warned = true;
        warn.on(state);
      }
    } catch {
      /* a skipped frame is fine */
    }
  }, 150);
  return {
    /** How much the lips moved in the last ~1.2 s (0 = still, about 0.1 or more = talking); -1 with no face. */
    mouth(): number {
      if (performance.now() - lastFaceAt > 800 || mouthHist.length < 3) return -1;
      const range = (k: "jaw" | "gap") => Math.max(...mouthHist.map((m) => m[k])) - Math.min(...mouthHist.map((m) => m[k]));
      return Math.max(range("jaw"), range("gap") * 4);
    },
    stop(): PresenceSummary | null {
      clearInterval(timer);
      flush("on");
      return samples >= 10 ? { facing: Math.round((onScreen / samples) * 100), away, out } : null;
    },
  };
}
