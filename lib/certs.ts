/* Public certificate list used by the /verify page.
   certificates/{id} can be read by anyone who knows the ID (no listing).
   New certificates are written by the server after it re-marks the quiz
   (/api/certificates). publishCert, the old direct write, is only a fallback for
   when the server's service account isn't set; the Firestore rules close it. */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface CertRecord {
  id: string;
  uid: string;
  name: string;
  course: string;
  level: string;
  duration: string;
  /** ISO date */
  issuedAt: string;
  modules?: number;
  score?: string;
}

export async function publishCert(rec: Omit<CertRecord, "uid">) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not signed in");
  // JSON round-trip drops undefined fields, which Firestore rejects
  await setDoc(doc(db, "certificates", rec.id), JSON.parse(JSON.stringify({ ...rec, uid })));
}

export async function fetchCert(id: string): Promise<CertRecord | null> {
  const clean = id.trim().toUpperCase().replace(/^STOS\/CER\//, "");
  if (!/^[0-9]{4}-[A-Z0-9]{6}$/.test(clean)) return null;
  const snap = await getDoc(doc(db, "certificates", clean));
  return snap.exists() ? (snap.data() as CertRecord) : null;
}

/** Asks the server to re-mark the passing quiz and issue the certificate.
    "fallback" means the server can't issue certificates yet (no service account). */
export async function issueCert(o: {
  id: string;
  courseId: string;
  title: string;
  level: string;
  name: string;
  duration: string;
  modules: number;
  answers: { q: string; a: string }[];
  pool?: { q: string; options: string[]; answer: number }[];
  sig?: string;
}): Promise<"ok" | "fallback"> {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  const res = await fetch("/api/certificates", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ ...o, pool: o.pool?.map(({ q, options, answer }) => ({ q, options, answer })) }),
  });
  if (res.ok) return "ok";
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 503 && j.error === "not-configured") return "fallback";
  throw new Error(j.error || `status ${res.status}`);
}
