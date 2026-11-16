/* "Asked before at your college": seniors share what a company asked in each
   round, the placement cell checks it, and juniors preparing for the same
   company see only the checked ones. This is the college's own record of
   past questions; nothing is copied from paid paper sites. */

import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TopicId } from "@/lib/aptitude";
import { uid as makeId } from "@/lib/utils";

export type ExpResult = "selected" | "not-selected" | "waiting";
export type ExpStatus = "pending" | "verified" | "rejected";
export interface Experience {
  id: string;
  /** company key (lower case, letters and digits), so "HP" and "hp " match */
  company: string;
  companyName: string;
  role: string;
  /** the drive it came from, when shared from one */
  driveId?: string;
  round: string;
  /** what happened in the round, in the student's words */
  text: string;
  /** questions they remember, one per line */
  questions: string[];
  tags: string[];
  result: ExpResult;
  uid: string;
  /** shown to juniors: "CSE · 2026 batch"; the name only if they chose to show it */
  by: string;
  name?: string;
  at: number;
  status: ExpStatus;
  checkedBy?: string;
  checkedAt?: number;
}

export const companyKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** What a round can be about. Aptitude tags map to practice topics. */
export const TAGS: { tag: string; topic?: TopicId }[] = [
  { tag: "Percentages", topic: "percent" },
  { tag: "Profit & loss", topic: "profit" },
  { tag: "Ratio", topic: "ratio" },
  { tag: "Averages", topic: "average" },
  { tag: "Time & work", topic: "work" },
  { tag: "Speed & distance", topic: "speed" },
  { tag: "Interest", topic: "interest" },
  { tag: "Number system", topic: "numbers" },
  { tag: "Probability", topic: "probability" },
  { tag: "P & C", topic: "pnc" },
  { tag: "Number series", topic: "series" },
  { tag: "Coding–decoding", topic: "coding" },
  { tag: "Directions", topic: "directions" },
  { tag: "Blood relations", topic: "blood" },
  { tag: "Syllogisms", topic: "syllogism" },
  { tag: "Grammar", topic: "errors" },
  { tag: "Vocabulary", topic: "synonyms" },
  { tag: "Arrays" },
  { tag: "Strings" },
  { tag: "Linked lists" },
  { tag: "Trees" },
  { tag: "DP" },
  { tag: "OOP" },
  { tag: "DBMS / SQL" },
  { tag: "Operating systems" },
  { tag: "Networks" },
  { tag: "Project explanation" },
  { tag: "HR questions" },
  { tag: "Pseudocode" },
];
export const TAG_TOPIC: Record<string, TopicId | undefined> = Object.fromEntries(TAGS.map((t) => [t.tag, t.topic]));

const col = (cid: string) => collection(db, "colleges", cid, "experiences");

/** Checked experiences for one company (what juniors see). */
export async function loadVerified(cid: string, company: string): Promise<Experience[]> {
  const s = await getDocs(query(col(cid), where("company", "==", companyKey(company)), where("status", "==", "verified")));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Experience).sort((a: Experience, b: Experience) => b.at - a.at);
}
/** The student's own shares, checked or not. */
export async function loadMine(cid: string, uid: string): Promise<Experience[]> {
  const s = await getDocs(query(col(cid), where("uid", "==", uid)));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Experience).sort((a: Experience, b: Experience) => b.at - a.at);
}
/** Placement cell: everything shared at the college. */
export async function loadAll(cid: string): Promise<Experience[]> {
  const s = await getDocs(col(cid));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Experience).sort((a: Experience, b: Experience) => b.at - a.at);
}
export async function shareExperience(cid: string, e: Omit<Experience, "id" | "at" | "status" | "company"> & { companyName: string }): Promise<Experience> {
  const x: Experience = { ...e, id: makeId("exp"), company: companyKey(e.companyName), at: Date.now(), status: "pending" };
  await setDoc(doc(db, "colleges", cid, "experiences", x.id), x);
  return x;
}
export async function checkExperience(cid: string, id: string, status: "verified" | "rejected", by: string) {
  await updateDoc(doc(db, "colleges", cid, "experiences", id), { status, checkedBy: by, checkedAt: Date.now() });
}
export async function removeExperience(cid: string, id: string) {
  await deleteDoc(doc(db, "colleges", cid, "experiences", id));
}

/** How often each tag came up, most first. */
export function tagCounts(list: Experience[]) {
  const m = new Map<string, number>();
  for (const e of list) for (const t of new Set(e.tags)) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
