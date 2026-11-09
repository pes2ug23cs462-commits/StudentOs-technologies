/* Checks a Firebase ID token on the server without the Admin SDK, using the
   Identity Toolkit REST API with the project's public web API key. */


const cache = new Map<string, { uid: string; until: number }>();

export async function verifyIdToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.uid;
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { users?: { localId?: string }[] };
    const uid = j.users?.[0]?.localId ?? null;
    if (uid) {
      if (cache.size > 2000) cache.clear();
      cache.set(token, { uid, until: Date.now() + 5 * 60_000 });
    }
    return uid;
  } catch {
    return null;
  }
}

/* Simple per-student limits so one account can't use up the shared free AI quota.
   Kept in memory: it resets when the server restarts, which is fine for now. */
const usage = new Map<string, { minute: number[]; day: string; count: number }>();
export const FREE_DAILY_MESSAGES = 60;

export function takeQuota(uid: string): { ok: true; left: number } | { ok: false; reason: "minute" | "day" } {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const u = usage.get(uid) ?? { minute: [], day: today, count: 0 };
  if (u.day !== today) Object.assign(u, { day: today, count: 0 });
  u.minute = u.minute.filter((t) => now - t < 60_000);
  if (u.minute.length >= 8) return { ok: false, reason: "minute" };
  if (u.count >= FREE_DAILY_MESSAGES) return { ok: false, reason: "day" };
  u.minute.push(now);
  u.count++;
  usage.set(uid, u);
  return { ok: true, left: FREE_DAILY_MESSAGES - u.count };
}
