/* Server-only: signs a mock interview score when the server gives it, so a score a
   student later sends with a placement application can be checked by the server
   (company portal). A score edited in the browser fails the check. Signed per
   student, per kind (interview / coding), per score and time. */

import { createHmac, timingSafeEqual } from "node:crypto";
import { adminSecret } from "./firestore-admin";

export type ScoreKind = "interview" | "coding";
export type ScoreProof = { score: number; at: number; sig: string };

const body = (uid: string, kind: ScoreKind, score: number, at: number) => `score|${uid}|${kind}|${Math.round(score)}|${Math.round(at)}`;

export function signScore(uid: string, kind: ScoreKind, score: number): { at: number; sig: string } | null {
  const key = adminSecret();
  if (!key) return null;
  const at = Date.now();
  return { at, sig: createHmac("sha256", key).update(body(uid, kind, score, at)).digest("base64url") };
}

export function checkScore(uid: string, kind: ScoreKind, p: Partial<ScoreProof> | null | undefined): boolean {
  const key = adminSecret();
  if (!key || !p || typeof p.sig !== "string" || !Number.isFinite(p.score) || !Number.isFinite(p.at)) return false;
  const want = createHmac("sha256", key).update(body(uid, kind, Number(p.score), Number(p.at))).digest("base64url");
  const a = Buffer.from(want), b = Buffer.from(p.sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
