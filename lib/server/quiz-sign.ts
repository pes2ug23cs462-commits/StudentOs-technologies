/* Server-only: signs a personalised course's quiz pool when the server writes it, so the
   pool a student later sends back to claim a certificate is known to be the server's,
   with the real answers. Signed per student and per course. */

import { createHmac, timingSafeEqual } from "node:crypto";
import { adminSecret } from "./firestore-admin";

type Q = { q: string; options: string[]; answer: number };

const body = (uid: string, courseId: string, title: string, level: string, pool: Q[]) =>
  JSON.stringify([uid, courseId, title, level, pool.map((x) => [x.q, x.options, x.answer])]);

export function signPool(uid: string, courseId: string, title: string, level: string, pool: Q[]): string | null {
  const key = adminSecret();
  if (!key) return null;
  return createHmac("sha256", key).update(body(uid, courseId, title, level, pool)).digest("base64url");
}

export function checkPool(uid: string, courseId: string, title: string, level: string, pool: Q[], sig: string): boolean {
  const want = signPool(uid, courseId, title, level, pool);
  if (!want || !sig) return false;
  const a = Buffer.from(want), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
