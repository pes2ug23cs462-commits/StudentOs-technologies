/* Careers: roles (posted by the StudentOS team from /partner → Careers, stored in
   Firestore site/careers: anyone can read, only the server writes) and the client
   for /api/careers (applications and the AI interview).
   Until the team posts anything, the page shows DEFAULT_ROLES. */

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { DEFAULT_CAREERS, type CareersDoc } from "./careers-data";

export * from "./careers-data";

export async function loadCareers(): Promise<CareersDoc> {
  try {
    const s = await getDoc(doc(db, "site", "careers"));
    if (!s.exists()) return DEFAULT_CAREERS;
    const d = s.data() as Partial<CareersDoc>;
    return { open: d.open !== false, roles: Array.isArray(d.roles) ? d.roles : [], updatedAt: Number(d.updatedAt) || 0 };
  } catch {
    return DEFAULT_CAREERS;
  }
}

/** Calls /api/careers. Team actions send the login token; the interview uses its link token. */
export async function careersApi<T>(action: string, body: Record<string, unknown> = {}, signedIn = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signedIn) {
    await auth.authStateReady?.().catch(() => {});
    const t = await auth.currentUser?.getIdToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch("/api/careers", { method: "POST", headers, body: JSON.stringify({ action, ...body }) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `status ${res.status}`);
  return j;
}

export const CAREERS_ERROR: Record<string, string> = {
  closed: "Applications for this role are closed.",
  "slow-down": "Too many applications from here today. Try again tomorrow.",
  "bad-form": "Fill in your name, a valid email, phone, college and a resume link starting with https://",
  "not-found": "This interview link isn’t valid. Check the link you were given.",
  "not-yet": "Your interview hasn’t opened yet.",
  over: "The time for this interview is over.",
  done: "You’ve already finished this interview.",
  busy: "The AI is busy right now. Wait a minute and try again.",
  "not-allowed": "Only the StudentOS team can do this.",
  "not-configured": "The server isn’t set up yet (Firebase service account missing).",
};
export const careersErrorText = (e: unknown) => CAREERS_ERROR[e instanceof Error ? e.message : ""] ?? "Something went wrong. Try again.";
