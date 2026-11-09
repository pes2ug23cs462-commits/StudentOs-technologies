/* Student reviews of StudentOS.
   One review per student (document id = their uid), so they can edit it.
   New and edited reviews start hidden (approved: false). The server then checks
   them automatically (/api/reviews/check) and approves fine ones. If that isn’t
   set up or is unsure, approve by hand: Firebase console → Firestore → reviews →
   the review → set approved to true. Only approved reviews are shown publicly. */

import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export interface Review {
  uid: string;
  name: string;
  /** e.g. “B.Com, 3rd Year · Christ University” */
  role: string;
  rating: number;
  text: string;
  createdAt: number;
  approved: boolean;
}

export const REVIEW_MIN = 20;
export const REVIEW_MAX = 500;

export async function myReview(uid: string): Promise<Review | null> {
  const snap = await getDoc(doc(db, "reviews", uid));
  return snap.exists() ? (snap.data() as Review) : null;
}

export async function saveReview(uid: string, r: { name: string; role: string; rating: number; text: string }) {
  const review: Review = {
    uid,
    name: r.name.trim().slice(0, 60),
    role: r.role.trim().slice(0, 90),
    rating: Math.min(5, Math.max(1, Math.round(r.rating))),
    text: r.text.trim().slice(0, REVIEW_MAX),
    createdAt: Date.now(),
    approved: false,
  };
  await setDoc(doc(db, "reviews", uid), review);
  return review;
}

export async function deleteReview(uid: string) {
  await deleteDoc(doc(db, "reviews", uid));
}

/** Approved reviews, newest first. */
export async function approvedReviews(max = 40): Promise<Review[]> {
  const snap = await getDocs(query(collection(db, "reviews"), where("approved", "==", true), limit(max)));
  return snap.docs.map((d) => d.data() as Review).sort((a, b) => b.createdAt - a.createdAt);
}

/** Asks the server to check the saved review and approve it automatically when it is fine.
 *  reason "manual" (or a failure) means it waits for a manual check instead. */
export async function checkReview(): Promise<{ approved: boolean; reason?: string }> {
  try {
    const { postAi } = await import("./assistant");
    return await postAi<{ approved: boolean; reason?: string }>("/api/reviews/check", {});
  } catch {
    return { approved: false, reason: "manual" };
  }
}
