/* Colleges on StudentOS: a college account, its faculty, and the students who
   chose to share their progress with it.

   Firestore
     colleges/{cid}                 { id, name, type, city, code, owner, createdAt }
     colleges/{cid}/private/keys    { staffCode }  (faculty join with this; staff only)
     colleges/{cid}/staff/{uid}     { uid, name, email, role, at }
     colleges/{cid}/members/{uid}   MemberSummary (written only by that student)
     collegeCodes/{code}            { cid }  (students join with this code)

   Students only share a summary: test scores per chapter, activity and career
   readiness. Never chats, notes, phone or email. They can stop any time, which
   deletes their summary. */

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CHAPTERS, CHAPTERS_10, CHAPTERS_11, levelOf, parseKey, type ExamPrepState } from "@/lib/exam-prep";
import type { PlacementProfile } from "@/lib/placement";
import type { AppState } from "@/lib/store";

export type CollegeType = "school" | "degree";
export type StaffRole = "admin" | "placement" | "teacher" | "viewer";
export const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", placement: "Placement coordinator", teacher: "Teacher", viewer: "Viewer" };
/** Who can post drives and update shortlists and offers. */
export const canRunPlacements = (r: StaffRole) => r === "admin" || r === "placement";

export interface College {
  id: string;
  name: string;
  type: CollegeType;
  city: string;
  code: string;
  owner: string;
  createdAt: number;
}
export interface Staff {
  uid: string;
  name: string;
  email: string;
  role: StaffRole;
  at: number;
}
/** What a student shares with their college. */
export interface MemberSummary {
  uid: string;
  name: string;
  section: string;
  course: string;
  joinedAt: number;
  updatedAt: number;
  lastActive: number;
  /** exam prep: chapter key → [average of recent tests %, tests taken] */
  chapters: Record<string, [number, number]>;
  exam?: string;
  testsTaken: number;
  videosDone: number;
  /** career */
  interviews: number;
  interviewAvg: number;
  codingSolved: number;
  projects: number;
  resumeDone: boolean;
  modulesDone: number;
  /** test scores outside exam prep (Practice Arena), average % */
  practiceAvg: number;
  practiceTests: number;
  /** placement details the student filled (degree colleges) */
  branch?: string;
  cgpa?: number | null;
  backlogs?: number | null;
  batch?: string;
}
/** Saved in the student's own data when they join a college. */
export interface CollegeLink {
  cid: string;
  name: string;
  section: string;
  joinedAt: number;
  type?: CollegeType;
  placement?: PlacementProfile;
}
/** Saved in a faculty member's own data. */
export interface StaffLink {
  cid: string;
  name: string;
  role: StaffRole;
}

const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const makeCode = (n = 6) => Array.from({ length: n }, () => ABC[Math.floor(Math.random() * ABC.length)]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export async function createCollege(o: { name: string; type: CollegeType; city: string; uid: string; staffName: string; email: string }): Promise<College> {
  const id = `c${Date.now().toString(36)}${makeCode(4).toLowerCase()}`;
  const college: College = { id, name: o.name.trim(), type: o.type, city: o.city.trim(), code: makeCode(), owner: o.uid, createdAt: Date.now() };
  await setDoc(doc(db, "colleges", id), college);
  await setDoc(doc(db, "colleges", id, "staff", o.uid), { uid: o.uid, name: o.staffName, email: o.email, role: "admin", at: Date.now() } satisfies Staff);
  await setDoc(doc(db, "colleges", id, "private", "keys"), { staffCode: makeCode(8) });
  await setDoc(doc(db, "collegeCodes", college.code), { cid: id });
  return college;
}

export async function getCollege(cid: string): Promise<College | null> {
  const s = await getDoc(doc(db, "colleges", cid));
  return s.exists() ? (s.data() as College) : null;
}

/** The college for a student join code. */
export async function findByCode(code: string): Promise<College | null> {
  const c = cleanCode(code);
  if (c.length < 6) return null;
  const s = await getDoc(doc(db, "collegeCodes", c));
  if (!s.exists()) return null;
  return getCollege((s.data() as { cid: string }).cid);
}

/** The faculty join code (only staff can read it). */
export async function getStaffCode(cid: string): Promise<string | null> {
  try {
    const s = await getDoc(doc(db, "colleges", cid, "private", "keys"));
    return s.exists() ? (s.data() as { staffCode: string }).staffCode : null;
  } catch {
    return null;
  }
}

/** Faculty join with the student code (to find the college) plus the faculty code the admin shared.
 *  The database rules check the faculty code; a wrong one is refused. */
export async function joinAsStaff(o: { code: string; staffCode: string; uid: string; name: string; email: string }): Promise<College | null> {
  const college = await findByCode(o.code);
  if (!college) return null;
  try {
    await setDoc(doc(db, "colleges", college.id, "staff", o.uid), { uid: o.uid, name: o.name, email: o.email, role: "teacher", at: Date.now(), staffCode: cleanCode(o.staffCode) });
  } catch {
    return null;
  }
  // in the test database without rules, check the code here too
  const real = await getStaffCode(college.id);
  if (real && real !== cleanCode(o.staffCode)) {
    await deleteDoc(doc(db, "colleges", college.id, "staff", o.uid)).catch(() => {});
    return null;
  }
  return college;
}

export async function setRole(cid: string, s: Staff, role: StaffRole) {
  await setDoc(doc(db, "colleges", cid, "staff", s.uid), { ...s, role });
}
export async function removeStaff(cid: string, uid: string) {
  await deleteDoc(doc(db, "colleges", cid, "staff", uid));
}

export async function loadStaff(cid: string): Promise<Staff[]> {
  const s = await getDocs(collection(db, "colleges", cid, "staff"));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Staff).sort((a: Staff, b: Staff) => a.at - b.at);
}
export async function loadMembers(cid: string): Promise<MemberSummary[]> {
  const s = await getDocs(collection(db, "colleges", cid, "members"));
  return s.docs.map((d: { data: () => unknown }) => d.data() as MemberSummary);
}

/* ---------------- student side ---------------- */

export function buildSummary(state: AppState, link: CollegeLink, uid: string, prev?: MemberSummary): MemberSummary {
  const ep: ExamPrepState = state.examPrep ?? {};
  const chapters: Record<string, [number, number]> = {};
  for (const [k, sc] of Object.entries(ep.scores ?? {})) {
    const v = levelOf(sc);
    if (v != null) chapters[k] = [v, sc.attempts ?? 1];
  }
  const interviews = state.interviews ?? [];
  const tests = state.tests ?? [];
  const a = state.setup?.academic;
  return {
    uid,
    name: state.profile.name || "Student",
    section: link.section,
    course: [a?.course, a?.field, a?.year].filter(Boolean).join(" · "),
    joinedAt: link.joinedAt,
    updatedAt: Date.now(),
    lastActive: Date.now(),
    chapters,
    ...(ep.exam ? { exam: ep.exam } : {}),
    testsTaken: Object.values(ep.scores ?? {}).reduce((n, s) => n + (s.attempts ?? 1), 0),
    videosDone: Object.values(ep.videos ?? {}).reduce((n, v) => n + (v.done?.length ?? 0), 0),
    interviews: interviews.length,
    interviewAvg: interviews.length ? Math.round(interviews.slice(0, 5).reduce((n, i) => n + i.feedback.overall, 0) / Math.min(5, interviews.length)) : 0,
    codingSolved: Object.keys(state.coding?.solved ?? {}).length,
    projects: (state.entries ?? []).filter((e) => e.kind === "project").length,
    resumeDone: !!(state.resume && state.resume.summary?.trim() && state.resume.skills?.trim()),
    modulesDone: Object.values(state.learning?.modules ?? {}).filter((m) => m.done).length,
    practiceAvg: tests.length ? Math.round(tests.slice(0, 10).reduce((n, t) => n + (t.total ? (t.score / t.total) * 100 : 0), 0) / Math.min(10, tests.length)) : 0,
    practiceTests: tests.length,
    ...(prev ? { joinedAt: prev.joinedAt } : {}),
    ...(link.placement ? { branch: link.placement.branch, cgpa: link.placement.cgpa, backlogs: link.placement.backlogs, batch: link.placement.batch } : {}),
  };
}

export async function joinCollege(state: AppState, uid: string, college: College, section: string): Promise<CollegeLink> {
  const link: CollegeLink = { cid: college.id, name: college.name, section: section.trim() || "Not set", joinedAt: Date.now(), type: college.type };
  await setDoc(doc(db, "colleges", college.id, "members", uid), buildSummary(state, link, uid));
  return link;
}
export async function pushSummary(state: AppState, uid: string, link: CollegeLink) {
  await setDoc(doc(db, "colleges", link.cid, "members", uid), buildSummary(state, link, uid));
}
export async function leaveCollege(uid: string, link: CollegeLink) {
  await deleteDoc(doc(db, "colleges", link.cid, "members", uid));
}

/* ---------------- numbers for the dashboard ---------------- */

const DAY = 86400000;
export const isActive = (m: MemberSummary, days = 7) => Date.now() - m.lastActive < days * DAY;

/** Exam readiness of one student, 0–100 (average of chapters they've tested). */
export function examReadiness(m: MemberSummary) {
  const v = Object.values(m.chapters);
  return v.length ? Math.round(v.reduce((n, [x]) => n + x, 0) / v.length) : null;
}

/** Placement readiness of one student, 0–100. */
export function placementReadiness(m: MemberSummary) {
  const iv = m.interviews ? m.interviewAvg : 0;
  const code = Math.min(100, m.codingSolved * 10);
  const proj = Math.min(100, m.projects * 34);
  const resume = m.resumeDone ? 100 : 0;
  const learn = Math.min(100, m.modulesDone * 5);
  return Math.round(iv * 0.35 + code * 0.2 + proj * 0.2 + resume * 0.15 + learn * 0.1);
}
export const PLACEMENT_PARTS = ["Interviews", "Coding", "Projects", "Resume"] as const;
export function placementParts(m: MemberSummary): Record<(typeof PLACEMENT_PARTS)[number], number> {
  return {
    Interviews: m.interviews ? m.interviewAvg : 0,
    Coding: Math.min(100, m.codingSolved * 10),
    Projects: Math.min(100, m.projects * 34),
    Resume: m.resumeDone ? 100 : 0,
  };
}

export function readinessOf(m: MemberSummary, type: CollegeType) {
  return type === "school" ? examReadiness(m) : placementReadiness(m);
}

/** Subject for a chapter key ("11:Physics/Waves" → Physics). */
export const subjectOf = (key: string) => parseKey(key).subject;

/** Every subject that has at least one tested chapter. */
export function subjectsIn(members: MemberSummary[]) {
  const s = new Set<string>();
  members.forEach((m) => Object.keys(m.chapters).forEach((k) => s.add(subjectOf(k))));
  const order = ["Physics", "Chemistry", "Maths", "Biology", "Science", "Social Science", "English", "Hindi", "Accountancy", "Business Studies", "Economics", "History", "Political Science", "Sociology"];
  return [...s].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export interface ChapterStat {
  key: string;
  subject: string;
  chapter: string;
  grade: number;
  tested: number;
  weak: number;
  avg: number;
}
/** How every tested chapter is going across the given students. */
export function chapterStats(members: MemberSummary[]): ChapterStat[] {
  const map = new Map<string, number[]>();
  members.forEach((m) => Object.entries(m.chapters).forEach(([k, [v]]) => map.set(k, [...(map.get(k) ?? []), v])));
  return [...map].map(([key, vals]) => {
    const p = parseKey(key);
    return { key, subject: p.subject, chapter: p.chapter, grade: p.grade, tested: vals.length, weak: vals.filter((v) => v < 50).length, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
  });
}

/** Average of a number list, or null. */
export const avg = (v: number[]) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);

export function sectionsOf(members: MemberSummary[]) {
  return [...new Set(members.map((m) => m.section || "Not set"))].sort();
}

/** Grid for the 3D view: rows = sections, columns = subjects (or placement parts). */
export function readinessGrid(members: MemberSummary[], type: CollegeType) {
  const rows = sectionsOf(members);
  const cols: string[] = type === "school" ? subjectsIn(members).slice(0, 6) : [...PLACEMENT_PARTS];
  const cell = (sec: string, col: string) => {
    const ms = members.filter((m) => (m.section || "Not set") === sec);
    if (type === "school") {
      return avg(ms.flatMap((m) => Object.entries(m.chapters).filter(([k]) => subjectOf(k) === col).map(([, [v]]) => v)));
    }
    return avg(ms.map((m) => placementParts(m)[col as (typeof PLACEMENT_PARTS)[number]]));
  };
  return { rows, cols, values: rows.map((r) => cols.map((c) => cell(r, c))) };
}

/** Students who need help first: lowest readiness, inactive ones flagged. */
export function needHelp(members: MemberSummary[], type: CollegeType) {
  return members
    .map((m) => ({ m, r: readinessOf(m, type) }))
    .filter((x) => x.r != null && x.r < 50)
    .sort((a, b) => (a.r ?? 0) - (b.r ?? 0));
}

export const weakChaptersOf = (m: MemberSummary, n = 3) =>
  Object.entries(m.chapters)
    .filter(([, [v]]) => v < 50)
    .sort((a, b) => a[1][0] - b[1][0])
    .slice(0, n)
    .map(([k]) => parseKey(k).chapter);

export function ago(t: number) {
  const d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
}

/* ---------------- sample data (for demos before students join) ---------------- */

export function sampleMembers(type: CollegeType): MemberSummary[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const sections = type === "school" ? ["II PUC A", "II PUC B", "II PUC C", "I PUC A", "I PUC B"] : ["CSE 2nd year", "CSE 3rd year", "ECE 3rd year", "BCom 2nd year"];
  const first = ["Aarav", "Diya", "Rohan", "Ananya", "Kiran", "Sneha", "Vikram", "Meera", "Arjun", "Pooja", "Rahul", "Nisha", "Aditya", "Kavya", "Suresh", "Divya", "Manoj", "Priya", "Varun", "Asha"];
  const out: MemberSummary[] = [];
  // each section is a bit stronger or weaker in each subject
  const lean: Record<string, number> = {};
  sections.forEach((s, si) => ["Physics", "Chemistry", "Maths", "Biology"].forEach((sub, k) => (lean[`${s}|${sub}`] = Math.sin(si * 2.1 + k * 1.7) * 16)));
  for (let i = 0; i < 64; i++) {
    const sec = sections[i % sections.length];
    const skill = 0.42 + rnd() * 0.55 - (sec.endsWith("C") ? 0.1 : 0);
    const chapters: Record<string, [number, number]> = {};
    if (type === "school") {
      const grade = sec.startsWith("I PUC") ? 11 : 12;
      const book = grade === 11 ? CHAPTERS_11 : CHAPTERS;
      (["Physics", "Chemistry", "Maths", "Biology"] as const).forEach((s) =>
        (book[s] ?? []).forEach((c, ci) => {
          if (rnd() < 0.55) {
            const hard = /Induction|Coordination|Integrals|Alternating|Thermodynamics|Trigonometric|Bonding/.test(c) ? 22 : 0;
            chapters[`${grade === 11 ? "11:" : ""}${s}/${c}`] = [Math.max(8, Math.min(98, Math.round(skill * 100 - hard + lean[`${sec}|${s}`] + (rnd() - 0.5) * 30 - ci * 0.6))), 1 + Math.floor(rnd() * 3)];
          }
        }),
      );
    }
    void CHAPTERS_10;
    const iv = type === "degree" && rnd() < 0.8 ? 1 + Math.floor(rnd() * 5) : 0;
    out.push({
      uid: `sample${i}`,
      name: `${first[i % first.length]} ${String.fromCharCode(65 + ((i * 7) % 26))}.`,
      section: sec,
      course: sec,
      joinedAt: Date.now() - 30 * DAY,
      updatedAt: Date.now(),
      lastActive: Date.now() - Math.floor(rnd() * rnd() * 14) * DAY,
      chapters,
      testsTaken: Object.keys(chapters).length + Math.floor(rnd() * 10),
      videosDone: Math.floor(rnd() * 40),
      interviews: iv,
      interviewAvg: iv ? Math.round(30 + skill * 60) : 0,
      codingSolved: type === "degree" ? Math.floor(skill * rnd() * 14) : 0,
      projects: type === "degree" ? Math.floor(skill * 3.5) : 0,
      resumeDone: type === "degree" ? rnd() < skill : false,
      modulesDone: Math.floor(rnd() * 20),
      practiceAvg: Math.round(skill * 90),
      practiceTests: Math.floor(rnd() * 8),
    });
  }
  return out;
}
