/* StudentOS as a placement partner: the app side of /api/partner.
   The StudentOS team posts partner drives for companies and offers them to colleges;
   each college approves; recruiters see applicants and run rounds from /company. */

import { auth } from "./firebase";
import type { AppLink, Drive, Offer } from "./placement";
import type { ResumeSnapshot } from "./free";

export class PartnerError extends Error {
  detail = "";
}

export async function partnerApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  await auth.authStateReady?.().catch(() => {});
  const user = auth.currentUser;
  if (!user) throw new PartnerError("signed-out");
  const res = await fetch("/api/partner", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ action, ...body }),
  });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!res.ok) {
    const e = new PartnerError(j.error || `status ${res.status}`);
    e.detail = j.detail ?? "";
    throw e;
  }
  return j;
}

export const PARTNER_ERROR: Record<string, string> = {
  "signed-out": "Log in first.",
  "not-configured": "The server isn’t set up yet (Firebase service account missing).",
  "not-allowed": "You don’t have access to this.",
  "no-company": "Join your company first.",
  "bad-code": "That company code isn’t right. Check it with StudentOS.",
  failed: "Something went wrong. Try again.",
  done: "You have already submitted this test.",
  closed: "This test isn’t open yet. The company will open it at the test time.",
  "not-started": "Start the test first.",
  "bad-test": "Add at least one question (with 2+ options and the right answer marked) or a coding problem.",
};

/* ---------- online tests a company runs on StudentOS ---------- */
export type TestQuestion = { q: string; options: string[]; answer: number };
export type CompanyTest = { round: number; title: string; minutes: number; open: boolean; questions: TestQuestion[]; /** StudentOS coding problem ids */ coding?: string[] };
export type TestSummary = { round: number; title: string; minutes: number; open: boolean; count: number; coding?: number };
export type TestResult = { correct: number; total: number; coding?: { title: string; passed: number; total: number; lang: string }[]; warnings: string[]; ended: boolean; late: boolean; at: number } | { started: true; at: number };
export type StudentTestInfo = { test: { title: string; minutes: number; count: number; coding?: number; company: string; role: string } | null; open?: boolean; attempt?: { done: boolean; endsAt: number } | null };
export const partnerErrorText = (e: unknown) => {
  const t = PARTNER_ERROR[e instanceof Error ? e.message : ""] ?? "Something went wrong. Try again.";
  return e instanceof PartnerError && e.detail ? `${t} ${e.detail}` : t;
};

export type Whoami = { team: boolean; email?: string; verified?: boolean; teamSet?: boolean; company: { id: string; name: string; website: string; logo?: string } | null };
export type PartnerCompany = { id: string; name: string; website: string; code: string };
export type PartnerCollege = { id: string; name: string; type: string; city: string; status: "pending" | "approved" | "rejected"; createdAt: number; ownerName?: string; ownerEmail?: string };
export type PartnerDrive = Drive & { pid: string; companyId: string; colleges: string[]; statuses: Record<string, "pending" | "approved" | "declined">; minInterview: number };
/** what a college sees in colleges/{cid}/partner/{pid} */
export type OfferedDrive = Drive & { pid: string; companyId: string; status: "pending" | "approved" | "declined"; minInterview: number; sentAt: number };

export type CompanyDrive = { pid: string; role: string; kind: string; ctc: string; deadline: string; rounds: string[]; colleges: number };
export type Applicant = {
  cid: string;
  college: string;
  uid: string;
  name: string;
  email: string;
  branch: string;
  cgpa: number;
  backlogs: number;
  batch: string;
  resume: { headline: string; skills: string; links: string; projects: string[] } | null;
  cv: ResumeSnapshot | null;
  scores: { interview?: number; coding?: number; interviewVerified?: boolean; codingVerified?: boolean } | null;
  status: "applied" | "in-process" | "selected" | "rejected";
  round: number;
  links: AppLink[];
  offer: Offer | null;
  decision: string;
  appliedAt: number;
  test?: TestResult | null;
};
