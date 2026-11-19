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
// a small object detector (~4 MB): phones, laptops, tablets/screens, books, and whole people
const OBJECT_MODEL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

export type PresenceSummary = { facing: number; away: number; out: number };
export type PresenceEvent = { kind: "away" | "out"; startedAt: number; secs: number };

type Point = { x: number; y: number };
type Category = { categoryName: string; score: number };
type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { faceLandmarks: Point[][]; faceBlendshapes?: { categories: Category[] }[] };
  close: () => void;
};

type Detection = { categories: Category[] };
type Detector = { detectForVideo: (v: HTMLVideoElement, ts: number) => { detections: Detection[] }; close: () => void };
type Vision = {
  FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
  FaceLandmarker: { createFromOptions: (v: unknown, o: unknown) => Promise<Landmarker> };
  ObjectDetector: { createFromOptions: (v: unknown, o: unknown) => Promise<Detector> };
};
let visionLoading: Promise<{ mp: Vision; files: unknown }> | null = null;
function vision() {
  if (!visionLoading) {
    visionLoading = (async () => {
      const url = BUNDLE;
      const mp = (await import(/* webpackIgnore: true */ url)) as Vision;
      return { mp, files: await mp.FilesetResolver.forVisionTasks(WASM) };
    })();
    visionLoading.catch(() => {
      visionLoading = null;
    });
  }
  return visionLoading;
}

/** What counts as "a device" on camera, with how sure the model must be. */
const DEVICES: Record<string, number> = { "cell phone": 0.3, laptop: 0.45, tv: 0.45, remote: 0.4, book: 0.5 };
let detLoading: Promise<Detector> | null = null;
function loadDetector(): Promise<Detector> {
  if (!detLoading) {
    detLoading = (async () => {
      const { mp, files } = await vision();
      return mp.ObjectDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: OBJECT_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        scoreThreshold: 0.3,
        maxResults: 10,
        categoryAllowlist: [...Object.keys(DEVICES), "person"],
      });
    })();
    detLoading.catch(() => {
      detLoading = null;
    });
  }
  return detLoading;
}

let loading: Promise<Landmarker> | null = null;
function load(): Promise<Landmarker> {
  if (!loading) {
    loading = (async () => {
      const { mp, files } = await vision();
      return mp.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        // strict: find a second face even when it's small, half in view or in poor light
        numFaces: 3,
        minFaceDetectionConfidence: 0.3,
        minFacePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
        outputFaceBlendshapes: true,
      });
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** Head turn (yaw, 0.5 = straight) and tilt (pitch) from the landmarks. */
function pose(points: Point[]) {
  const nose = points[1], left = points[234], right = points[454], top = points[10], chin = points[152];
  if (!nose || !left || !right || !top || !chin) return null;
  return { yaw: (nose.x - left.x) / Math.max(1e-6, right.x - left.x), pitch: (nose.y - top.y) / Math.max(1e-6, chin.y - top.y) };
}
/** Is the face turned to the screen? Measured against how this student sat at the start
    (a camera off to one side, or a laptop low on the desk, is their "straight").
    Looking down is fine: in a coding round that is the keyboard. */
function facing(points: Point[], shapes: Category[] | undefined, base: { yaw: number; pitch: number }) {
  const p = pose(points);
  if (!p) return false;
  if (Math.abs(p.yaw - base.yaw) > 0.24 || p.pitch < base.pitch - 0.16) return false;
  const s = (n: string) => shapes?.find((c) => c.categoryName === n)?.score ?? 0;
  const side = Math.max(s("eyeLookOutLeft") + s("eyeLookInRight"), s("eyeLookOutRight") + s("eyeLookInLeft")) / 2;
  return side < 0.75;
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

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
  warn?: { secs: number; on: (kind: "away" | "out" | "people" | "device") => void },
) {
  let lm: Landmarker;
  try {
    lm = await load();
  } catch {
    return null;
  }
  // devices and extra people, checked a little less often (about 3 times a second).
  // The face check works without it, so a model that fails to load just skips this part.
  let det: Detector | null = null;
  if (warn) void loadDetector().then((d) => (det = d)).catch(() => {});
  const dev: boolean[] = [];
  const crowd: boolean[] = [];
  let devWarned = false, crowdWarned = false, tick = 0, lastTs = 0;
  let samples = 0, onScreen = 0, away = 0, out = 0;
  let state: "on" | "away" | "out" = "on";
  let since = now();
  let warned = false;
  // mouth movement over the last ~1.2 s (for the voice check): jaw-open score and the gap
  // between the inner lips relative to face height; talking makes both go up and down
  const mouthHist: { t: number; jaw: number; gap: number }[] = [];
  let lastFaceAt = 0;
  // the student's own "straight ahead", learned from the first couple of seconds with a face
  const seen: { yaw: number; pitch: number }[] = [];
  let base = { yaw: 0.5, pitch: 0.45 };
  // a second face on camera (someone helping): checked on its own, it can overlap a look-away.
  // Counted when it's in most of the last ~1.2 s (8 frames), so a brief flicker doesn't count
  const two: boolean[] = [];
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
      const ts = Math.max(performance.now(), lastTs + 1);
      lastTs = ts;
      const r = lm.detectForVideo(video, ts);
      const face = r.faceLandmarks[0];
      two.push(r.faceLandmarks.length > 1);
      if (two.length > 6) two.shift();
      const seenTwo = two.filter(Boolean).length;
      if (warn && det && ++tick % 2 === 0) {
        try {
          const found = det.detectForVideo(video, ts).detections.map((d) => d.categories[0]).filter(Boolean);
          dev.push(found.some((c) => c.categoryName in DEVICES && c.score >= DEVICES[c.categoryName]));
          crowd.push(found.filter((c) => c.categoryName === "person" && c.score >= 0.4).length > 1);
          if (dev.length > 5) dev.shift();
          if (crowd.length > 5) crowd.shift();
          const nDev = dev.filter(Boolean).length, nCrowd = crowd.filter(Boolean).length;
          // seen in 2 of the last ~1.5 s of checks: a phone held up for a moment is enough
          if (!devWarned && nDev >= 2) {
            devWarned = true;
            warn.on("device");
          }
          if (devWarned && nDev === 0 && dev.length === 5) devWarned = false;
          if (!crowdWarned && !twoWarned && nCrowd >= 2) {
            crowdWarned = true;
            warn.on("people");
          }
          if (crowdWarned && nCrowd === 0 && crowd.length === 5) crowdWarned = false;
        } catch {
          /* skipped */
        }
      }
      // strict: a second face in 3 of the last ~1 s of frames
      if (warn && !twoWarned && !crowdWarned && seenTwo >= 3) {
        twoWarned = true;
        warn.on("people");
      }
      if (twoWarned && seenTwo === 0 && two.length === 6) twoWarned = false; // gone again: can warn next time
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
      if (face && seen.length < 15) {
        const p = pose(face);
        if (p) {
          seen.push(p);
          if (seen.length === 15) base = { yaw: Math.min(0.68, Math.max(0.32, median(seen.map((x) => x.yaw)))), pitch: Math.min(0.55, Math.max(0.3, median(seen.map((x) => x.pitch)))) };
        }
      }
      samples++;
      // still learning where "straight" is: count it as on screen
      const next = !face ? "out" : seen.length < 15 || facing(face, r.faceBlendshapes?.[0]?.categories, base) ? "on" : "away";
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
