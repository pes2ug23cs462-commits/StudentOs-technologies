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
        numFaces: 1,
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
export async function watchPresence(video: HTMLVideoElement, now: () => number, onEvent: (e: PresenceEvent) => void) {
  let lm: Landmarker;
  try {
    lm = await load();
  } catch {
    return null;
  }
  let samples = 0, onScreen = 0, away = 0, out = 0;
  let state: "on" | "away" | "out" = "on";
  let since = now();
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
  };
  const timer = setInterval(() => {
    if (video.readyState < 2 || !video.videoWidth) return;
    try {
      const r = lm.detectForVideo(video, performance.now());
      const face = r.faceLandmarks[0];
      samples++;
      const next = !face ? "out" : facing(face, r.faceBlendshapes?.[0]?.categories) ? "on" : "away";
      if (next === "on") onScreen++;
      flush(next);
    } catch {
      /* a skipped frame is fine */
    }
  }, 300);
  return {
    stop(): PresenceSummary | null {
      clearInterval(timer);
      flush("on");
      return samples >= 10 ? { facing: Math.round((onScreen / samples) * 100), away, out } : null;
    },
  };
}
