/* Placement alerts.
   - Students can get phone / laptop notifications (Firebase Cloud Messaging web push).
     The browser token is saved in pushTokens/{uid}, which only that student can read or
     write; the server reads it to send. Needs NEXT_PUBLIC_FIREBASE_VAPID_KEY
     (Firebase console → Project settings → Cloud Messaging → Web Push certificates).
   - The college's coordinator triggers the alerts with notifyPlacement() after saving. */

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { app, auth, db } from "./firebase";

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW = "/push-sw.js";

export type PushState = "unsupported" | "off" | "on" | "blocked";

export async function pushState(uid: string): Promise<PushState> {
  if (typeof window === "undefined" || !VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  try {
    const { isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return "unsupported";
  } catch {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const snap = await getDoc(doc(db, "pushTokens", uid)).catch(() => null);
  return snap?.exists() ? "on" : "off";
}

/** Asks for permission and saves this device's token. */
export async function enablePush(uid: string): Promise<PushState> {
  if (!VAPID) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "blocked" : "off";
  const reg = await navigator.serviceWorker.register(SW);
  await navigator.serviceWorker.ready;
  const { getMessaging, getToken } = await import("firebase/messaging");
  const token = await getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  if (!token) return "off";
  await setDoc(doc(db, "pushTokens", uid), { token, at: Date.now() });
  return "on";
}

export async function disablePush(uid: string): Promise<PushState> {
  await deleteDoc(doc(db, "pushTokens", uid)).catch(() => {});
  try {
    const { getMessaging, deleteToken } = await import("firebase/messaging");
    await deleteToken(getMessaging(app));
  } catch {
    /* the saved token is gone either way */
  }
  return "off";
}

export type NotifyEvent = "new-drive" | "link" | "advance" | "selected" | "offer" | "rejected";
export type NotifyResult = { emailed: number; pushed: number; people: number; email?: boolean; already?: boolean; error?: string };

/** Tells the affected students (server decides who). Null when alerts aren't set up or it failed. */
export async function notifyPlacement(cid: string, did: string, event: NotifyEvent, uids?: string[]): Promise<NotifyResult | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const res = await fetch("/api/placement-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ cid, did, event, uids }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return { emailed: 0, pushed: 0, people: 0, error: j.error || `status ${res.status}` };
    }
    return (await res.json()) as NotifyResult;
  } catch {
    return { emailed: 0, pushed: 0, people: 0, error: "offline" };
  }
}

/** A toast line saying who was told, or why nobody was. */
export function notifySummary(r: NotifyResult | null) {
  if (!r) return "";
  if (r.error === "not-configured") return "Students weren’t told: alerts aren’t set up yet (service account missing on the server).";
  if (r.error === "not-allowed") return "Only the admin or placement coordinator can send alerts.";
  if (r.error) return "Students weren’t told: alerts failed. Try again later.";
  if (r.already) return "";
  if (!r.people) return "No students to tell yet (nobody eligible has joined).";
  const parts = [`${r.people} in-app`, r.emailed ? `${r.emailed} email${r.emailed === 1 ? "" : "s"}` : "", r.pushed ? `${r.pushed} phone/laptop` : ""].filter(Boolean).join(" · ");
  return `Students told: ${parts}.`;
}
