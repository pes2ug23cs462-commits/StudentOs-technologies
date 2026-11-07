/* Public certificate list used by the /verify page.
   certificates/{id} can be read by anyone who knows the ID (no listing),
   and only created by the signed-in student it belongs to. */

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
