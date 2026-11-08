/* Server-only: is this student on Premium?
   Payments aren't live yet, so Premium is given by hand, in any of these ways:
     • PREMIUM_UIDS=uid1,uid2 in .env.local (Firebase Authentication → Users → User UID)
     • a Firestore document premium/{uid} with  active: true  (needs the service account)
     • PREMIUM_FOR_ALL=true in .env.local, to test Premium features locally
   Students can't give themselves Premium: only the server decides. */

import { adminConfigured, adminGet } from "./firestore-admin";

const cache = new Map<string, { value: boolean; at: number }>();

export async function isPremium(uid: string): Promise<boolean> {
  if (process.env.PREMIUM_FOR_ALL === "true") return true;
  const list = (process.env.PREMIUM_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes(uid)) return true;
  if (!adminConfigured()) return false;
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  try {
    const doc = await adminGet(`premium/${uid}`);
    const until = Number(doc?.until ?? 0);
    const value = doc?.active === true && (!until || until > Date.now());
    cache.set(uid, { value, at: Date.now() });
    return value;
  } catch {
    return false;
  }
}
