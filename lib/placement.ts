/* Campus placements run by a college on StudentOS.

   colleges/{cid}/drives/{did}            Drive (college staff write; members read)
   colleges/{cid}/drives/{did}/apps/{uid} Application (student creates; staff update;
                                          the student reads only their own, and may
                                          only answer the offer)

   Assessment links and offers live on each student's application, so only that
   student (and the college) can see them. */

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppState } from "@/lib/store";

export type DriveKind = "Full-time" | "Internship" | "Internship + PPO";
export interface Eligibility {
  /** empty = every branch */
  branches: string[];
  minCgpa: number;
  maxBacklogs: number;
  /** graduation year, "" = any */
  batch: string;
}
export interface Drive {
  id: string;
  company: string;
  role: string;
  kind: DriveKind;
  ctc: string;
  location: string;
  about: string;
  rounds: string[];
  elig: Eligibility;
  /** YYYY-MM-DD, last day to apply */
  deadline: string;
  open: boolean;
  createdAt: number;
  createdBy: string;
  /** a StudentOS partner drive: the company runs the rounds; the college approved it */
  partner?: { pid: string; companyId: string; minInterview?: number };
}
export type AppStatus = "applied" | "in-process" | "selected" | "rejected";
export interface AppLink {
  title: string;
  url: string;
  /** when it happens, free text like "14 Nov, 10:00 AM" */
  when: string;
  at: number;
  /** the round it was sent for; once the student moves on it no longer shows to them */
  round?: number;
}
export interface Offer {
  ctc: string;
  joining: string;
  /** link to the offer letter (company email / drive link) */
  url: string;
  note: string;
  at: number;
}
export interface Application {
  uid: string;
  name: string;
  email: string;
  section: string;
  branch: string;
  cgpa: number;
  backlogs: number;
  batch: string;
  resume: { headline: string; skills: string; links: string; projects: string[] };
  appliedAt: number;
  /** index of the round the student has reached (0 = first round) */
  round: number;
  status: AppStatus;
  links: AppLink[];
  offer?: Offer;
  decision?: "accepted" | "declined";
  decidedAt?: number;
  updatedAt: number;
  /** best mock-interview and coding-round scores on StudentOS when they applied (shown to companies) */
  scores?: { interview?: number; coding?: number };
}
/** The student's own placement details, kept in their data. */
export interface PlacementProfile {
  branch: string;
  cgpa: number;
  backlogs: number;
  batch: string;
}

export const BRANCHES = ["CSE", "ISE", "AI & ML", "ECE", "EEE", "Mechanical", "Civil", "BCA", "BCom", "BBA", "BSc", "MBA", "MCA", "Other"];

export const driveRef = (cid: string, did: string) => doc(db, "colleges", cid, "drives", did);
export const appRef = (cid: string, did: string, uid: string) => doc(db, "colleges", cid, "drives", did, "apps", uid);

export async function loadDrives(cid: string): Promise<Drive[]> {
  const s = await getDocs(collection(db, "colleges", cid, "drives"));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Drive).sort((a: Drive, b: Drive) => b.createdAt - a.createdAt);
}
export async function saveDrive(cid: string, d: Drive) {
  await setDoc(driveRef(cid, d.id), d);
}
/** Deletes a drive and its applications (applications first, so none are left behind). */
export async function deleteDrive(cid: string, did: string) {
  const s = await getDocs(collection(db, "colleges", cid, "drives", did, "apps"));
  await Promise.all(s.docs.map((d: { data: () => unknown }) => deleteDoc(appRef(cid, did, (d.data() as Application).uid)).catch(() => {})));
  await deleteDoc(driveRef(cid, did));
}
export async function loadApps(cid: string, did: string): Promise<Application[]> {
  const s = await getDocs(collection(db, "colleges", cid, "drives", did, "apps"));
  return s.docs.map((d: { data: () => unknown }) => d.data() as Application).sort((a: Application, b: Application) => a.appliedAt - b.appliedAt);
}
export async function myApp(cid: string, did: string, uid: string): Promise<Application | null> {
  try {
    const s = await getDoc(appRef(cid, did, uid));
    return s.exists() ? (s.data() as Application) : null;
  } catch {
    return null;
  }
}
export async function saveApp(cid: string, did: string, a: Application) {
  await setDoc(appRef(cid, did, a.uid), a);
}

/** Why a student can't apply, or null if they can. */
export function ineligible(d: Drive, p: PlacementProfile | undefined): string | null {
  if (!p) return "Add your branch, CGPA and backlogs first.";
  if (d.elig.branches.length && !d.elig.branches.includes(p.branch)) return `Only for ${d.elig.branches.join(", ")}`;
  if (d.elig.minCgpa && p.cgpa < d.elig.minCgpa) return `Needs CGPA ${d.elig.minCgpa}+`;
  if (p.backlogs > d.elig.maxBacklogs) return d.elig.maxBacklogs ? `At most ${d.elig.maxBacklogs} backlogs` : "No backlogs allowed";
  if (d.elig.batch && p.batch && d.elig.batch !== p.batch) return `Only for the ${d.elig.batch} batch`;
  return null;
}
export const closed = (d: Drive) => !d.open || (d.deadline ? new Date(d.deadline + "T23:59:59") < new Date() : false);

export function newApplication(state: AppState, uid: string, p: PlacementProfile, section: string): Application {
  const r = state.resume;
  return {
    uid,
    name: state.profile.name || "Student",
    email: state.profile.email || "",
    section,
    branch: p.branch,
    cgpa: p.cgpa,
    backlogs: p.backlogs,
    batch: p.batch,
    resume: {
      headline: r?.headline ?? "",
      skills: r?.skills ?? "",
      links: r?.links ?? "",
      projects: (state.entries ?? []).filter((e) => e.kind === "project").map((e) => e.title).slice(0, 6),
    },
    appliedAt: Date.now(),
    ...interviewScores(state),
    round: 0,
    status: "applied",
    links: [],
    updatedAt: Date.now(),
  };
}

function interviewScores(state: AppState): { scores?: Application["scores"] } {
  const ivs = state.interviews ?? [];
  const best = (xs: number[]) => (xs.length ? Math.max(...xs) : undefined);
  const interview = best(ivs.filter((h) => h.kind !== "coding").map((h) => h.feedback.overall));
  const coding = best(ivs.filter((h) => h.kind === "coding").map((h) => h.feedback.overall));
  if (interview == null && coding == null) return {};
  return { scores: { ...(interview != null ? { interview } : {}), ...(coding != null ? { coding } : {}) } };
}

/** Older applications that got a link while still "applied" count as in the first round. */
export const effective = (a: Application): Application => (a.status === "applied" && a.links.length ? { ...a, status: "in-process", round: 0 } : a);

/** Links the student should see now: only those for the round they are in. */
export function currentLinks(a0: Application): AppLink[] {
  const a = effective(a0);
  if (a.status !== "in-process") return [];
  return a.links.filter((l) => (l.round ?? 0) === a.round);
}

/** Where a student is: "Applied", "Online test", "Selected"… */
export function stageLabel(a0: Application, d: Drive) {
  const a = effective(a0);
  if (a.status === "selected") return a.offer ? (a.decision === "accepted" ? "Offer accepted" : a.decision === "declined" ? "Offer declined" : "Offer received") : "Selected";
  if (a.status === "rejected") return `Not selected${a.round > 0 || a.status === "rejected" ? ` · ${d.rounds[a.round] ?? ""}` : ""}`.replace(/ · $/, "");
  if (a.status === "applied") return "Applied";
  return d.rounds[a.round] ?? "In process";
}

export function placementStats(drives: Drive[], apps: Record<string, Application[]>) {
  const all = Object.values(apps).flat();
  const offers = all.filter((a) => a.status === "selected" && a.offer);
  const placed = new Set(offers.filter((a) => a.decision !== "declined").map((a) => a.uid));
  return { drives: drives.length, open: drives.filter((d) => !closed(d)).length, applications: all.length, offers: offers.length, placed: placed.size };
}

/* ---------- sample data for the college preview ---------- */

export function sampleDrives(): { drives: Drive[]; apps: Record<string, Application[]> } {
  const day = 86400000;
  const iso = (n: number) => new Date(Date.now() + n * day).toISOString().slice(0, 10);
  const mk = (id: string, company: string, role: string, kind: DriveKind, ctc: string, rounds: string[], elig: Partial<Eligibility>, deadline: string, open = true): Drive => ({
    id,
    company,
    role,
    kind,
    ctc,
    location: "Bengaluru",
    about: "Sample drive for the preview. Not a real company or job.",
    rounds,
    elig: { branches: [], minCgpa: 0, maxBacklogs: 0, batch: "2027", ...elig },
    deadline,
    open,
    createdAt: Date.now() - Number(id.slice(1)) * day,
    createdBy: "sample",
  });
  const drives = [
    mk("s1", "Sample Tech Pvt Ltd", "Software Engineer Trainee", "Full-time", "₹4.5 LPA", ["Online test", "Technical interview", "HR interview"], { branches: ["CSE", "ISE", "AI & ML"], minCgpa: 6.5 }, iso(4)),
    mk("s2", "Demo Analytics", "Data Analyst Intern", "Internship + PPO", "₹20,000 / month", ["Aptitude test", "Case interview"], { minCgpa: 7 }, iso(9)),
    mk("s3", "Example Systems", "Associate Engineer", "Full-time", "₹3.6 LPA", ["Online test", "Interview"], { maxBacklogs: 1 }, iso(-3), false),
  ];
  const names = ["Aarav K.", "Diya S.", "Rohan M.", "Ananya R.", "Kiran P.", "Sneha D.", "Vikram N.", "Meera J.", "Arjun B.", "Pooja H.", "Rahul T.", "Nisha G.", "Aditya V.", "Kavya L.", "Suresh C.", "Divya A."];
  const app = (i: number, d: Drive, round: number, status: AppStatus, offer = false): Application => ({
    uid: `sa${d.id}${i}`,
    name: names[i % names.length],
    email: "",
    section: ["CSE 3rd year", "ISE 3rd year", "AI & ML 3rd year"][i % 3],
    branch: ["CSE", "ISE", "AI & ML"][i % 3],
    cgpa: Math.round((6.6 + ((i * 37) % 30) / 10) * 10) / 10,
    backlogs: 0,
    batch: "2027",
    resume: { headline: "Final-year student", skills: "Java, Python, SQL", links: "", projects: ["College attendance app"] },
    appliedAt: Date.now() - (10 - i) * 3600000,
    round,
    status,
    links: round > 0 ? [{ title: d.rounds[round], url: "https://example.com", when: "Sample time", at: Date.now() }] : [],
    ...(offer ? { offer: { ctc: d.ctc, joining: "July 2027", url: "https://example.com", note: "", at: Date.now() } } : {}),
    updatedAt: Date.now(),
  });
  const apps: Record<string, Application[]> = {
    s1: Array.from({ length: 16 }, (_, i) => (i < 3 ? app(i, drives[0], 2, "selected", i < 2) : i < 7 ? app(i, drives[0], 1, "in-process") : i < 11 ? app(i, drives[0], 0, "rejected") : app(i, drives[0], 0, "applied"))),
    s2: Array.from({ length: 9 }, (_, i) => (i < 4 ? app(i, drives[1], 0, "in-process") : app(i, drives[1], 0, "applied"))),
    s3: Array.from({ length: 11 }, (_, i) => (i < 2 ? app(i, drives[2], 1, "selected", true) : app(i, drives[2], 0, "rejected"))),
  };
  return { drives, apps };
}
