/* StudentOS as a placement partner: the app side of /api/partner.
   The StudentOS team posts partner drives for companies and offers them to colleges;
   each college approves; recruiters see applicants and run rounds from /company. */

import { auth } from "./firebase";
import type { AppLink, Drive, Offer } from "./placement";

export class PartnerError extends Error {}

export async function partnerApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  await auth.authStateReady?.().catch(() => {});
  const user = auth.currentUser;
  if (!user) throw new PartnerError("signed-out");
  const res = await fetch("/api/partner", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ action, ...body }),
  });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new PartnerError(j.error || `status ${res.status}`);
  return j;
}

export const PARTNER_ERROR: Record<string, string> = {
  "signed-out": "Log in first.",
  "not-configured": "The server isn’t set up yet (Firebase service account missing).",
  "not-allowed": "You don’t have access to this.",
  "no-company": "Join your company first.",
  "bad-code": "That company code isn’t right. Check it with StudentOS.",
  failed: "Something went wrong. Try again.",
};
export const partnerErrorText = (e: unknown) => PARTNER_ERROR[e instanceof Error ? e.message : ""] ?? "Something went wrong. Try again.";

export type Whoami = { team: boolean; company: { id: string; name: string; website: string; logo?: string } | null };
export type PartnerCompany = { id: string; name: string; website: string; code: string };
export type PartnerCollege = { id: string; name: string; type: string; city: string };
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
  scores: { interview?: number; coding?: number } | null;
  status: "applied" | "in-process" | "selected" | "rejected";
  round: number;
  links: AppLink[];
  offer: Offer | null;
  decision: string;
  appliedAt: number;
};
