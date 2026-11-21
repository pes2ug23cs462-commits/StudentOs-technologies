/* What a student sees depends on where they are in their education. School students
   get no placement tools (placement score, resume, mock interviews, company rounds):
   they don't need them yet. When they move on, they update their education in
   Settings → Profile and those tools open, with nothing of theirs lost. */

import type { StudentType } from "./setup";

/** Pages a school student has no use for; the app sends them to the dashboard instead. */
export const SCHOOL_HIDDEN = ["/placement", "/resume", "/interview", "/code/company", "/verify-face"];

export const isSchool = (type: StudentType | "" | undefined) => type === "school";

export const hiddenFor = (type: StudentType | "" | undefined, pathname: string) =>
  isSchool(type) && SCHOOL_HIDDEN.some((p) => pathname === p || pathname.startsWith(p + "/"));

/** A Class 12 student near the end of school: time to ask whether they've moved on. */
export function finishingSchool(a: { type: StudentType | ""; year: string; graduation: string } | undefined, now = new Date()) {
  if (!a || a.type !== "school") return false;
  const y = now.getFullYear();
  const m = now.getMonth(); // 0 = Jan
  const grad = Number(a.graduation) || 0;
  if (grad && (grad < y || (grad === y && m >= 4))) return true; // their own finishing year has come
  return a.year === "Class 12" && m >= 4 && m <= 9; // May to October
}
