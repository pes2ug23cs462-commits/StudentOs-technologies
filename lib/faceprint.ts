/* Face check for strict rounds: is the person on camera the student who owns this account?

   A "faceprint" is a list of numbers, not a picture: the distances between ~26 fixed points
   of the face (eye corners, brows, nose, cheekbones, jaw, chin), measured in 3D from
   MediaPipe's face landmarks and divided by the distance between the eyes, so it doesn't
   depend on how near the camera the student sits. The photo never leaves the device.

   It is a light check, not ID-grade face recognition: lighting, glasses or a very different
   angle can move the numbers. So a mismatch only raises a warning, and a match with
   another student is only flagged for the placement cell to look at. The thresholds below
   need tuning with real students before anything stricter is built on them. */

export const FACE_POINTS = [33, 133, 362, 263, 70, 105, 107, 336, 334, 300, 1, 4, 6, 168, 98, 327, 234, 454, 93, 323, 152, 172, 397, 10, 61, 291];
export const FACEPRINT_LENGTH = (FACE_POINTS.length * (FACE_POINTS.length - 1)) / 2; // 325

/** Above this the face doesn't look like the account owner's (warning). */
export const OWN_MISMATCH = 0.075;
/** Below this the face looks like another student's (flag). Kept stricter, to avoid false accusations. */
export const OTHER_MATCH = 0.045;

type P = { x: number; y: number; z?: number };

/** The numbers for one video frame, or null when points are missing. */
export function faceprintOf(points: P[], width: number, height: number): number[] | null {
  const pts = FACE_POINTS.map((i) => points[i]);
  if (pts.some((p) => !p)) return null;
  const xyz = pts.map((p) => [p.x * width, p.y * height, (p.z ?? 0) * width]);
  const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const eyes = d(xyz[0], xyz[3]); // outer eye corners
  if (!(eyes > 1)) return null;
  const out: number[] = [];
  for (let i = 0; i < xyz.length; i++) for (let j = i + 1; j < xyz.length; j++) out.push(d(xyz[i], xyz[j]) / eyes);
  return out;
}

/** The middle value of each number over several frames (steadier than one frame). */
export function averagePrint(prints: number[][]): number[] | null {
  if (prints.length < 5) return null;
  return prints[0].map((_, k) => {
    const v = prints.map((p) => p[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  });
}

/** How different two faceprints are: 0 = the same; about 0.03 for the same face on another day. */
export function printDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 1;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]) / Math.max(1e-6, (a[i] + b[i]) / 2);
  return s / a.length;
}

export const encodePrint = (p: number[]) => p.map((x) => x.toFixed(4)).join(",");
export function decodePrint(s: unknown): number[] | null {
  if (typeof s !== "string") return null;
  const v = s.split(",").map(Number);
  return v.length === FACEPRINT_LENGTH && v.every((x) => Number.isFinite(x) && x > 0 && x < 20) ? v : null;
}

/* ---------- calls to /api/face ---------- */

export type FaceCheck = { enrolled: boolean; own?: boolean; other?: boolean };

export async function faceApi<T>(body: Record<string, unknown>): Promise<T> {
  const { auth } = await import("@/lib/firebase");
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (!token) throw new Error("signed-out");
  const res = await fetch("/api/face", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || "failed");
  return j;
}
