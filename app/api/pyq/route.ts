/* POST /api/pyq — questions students report from their own placement interviews.

   Signed-in student:
     list {company}                                   → {questions: approved ones for that company, newest first}
     add  {company, year, round, role, question}      → {ok}   (waits for the team's check; 5 a day)
   StudentOS team only (STUDENTOS_TEAM_EMAILS, verified email):
     pending                                          → {questions: not yet checked}
     review {id, approve: boolean}                    → approve, or delete it

   Reports live in pyqReports, read and written only here with the service account;
   the Firestore rules keep it closed to the browser. Nothing a student writes is
   shown to others until the team approves it. */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ROUNDS, validCompanyId, type ReportedQuestion } from "@/lib/coding/companies";
import { verifyIdUser } from "@/lib/server/auth";
import { adminConfigured, adminCreate, adminDelete, adminIncrement, adminList, adminUpdate } from "@/lib/server/firestore-admin";

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const para = (v: unknown, max = 2000) => String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const teamEmails = () => (process.env.STUDENTOS_TEAM_EMAILS ?? "").toLowerCase().split(/[,;\s"']+/).filter(Boolean);

const toQ = (d: { id: string; data: Record<string, unknown> }): ReportedQuestion => ({
  id: d.id,
  company: String(d.data.company ?? ""),
  companyName: String(d.data.companyName ?? ""),
  year: Number(d.data.year ?? 0),
  round: String(d.data.round ?? ""),
  role: String(d.data.role ?? ""),
  question: String(d.data.question ?? ""),
  at: Number(d.data.at ?? 0),
  approved: d.data.approved === true,
});

export async function POST(req: Request) {
  const me = await verifyIdUser(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!me) return bad("signed-out", 401);
  if (!adminConfigured()) return bad("not-configured", 503);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const team = !!(me.verified && me.email && teamEmails().includes(me.email.toLowerCase()));

  try {
    if (b.action === "list") {
      const company = str(b.company, 40);
      const all = (await adminList("pyqReports", 2000)).map(toQ);
      return NextResponse.json({ questions: all.filter((q) => q.approved && q.company === company).sort((a, b) => b.year - a.year || b.at - a.at), team });
    }

    if (b.action === "add") {
      const company = str(b.company, 40);
      if (!validCompanyId(company)) return bad("bad-company");
      const companyName = str(b.companyName, 40);
      const year = Math.round(Number(b.year));
      const now = new Date().getFullYear();
      if (!(year >= now - 20 && year <= now)) return bad("bad-year");
      const round = (ROUNDS as readonly string[]).includes(String(b.round)) ? String(b.round) : "Other";
      const question = para(b.question);
      if (question.length < 20) return bad("too-short");
      const day = new Date().toISOString().slice(0, 10);
      const n = await adminIncrement(`pyqLimits/${me.uid}_${day}`, "n");
      if (n > 5) return bad("too-many", 429);
      await adminCreate("pyqReports", randomBytes(10).toString("hex"), { company, companyName, year, round, role: str(b.role, 80), question, at: Date.now(), approved: false, by: me.uid });
      return NextResponse.json({ ok: true });
    }

    if (!team) return bad("not-allowed", 403);

    if (b.action === "pending") {
      const all = (await adminList("pyqReports", 2000)).map(toQ);
      return NextResponse.json({ questions: all.filter((q) => !q.approved).sort((a, b) => a.at - b.at) });
    }

    if (b.action === "review") {
      const id = str(b.id, 40);
      if (!/^[a-f0-9]{20}$/.test(id)) return bad("bad-id");
      if (b.approve === true) await adminUpdate(`pyqReports/${id}`, { approved: true });
      else await adminDelete(`pyqReports/${id}`);
      return NextResponse.json({ ok: true });
    }
  } catch {
    return bad("failed", 500);
  }
  return bad("bad-action");
}
