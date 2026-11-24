/* POST /api/partner  { action, ... } — StudentOS as a placement partner.
   Three kinds of people use it, each checked here on the server:
   - the StudentOS team (emails in STUDENTOS_TEAM_EMAILS, verified): companies, partner drives,
     which colleges get them
   - a college's admin or placement coordinator: approve or decline a drive offered to them
   - a company's recruiter (joined with the company's invite code): their drives, applicants
     from the colleges that approved, rounds, links, offers
   Everything is written with the service account; students' applications stay in each
   college's own drive (colleges/{cid}/drives/{pid}/apps), so the college sees them too.
   Data: partnerDrives/{pid}, companies/{coid}, companyCodes/{code}, companyStaff/{uid},
   colleges/{cid}/partner/{pid} (read by the college's staff). */

import { NextResponse } from "next/server";
import { slotState } from "@/lib/live-slot";
import { verifyIdUser } from "@/lib/server/auth";
import { adminConfigured, adminProblem, adminCreate, adminDelete, adminGet, adminList, adminMerge, adminSet } from "@/lib/server/firestore-admin";
import { checkScore } from "@/lib/server/score-sign";
import { notifyStudents, type NotifyEv } from "@/lib/server/notify-core";
import { mailHtml, sendMails } from "@/lib/server/mail";
import { BREACHES, problem, same, shuffled, type CodeResult, type TestQ } from "@/lib/server/test-check";
import { cleanIv, ivAttemptKey, ivDoc, ivKindOf, ivQuestions, ivReport, type IvAttempt, type IvSetup, type LiveMeta, type LiveSide, ivTakeAnswer, ivTakeAsk, ivViewOf } from "@/lib/server/company-rounds";

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v: unknown, min = 0, max = 100) => Math.max(min, Math.min(max, Number(v) || 0));
const id = (v: unknown) => (/^[\w-]{1,80}$/.test(String(v ?? "")) ? String(v) : "");
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
/** Scores as the company sees them: a score counts as verified only if the server signed it for this student. */
function verifiedScores(uid: string, raw: unknown) {
  const sc = (raw ?? {}) as { interview?: unknown; coding?: unknown; proof?: { interview?: { score?: number; at?: number; sig?: string }; coding?: { score?: number; at?: number; sig?: string } } };
  const one = (kind: "interview" | "coding") => {
    const v = Number(sc[kind]);
    if (!Number.isFinite(v)) return {};
    const p = sc.proof?.[kind];
    const ok = !!p && Number(p.score) === v && checkScore(uid, kind, p);
    return { [kind]: Math.round(v), [`${kind}Verified`]: ok };
  };
  const out = { ...one("interview"), ...one("coding") };
  return Object.keys(out).length ? out : null;
}
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

type Drive = {
  id: string; company: string; role: string; kind: string; ctc: string; location: string; about: string;
  rounds: string[]; elig: { branches: string[]; minCgpa: number; maxBacklogs: number; batch: string };
  deadline: string; open: boolean; createdAt: number; createdBy: string;
};
type PDrive = Drive & { pid: string; companyId: string; colleges: string[]; statuses: Record<string, string>; minInterview: number;
  /** written by the company's recruiter; the team picks the colleges */ requested?: { by: string; at: number } };

/** Take a partner drive back from one college. Returns true when the college keeps a closed copy because students already applied. */
async function withdraw(cid: string, pid: string, status?: string): Promise<boolean> {
  await adminDelete(`colleges/${cid}/partner/${pid}`);
  if (status !== "approved") return false;
  const apps = await adminList(`colleges/${cid}/drives/${pid}/apps`, 1).catch(() => []);
  if (!apps.length) {
    await adminDelete(`colleges/${cid}/drives/${pid}`);
    return false;
  }
  await adminMerge(`colleges/${cid}/drives/${pid}`, { open: false });
  return true;
}

function cleanDrive(d: Record<string, unknown>, pid: string, by: string): Drive {
  const e = (d.elig ?? {}) as Record<string, unknown>;
  return {
    id: pid,
    company: str(d.company, 60),
    role: str(d.role, 80),
    kind: ["Full-time", "Internship", "Internship + PPO"].includes(str(d.kind)) ? str(d.kind) : "Full-time",
    ctc: str(d.ctc, 40),
    location: str(d.location, 60),
    about: str(d.about, 800),
    rounds: (Array.isArray(d.rounds) ? d.rounds : []).map((r) => str(r, 40)).filter(Boolean).slice(0, 6),
    elig: {
      branches: (Array.isArray(e.branches) ? e.branches : []).map((b) => str(b, 30)).filter(Boolean).slice(0, 20),
      minCgpa: num(e.minCgpa, 0, 10),
      maxBacklogs: num(e.maxBacklogs, 0, 20),
      batch: str(e.batch, 4),
    },
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(str(d.deadline)) ? str(d.deadline) : "",
    open: d.open !== false,
    createdAt: Number(d.createdAt) || Date.now(),
    createdBy: by,
  };
}

/* ---------- the application rules a company may apply (same as the college's own) ---------- */
type App = { uid: string; status: string; round: number; links: { title: string; url: string; when: string; at: number; round?: number }[]; offer?: Record<string, unknown>; updatedAt: number } & Record<string, unknown>;
function apply(op: string, a: App, rounds: number, p: Record<string, unknown>): App | null {
  const now = Date.now();
  if (op === "advance") {
    if (a.status === "applied") return { ...a, status: "in-process", round: 0, updatedAt: now };
    if (a.status === "in-process" && a.round < rounds - 1) return { ...a, round: a.round + 1, updatedAt: now };
    if (a.status === "in-process") return { ...a, status: "selected", updatedAt: now };
    // marked "not selected" by mistake: back into the same round
    if (a.status === "rejected") return { ...a, status: "in-process", updatedAt: now };
    return null;
  }
  if (op === "select") return { ...a, status: "selected", updatedAt: now };
  if (op === "reject") return { ...a, status: "rejected", updatedAt: now };
  if (op === "link") {
    const l = (p.link ?? {}) as Record<string, unknown>;
    const url = str(l.url, 500);
    if (!str(l.title) || !/^https?:\/\//.test(url)) return null;
    const b: App = a.status === "applied" ? { ...a, status: "in-process", round: 0 } : a;
    return { ...b, links: [...(b.links ?? []), { title: str(l.title, 60), url, when: str(l.when, 60), at: now, round: b.round }], updatedAt: now };
  }
  if (op === "offer") {
    const o = (p.offer ?? {}) as Record<string, unknown>;
    const url = str(o.url, 500);
    if (!str(o.ctc) || (url && !/^https?:\/\//.test(url))) return null;
    return { ...a, status: "selected", offer: { ctc: str(o.ctc, 40), joining: str(o.joining, 40), url, note: str(o.note, 300), at: now }, updatedAt: now };
  }
  return null;
}
/* ---------- online tests a company runs on StudentOS ----------
   partnerDrives/{pid}/tests/main          the test, with the answers (server only)
   partnerDrives/{pid}/attempts/{cid}_{uid} one student's attempt and score (server only)
   The student's application gets only { tests: { [round]: { done, at } } }, never the score. */
/** `coding`: ids of StudentOS coding problems (lib/coding/problems.ts); their hidden expected outputs stay here */
type Test = { round: number; title: string; minutes: number; open: boolean; questions: TestQ[]; coding?: string[]; updatedAt: number };
type Attempt = { uid: string; cid: string; round: number; order: number[]; startedAt: number; endsAt: number; done: boolean; submittedAt?: number; answers?: number[]; correct?: number; total?: number; coding?: CodeResult[]; warnings?: string[]; ended?: boolean; late?: boolean };
/** What the company and the college see of an attempt. */
const resultOf = (x: Attempt) =>
  x.done
    ? { correct: Number(x.correct) || 0, total: Number(x.total) || 0, coding: (x.coding ?? []).map((c) => ({ title: c.title, passed: c.passed, total: c.total, lang: c.lang })), warnings: x.warnings ?? [], ended: !!x.ended, late: !!x.late, at: Number(x.submittedAt) || 0 }
    : { started: true as const, at: Number(x.startedAt) || 0 };
const summaryOf = (t: Test) => ({ round: t.round, title: t.title, minutes: t.minutes, open: t.open, count: t.questions.length, coding: (t.coding ?? []).length });
function cleanTest(t: Record<string, unknown>, rounds: number): Test | null {
  const qs = (Array.isArray(t.questions) ? t.questions : []).slice(0, 100).map((x) => {
    const q = (x ?? {}) as Record<string, unknown>;
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 6);
    const answer = Math.floor(Number(q.answer));
    return { q: String(q.q ?? "").trim().slice(0, 600), options, answer };
  }).filter((q) => q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length);
  const coding = [...new Set((Array.isArray(t.coding) ? t.coding : []).map((x) => str(x, 60)).filter((x) => problem(x)))].slice(0, 3);
  if (!qs.length && !coding.length) return null;
  return { round: Math.max(0, Math.min(rounds - 1, Math.floor(Number(t.round) || 0))), title: str(t.title, 80) || "Online test", minutes: num(t.minutes, 5, 180) || 30, open: t.open === true, questions: qs, coding, updatedAt: Date.now() };
}
const GRACE_MS = 90_000;
const para = (v: unknown, max = 3000) => String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const ivResultOf = (x: IvAttempt) =>
  x.done ? { overall: x.report?.overall ?? null, verdict: x.report?.verdict ?? "", warnings: x.warnings ?? [], ended: !!x.ended, at: x.doneAt ?? 0 } : { started: true as const, at: x.startedAt, index: x.answers.length, total: x.questions.length };
const liveResultOf = (m: LiveMeta) => ({ room: m.room, at: m.at, minutes: m.minutes, feedback: m.feedback ?? null });
const roomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

const EVENT_OF: Record<string, NotifyEv> = { advance: "advance", select: "selected", reject: "rejected", link: "link", offer: "offer" };

export async function POST(req: Request) {
  const me = await verifyIdUser(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!me) return bad("signed-out", 401);
  if (!adminConfigured()) return NextResponse.json({ error: "not-configured", detail: adminProblem() }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = str(b.action, 40);
  const team = (process.env.STUDENTOS_TEAM_EMAILS ?? "").toLowerCase().split(/[,;\s"']+/).filter(Boolean);
  const isTeam = me.verified && !!me.email && team.includes(me.email);
  const origin = new URL(req.url).origin;

  try {
    /* ---------------- who am I ---------------- */
    if (action === "whoami") {
      const staff = await adminGet(`companyStaff/${me.uid}`);
      const company = staff ? await adminGet(`companies/${str(staff.coid, 80)}`) : null;
      return NextResponse.json({ team: isTeam, email: me.email, verified: me.verified, teamSet: team.length > 0, company: company ? { id: str(company.id), name: str(company.name), website: str(company.website), logo: str(company.logo, 120000) } : null });
    }

    /* ---------------- StudentOS team ---------------- */
    if (action.startsWith("team-")) {
      if (!isTeam) return bad("not-allowed", 403);
      if (action === "team-overview") {
        const [colleges, companies, drives] = await Promise.all([adminList("colleges", 1000), adminList("companies", 500), adminList("partnerDrives", 500)]);
        return NextResponse.json({
          colleges: await Promise.all(
            colleges.map(async (c) => {
              const status = ["pending", "rejected"].includes(str(c.data.status)) ? str(c.data.status) : "approved";
              // who asked: read only for colleges still waiting, to keep reads low
              const owner = status === "pending" && str(c.data.owner) ? await adminGet(`colleges/${c.id}/staff/${str(c.data.owner)}`).catch(() => null) : null;
              return { id: c.id, name: str(c.data.name), type: str(c.data.type), city: str(c.data.city), status, createdAt: Number(c.data.createdAt) || 0, ...(owner ? { ownerName: str(owner.name), ownerEmail: str(owner.email) } : {}) };
            }),
          ),
          companies: companies.map((c) => ({ id: c.id, name: str(c.data.name), website: str(c.data.website), code: str(c.data.code) })),
          drives: drives.map((d) => d.data).sort((x, y) => Number(y.createdAt) - Number(x.createdAt)),
        });
      }
      if (action === "team-careers") {
        const teams = ["Engineering", "Design", "Marketing", "Content", "Operations"];
        const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => str(x, max)).filter(Boolean).slice(0, n);
        const roles = (Array.isArray(b.roles) ? b.roles : []).slice(0, 40).map((x) => x as Record<string, unknown>).map((x) => ({
          id: id(x.id) || `r${Date.now().toString(36)}`,
          title: str(x.title, 80),
          team: teams.includes(str(x.team)) ? str(x.team) : "Engineering",
          where: str(x.where, 40) || "Remote",
          pay: str(x.pay, 40) || "Unpaid",
          length: str(x.length, 40) || "3 months",
          tags: list(x.tags, 6, 24),
          does: list(x.does, 8, 160),
          wants: list(x.wants, 8, 160),
          paused: x.paused === true,
          postedAt: Number(x.postedAt) || Date.now(),
          ai: x.ai !== false,
          within: Math.min(14, Math.max(1, Number(x.within) || 3)),
          windowStart: Number(x.windowStart) > 0 ? Number(x.windowStart) : 0,
          windowEnd: Number(x.windowEnd) > Number(x.windowStart) ? Number(x.windowEnd) : 0,
          questions: Math.min(10, Math.max(3, Number(x.questions) || 6)),
          ivFocus: str(x.ivFocus, 300),
          test: x.test === true,
          hr: x.hr === true,
          hrFocus: str(x.hrFocus, 300),
          hrQuestions: Math.min(10, Math.max(3, Number(x.hrQuestions) || 5)),
        })).filter((x) => x.title);
        await adminSet("site/careers", { open: b.open !== false, roles, updatedAt: Date.now() });
        return NextResponse.json({ ok: true, roles: roles.length });
      }
      if (action === "team-company") {
        const name = str(b.name, 80);
        if (name.length < 2) return bad("name");
        const coid = `co${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        let code = newCode();
        for (let i = 0; i < 3 && !(await adminCreate("companyCodes", code, { coid })); i++) code = newCode();
        await adminSet(`companies/${coid}`, { id: coid, name, website: str(b.website, 80), code, createdAt: Date.now(), createdBy: me.uid });
        return NextResponse.json({ company: { id: coid, name, website: str(b.website, 80), code } });
      }
      if (action === "team-drive") {
        const pid = id((b.drive as Record<string, unknown>)?.id) || `pd${Date.now().toString(36)}`;
        const companyId = id(b.companyId);
        const company = companyId ? await adminGet(`companies/${companyId}`) : null;
        if (!company) return bad("company");
        const drive = cleanDrive({ ...(b.drive as Record<string, unknown>), company: str(company.name, 60) }, pid, me.uid);
        if (!drive.role || drive.rounds.length === 0) return bad("drive");
        const old = (await adminGet(`partnerDrives/${pid}`)) as PDrive | null;
        const colleges = (Array.isArray(b.colleges) ? b.colleges : []).map(id).filter(Boolean).slice(0, 200);
        const statuses: Record<string, string> = {};
        for (const c of colleges) statuses[c] = old?.statuses?.[c] ?? "pending";
        const p: PDrive = { ...drive, pid, companyId, colleges, statuses, minInterview: num(b.minInterview, 0, 100), ...(old?.requested ? { requested: old.requested } : {}) };
        // colleges taken off an edited drive lose the offer (an approved one with applications is closed, not deleted)
        await Promise.all((old?.colleges ?? []).filter((c) => !colleges.includes(c)).map((cid) => withdraw(cid, pid, old?.statuses?.[cid])));
        await adminSet(`partnerDrives/${pid}`, p);
        // offer it to each college that hasn't decided yet; keep approved copies up to date
        await Promise.all(
          colleges.map(async (cid) => {
            await adminSet(`colleges/${cid}/partner/${pid}`, { ...drive, pid, companyId, status: statuses[cid], minInterview: p.minInterview, sentAt: Date.now() });
            if (statuses[cid] === "approved") await adminSet(`colleges/${cid}/drives/${pid}`, { ...drive, partner: { pid, companyId, minInterview: p.minInterview } });
          }),
        );
        return NextResponse.json({ drive: p });
      }
      if (action === "team-college-decide") {
        const cid = id(b.cid), decision = str(b.decision, 10);
        if (!cid || !["approved", "rejected"].includes(decision)) return bad("bad-request");
        const c = await adminGet(`colleges/${cid}`);
        if (!c) return bad("no-college", 404);
        await adminMerge(`colleges/${cid}`, { status: decision, decidedAt: Date.now(), decidedBy: me.email });
        const owner = str(c.owner) ? await adminGet(`colleges/${cid}/staff/${str(c.owner)}`).catch(() => null) : null;
        const to = owner ? str(owner.email) : "";
        let emailed = false;
        if (to) {
          const ok = decision === "approved";
          const lines = ok
            ? [`Hi ${str(owner?.name) || "there"}, ${str(c.name)} is now live on StudentOS.`, "Share your college code with students so they can join, and invite your faculty from the Faculty page."]
            : [`Hi ${str(owner?.name) || "there"}, we couldn’t approve ${str(c.name)} on StudentOS right now.`, "Reply to this email and our team will help."];
          emailed = (await sendMails([{ to, subject: ok ? `${str(c.name)} is live on StudentOS` : `About ${str(c.name)} on StudentOS`, text: lines.join("\n\n"), replyTo: "support@student-os.in", html: mailHtml({ brand: "StudentOS · Colleges", heading: ok ? "Your college is live" : "About your college request", lines, button: ok ? "Open the college dashboard" : "Visit StudentOS", url: ok ? `${origin}/college` : origin, foot: "You get this because you created a college on StudentOS." }) }])) > 0;
        }
        return NextResponse.json({ ok: true, emailed });
      }
      if (action === "team-drive-delete") {
        const pid = id(b.pid);
        const p = pid ? ((await adminGet(`partnerDrives/${pid}`)) as PDrive | null) : null;
        if (!p) return bad("no-drive", 404);
        const kept = (await Promise.all((p.colleges ?? []).map((cid) => withdraw(cid, pid, p.statuses?.[cid])))).filter(Boolean).length;
        await adminDelete(`partnerDrives/${pid}`);
        return NextResponse.json({ ok: true, kept });
      }
      return bad("action");
    }

    /* ---------------- a college decides ---------------- */
    if (action === "college-decide") {
      const cid = id(b.cid), pid = id(b.pid), decision = str(b.decision, 10);
      if (!cid || !pid || !["approved", "declined"].includes(decision)) return bad("bad-request");
      const staff = await adminGet(`colleges/${cid}/staff/${me.uid}`);
      if (!staff || !["admin", "placement"].includes(str(staff.role))) return bad("not-allowed", 403);
      const p = (await adminGet(`partnerDrives/${pid}`)) as PDrive | null;
      if (!p || !p.colleges?.includes(cid)) return bad("no-drive", 404);
      await adminMerge(`partnerDrives/${pid}`, { statuses: { ...(p.statuses ?? {}), [cid]: decision } });
      await adminMerge(`colleges/${cid}/partner/${pid}`, { status: decision, decidedAt: Date.now(), decidedBy: me.uid });
      if (decision === "approved") {
        const { pid: _p, companyId, colleges: _c, statuses: _s, minInterview, ...drive } = p;
        void _p; void _c; void _s;
        await adminSet(`colleges/${cid}/drives/${pid}`, { ...drive, id: pid, partner: { pid, companyId, minInterview } });
        const told = b.notify === false ? null : await notifyStudents(cid, pid, "new-drive", [], origin).catch(() => null);
        return NextResponse.json({ ok: true, told });
      }
      return NextResponse.json({ ok: true });
    }

    /* ---------------- a college's placement cell sees its students' test results ---------------- */
    if (action === "college-test-results") {
      const cid = id(b.cid), pid = id(b.pid);
      if (!cid || !pid) return bad("bad-request");
      const staff = await adminGet(`colleges/${cid}/staff/${me.uid}`);
      if (!staff || !["admin", "placement"].includes(str(staff.role))) return bad("not-allowed", 403);
      const p = (await adminGet(`partnerDrives/${pid}`)) as PDrive | null;
      if (!p || p.statuses?.[cid] !== "approved") return NextResponse.json({ test: null, results: {} });
      const [t, attempts] = await Promise.all([adminGet(`partnerDrives/${pid}/tests/main`) as Promise<Test | null>, adminList(`partnerDrives/${pid}/attempts`, 2000).catch(() => [])]);
      const mineOnly = attempts.map(({ data }) => data as Attempt).filter((x) => x.cid === cid);
      const [ivAtts, lives] = await Promise.all([adminList(`partnerDrives/${pid}/ivAttempts`, 2000).catch(() => []), adminList(`partnerDrives/${pid}/live`, 2000).catch(() => [])]);
      return NextResponse.json({
        test: t ? summaryOf(t) : null,
        results: Object.fromEntries(mineOnly.map((x) => [x.uid, resultOf(x)])),
        iv: Object.fromEntries(ivAtts.map(({ data }) => data as IvAttempt).filter((x) => x.cid === cid && x.kind !== "hr").map((x) => [x.uid, ivResultOf(x)])),
        ivHr: Object.fromEntries(ivAtts.map(({ data }) => data as IvAttempt).filter((x) => x.cid === cid && x.kind === "hr").map((x) => [x.uid, ivResultOf(x)])),
        live: Object.fromEntries(lives.map(({ data }) => data as LiveMeta).filter((x) => x.cid === cid).map((x) => [x.uid, liveResultOf(x)])),
      });
    }

    /* ---------------- a student takes a company's AI technical interview ---------------- */
    if (action.startsWith("student-iv-")) {
      const cid = id(b.cid), pid = id(b.pid), kind = ivKindOf(b.kind);
      if (!cid || !pid) return bad("bad-request");
      const [p, a, raw] = await Promise.all([
        adminGet(`partnerDrives/${pid}`) as Promise<PDrive | null>,
        adminGet(`colleges/${cid}/drives/${pid}/apps/${me.uid}`) as Promise<App | null>,
        adminGet(ivDoc(pid, kind)) as Promise<IvSetup | null>,
      ]);
      const iv = raw ? { ...raw, kind } : null;
      if (!p || p.statuses?.[cid] !== "approved" || !a || !iv) return NextResponse.json({ iv: null });
      const inRound = a.status === "in-process" && Number(a.round) === iv.round;
      const key = ivAttemptKey(pid, cid, me.uid, kind);
      const at = (await adminGet(key)) as IvAttempt | null;
      const info = { kind, title: iv.title, count: iv.count, company: p.company, role: p.role };
      const view = (x: IvAttempt) => ivViewOf(x, x.done);
      if (action === "student-iv-info") {
        if (!inRound && !at) return NextResponse.json({ iv: null });
        return NextResponse.json({ iv: info, open: iv.open, attempt: at ? { done: at.done, index: at.answers.length, total: at.questions.length } : null });
      }
      if (!inRound) return bad("not-allowed", 403);
      if (action === "student-iv-start") {
        if (at?.done) return bad("done", 409);
        if (at) return NextResponse.json({ iv: info, ...view(at) });
        if (!iv.open) return bad("closed", 409);
        const questions = await ivQuestions(iv, p.role, p.company);
        const x: IvAttempt = { uid: me.uid, cid, name: str(a.name, 60), kind, round: iv.round, questions, answers: [], startedAt: Date.now(), done: false };
        await adminSet(key, x as unknown as Record<string, unknown>);
        return NextResponse.json({ iv: info, ...view(x) });
      }
      if (!at) return bad("not-started", 409);
      if (at.done) return bad("done", 409);
      if (action === "student-iv-answer") {
        if (await ivTakeAnswer(at, b, { role: p.role, hr: kind === "hr" })) await adminSet(key, at as unknown as Record<string, unknown>);
        return NextResponse.json(view(at));
      }
      if (action === "student-iv-ask") {
        const reply = await ivTakeAsk(at, b, { role: p.role, hr: kind === "hr" });
        if (reply) await adminSet(key, at as unknown as Record<string, unknown>);
        return NextResponse.json({ reply });
      }
      if (action === "student-iv-finish") {
        const ended = b.ended === true;
        if (!ended && (at.answers.length < at.questions.length || ivViewOf(at, false).followup)) return bad("not-started", 409);
        at.done = true;
        at.doneAt = Date.now();
        at.ended = ended;
        at.warnings = (Array.isArray(b.warnings) ? b.warnings : []).map((w) => str(w, 12)).filter((w) => BREACHES.includes(w)).slice(0, 10);
        await adminSet(key, at as unknown as Record<string, unknown>);
        try {
          at.report = await ivReport(at, p.role, iv.focus);
          await adminSet(key, at as unknown as Record<string, unknown>);
        } catch {
          /* the company can ask for the report again */
        }
        const ivs = { ...((a.ivs ?? {}) as Record<string, unknown>), [`${iv.round}${kind === "hr" ? "_hr" : ""}`]: { done: true, at: at.doneAt } };
        await adminMerge(`colleges/${cid}/drives/${pid}/apps/${me.uid}`, { ivs });
        return NextResponse.json({ done: true });
      }
      return bad("action");
    }

    /* ---------------- a live interview: signalling for the 1:1 call ---------------- */
    if (action === "live-signal") {
      const pid = id(b.pid), room = /^[a-f0-9]{24}$/.test(str(b.room)) ? str(b.room) : "";
      if (!pid || !room) return bad("bad-request");
      const [p, meta] = await Promise.all([adminGet(`partnerDrives/${pid}`) as Promise<PDrive | null>, adminGet(`partnerDrives/${pid}/live/${room}`) as Promise<LiveMeta | null>]);
      if (!p || !meta) return bad("no-drive", 404);
      // the recruiter of this drive's company is the host; the student it was booked for is the guest
      const staff = await adminGet(`companyStaff/${me.uid}`);
      const side = staff && str(staff.coid, 80) === p.companyId ? "host" : me.uid === meta.uid ? "guest" : "";
      if (!side) return bad("not-allowed", 403);
      const metaOut = { at: meta.at, minutes: meta.minutes, name: meta.name, company: p.company, role: p.role, feedback: side === "host" ? meta.feedback ?? null : null };
      // the call only runs in the booked slot: not before it starts, not after it ends
      const closed = slotState(meta.at, meta.minutes);
      if (closed) return NextResponse.json({ side, meta: metaOut, other: null, closed, now: Date.now() });
      const mine = `partnerDrives/${pid}/live/${room}/sig/${side}`;
      if (b.put && typeof b.put === "object") {
        const put = b.put as Record<string, unknown>;
        const sdp = (put.sdp ?? null) as Record<string, unknown> | null;
        const doc: LiveSide = {
          sdp: sdp && typeof sdp.sdp === "string" && sdp.sdp.length < 20000 ? { type: str(sdp.type, 10), sdp: String(sdp.sdp), v: Number(sdp.v) || 0 } : null,
          cands: (Array.isArray(put.cands) ? put.cands : []).slice(0, 60).filter((c) => JSON.stringify(c).length < 800),
          need: Number(put.need) || 0,
          warnings: side === "guest" ? (Array.isArray(put.warnings) ? put.warnings : []).map((w) => str(w, 12)).filter((w) => BREACHES.includes(w)).slice(0, 30) : [],
          at: Date.now(),
        };
        await adminSet(mine, doc as unknown as Record<string, unknown>);
      }
      const other = (await adminGet(`partnerDrives/${pid}/live/${room}/sig/${side === "host" ? "guest" : "host"}`)) as LiveSide | null;
      return NextResponse.json({ side, meta: metaOut, other, now: Date.now() });
    }

    /* ---------------- a student takes a company's online test ---------------- */
    if (action.startsWith("student-test-")) {
      const cid = id(b.cid), pid = id(b.pid);
      if (!cid || !pid) return bad("bad-request");
      const [p, a, t] = await Promise.all([
        adminGet(`partnerDrives/${pid}`) as Promise<PDrive | null>,
        adminGet(`colleges/${cid}/drives/${pid}/apps/${me.uid}`) as Promise<App | null>,
        adminGet(`partnerDrives/${pid}/tests/main`) as Promise<Test | null>,
      ]);
      // only a shortlisted student of an approved college, in the test's round, while it is open
      if (!p || p.statuses?.[cid] !== "approved" || !a || !t) return NextResponse.json({ test: null });
      const inRound = a.status === "in-process" && Number(a.round) === t.round;
      const aKey = `partnerDrives/${pid}/attempts/${cid}_${me.uid}`;
      const at = (await adminGet(aKey)) as Attempt | null;
      const info = { title: t.title, minutes: t.minutes, count: t.questions.length, coding: (t.coding ?? []).length, company: p.company, role: p.role };
      if (action === "student-test-info") {
        if (!inRound && !at) return NextResponse.json({ test: null });
        return NextResponse.json({ test: info, open: t.open, attempt: at ? { done: at.done, endsAt: at.endsAt } : null });
      }
      if (!inRound) return bad("not-allowed", 403);
      if (action === "student-test-start") {
        if (at?.done) return bad("done", 409);
        if (!t.open && !at) return bad("closed", 409);
        let att = at;
        if (!att) {
          const now = Date.now();
          att = { uid: me.uid, cid, round: t.round, order: shuffled(t.questions.length), startedAt: now, endsAt: now + t.minutes * 60_000, done: false };
          await adminSet(aKey, att);
        }
        // the same order again after a refresh; the clock keeps running from the first start
        const questions = att.order.map((i) => t.questions[i]).filter(Boolean).map((q) => ({ q: q.q, options: q.options }));
        // coding: the visible examples with answers; every test's input, but not its expected output
        const coding = (t.coding ?? []).map(problem).filter(Boolean).map((c) => ({
          id: c!.id, title: c!.title, level: c!.level, statement: c!.statement, constraints: c!.constraints, params: c!.params, fn: c!.fn, starter: c!.starter,
          examples: c!.tests.slice(0, c!.shown),
          inputs: c!.tests.map((x) => x.args),
        }));
        return NextResponse.json({ test: info, questions, coding, endsAt: att.endsAt, now: Date.now() });
      }
      if (action === "student-test-submit") {
        if (!at) return bad("not-started", 409);
        if (at.done) return bad("done", 409);
        const given = (Array.isArray(b.answers) ? b.answers : []).slice(0, at.order.length).map((x) => (Number.isInteger(x) ? Number(x) : -1));
        let correct = 0;
        at.order.forEach((qi, k) => {
          if (t.questions[qi] && given[k] === t.questions[qi].answer) correct++;
        });
        // coding: the outputs the student's code gave in their browser, checked against the hidden expected outputs
        const sentCode = (Array.isArray(b.code) ? b.code : []).map((x) => (x ?? {}) as Record<string, unknown>);
        const coding: CodeResult[] = (t.coding ?? []).map((pid) => {
          const pr = problem(pid)!;
          const c = sentCode.find((x) => x.id === pid);
          const outs = Array.isArray(c?.outputs) ? (c!.outputs as unknown[]) : [];
          const passed = pr.tests.filter((x, i) => i < outs.length && same(outs[i], x.expected)).length;
          return { id: pid, title: pr.title, passed, total: pr.tests.length, lang: c?.lang === "python" ? "python" : "javascript", code: String(c?.code ?? "").slice(0, 8000) };
        });
        const now = Date.now();
        const warnings = (Array.isArray(b.warnings) ? b.warnings : []).map((w) => str(w, 12)).filter((w) => BREACHES.includes(w)).slice(0, 10);
        const done: Attempt = { ...at, done: true, submittedAt: now, answers: given, correct, total: at.order.length, coding, warnings, ended: b.ended === true, late: now > at.endsAt + GRACE_MS };
        await adminSet(aKey, done);
        const tests = { ...((a.tests ?? {}) as Record<string, unknown>), [String(t.round)]: { done: true, at: now } };
        await adminMerge(`colleges/${cid}/drives/${pid}/apps/${me.uid}`, { tests });
        return NextResponse.json({ ok: true });
      }
      return bad("action");
    }

    /* ---------------- companies ---------------- */
    if (action === "company-join") {
      const code = str(b.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const c = code ? await adminGet(`companyCodes/${code}`) : null;
      const company = c ? await adminGet(`companies/${str(c.coid, 80)}`) : null;
      if (!company) return bad("bad-code", 404);
      await adminSet(`companyStaff/${me.uid}`, { coid: str(company.id), email: me.email, name: str(b.name, 60), at: Date.now() });
      return NextResponse.json({ company: { id: str(company.id), name: str(company.name), website: str(company.website) } });
    }
    if (action.startsWith("company-")) {
      const staff = await adminGet(`companyStaff/${me.uid}`);
      const coid = str(staff?.coid, 80);
      if (!coid) return bad("no-company", 403);
      const mine = async (pid: string) => {
        const p = pid ? ((await adminGet(`partnerDrives/${pid}`)) as PDrive | null) : null;
        return p && p.companyId === coid ? p : null;
      };

      if (action === "company-drives") {
        const all = (await adminList("partnerDrives", 500)).map((d) => d.data as PDrive).filter((d) => d.companyId === coid);
        return NextResponse.json({
          drives: all
            .sort((x, y) => y.createdAt - x.createdAt)
            .map((d) => {
              const sent = (d.colleges ?? []).length > 0;
              const { colleges: _c, statuses: _s, companyId: _co, minInterview: _m, ...drive } = d;
              void _c; void _s; void _co; void _m;
              return { pid: d.pid, role: d.role, kind: d.kind, ctc: d.ctc, deadline: d.deadline, rounds: d.rounds, colleges: Object.values(d.statuses ?? {}).filter((s) => s === "approved").length, sent, ...(sent ? {} : { drive: { ...drive, id: d.pid } }) };
            }),
        });
      }

      /* The company writes its own drive; the StudentOS team then picks the colleges (team-drive).
         It can change or delete it until the team has sent it to colleges. */
      if (action === "company-drive-save") {
        const raw = (b.drive ?? {}) as Record<string, unknown>;
        const pid = id(raw.id) || `pd${Date.now().toString(36)}`;
        const old = (await adminGet(`partnerDrives/${pid}`)) as PDrive | null;
        if (old && old.companyId !== coid) return bad("not-allowed", 403);
        if (old && (old.colleges ?? []).length) return bad("sent", 409);
        const company = await adminGet(`companies/${coid}`);
        const drive = cleanDrive({ ...raw, company: str(company?.name, 60), createdAt: old?.createdAt }, pid, me.uid);
        if (!drive.role || drive.rounds.length === 0) return bad("drive");
        const p: PDrive = { ...drive, pid, companyId: coid, colleges: [], statuses: {}, minInterview: 0, requested: { by: me.email || me.uid, at: Date.now() } };
        await adminSet(`partnerDrives/${pid}`, p);
        // tell the team a drive is waiting for colleges (best effort)
        if (!old && team.length) {
          const lines = [`${str(company?.name)} wrote a new drive: ${drive.role}${drive.ctc ? ` · ${drive.ctc}` : ""}${drive.deadline ? ` · apply by ${drive.deadline}` : ""}.`, "Pick the colleges to send it to in the team console."];
          await sendMails(team.map((to) => ({ to, subject: `New drive from ${str(company?.name)}: ${drive.role}`, text: lines.join("\n\n"), html: mailHtml({ brand: "StudentOS · Team", heading: "A company wrote a drive", lines, button: "Pick colleges", url: `${origin}/partner`, foot: "You get this because you are on the StudentOS team." }) }))).catch(() => 0);
        }
        return NextResponse.json({ ok: true, pid });
      }
      if (action === "company-drive-delete") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        if ((p.colleges ?? []).length) return bad("sent", 409);
        await adminDelete(`partnerDrives/${p.pid}`);
        return NextResponse.json({ ok: true });
      }
      if (action === "company-applicants") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const approved = Object.entries(p.statuses ?? {}).filter(([, s]) => s === "approved").map(([cid]) => cid);
        const [test, attempts] = await Promise.all([
          adminGet(`partnerDrives/${p.pid}/tests/main`) as Promise<Test | null>,
          adminList(`partnerDrives/${p.pid}/attempts`, 2000).catch(() => []),
        ]);
        const result = Object.fromEntries(attempts.map(({ data }) => [`${(data as Attempt).cid}/${(data as Attempt).uid}`, resultOf(data as Attempt)]));
        const [ivSetup, ivHrSetup, ivAtts, lives] = await Promise.all([
          adminGet(ivDoc(p.pid, "technical")) as Promise<IvSetup | null>,
          adminGet(ivDoc(p.pid, "hr")) as Promise<IvSetup | null>,
          adminList(`partnerDrives/${p.pid}/ivAttempts`, 2000).catch(() => []),
          adminList(`partnerDrives/${p.pid}/live`, 2000).catch(() => []),
        ]);
        const ivBy = Object.fromEntries(ivAtts.filter(({ data }) => (data as IvAttempt).kind !== "hr").map(({ data }) => [`${(data as IvAttempt).cid}/${(data as IvAttempt).uid}`, ivResultOf(data as IvAttempt)]));
        const ivHrBy = Object.fromEntries(ivAtts.filter(({ data }) => (data as IvAttempt).kind === "hr").map(({ data }) => [`${(data as IvAttempt).cid}/${(data as IvAttempt).uid}`, ivResultOf(data as IvAttempt)]));
        const liveBy: Record<string, ReturnType<typeof liveResultOf>[]> = {};
        for (const { data } of lives) (liveBy[`${(data as LiveMeta).cid}/${(data as LiveMeta).uid}`] ??= []).push(liveResultOf(data as LiveMeta));
        const per = await Promise.all(
          approved.map(async (cid) => {
            const [college, apps] = await Promise.all([adminGet(`colleges/${cid}`), adminList(`colleges/${cid}/drives/${p.pid}/apps`, 1000).catch(() => [])]);
            return apps.map(({ data: a }) => ({
              cid,
              college: str(college?.name, 80),
              uid: str(a.uid, 128),
              name: str(a.name, 60),
              email: str(a.email, 120),
              branch: str(a.branch, 30),
              cgpa: Number(a.cgpa) || 0,
              backlogs: Number(a.backlogs) || 0,
              batch: str(a.batch, 4),
              resume: a.resume ?? null,
              cv: a.cv ?? null,
              scores: verifiedScores(str(a.uid, 128), a.scores),
              status: str(a.status, 20),
              round: Number(a.round) || 0,
              links: a.links ?? [],
              offer: a.offer ?? null,
              decision: str(a.decision, 10),
              appliedAt: Number(a.appliedAt) || 0,
              test: result[`${cid}/${str(a.uid, 128)}`] ?? null,
              iv: ivBy[`${cid}/${str(a.uid, 128)}`] ?? null,
              ivHr: ivHrBy[`${cid}/${str(a.uid, 128)}`] ?? null,
              live: (liveBy[`${cid}/${str(a.uid, 128)}`] ?? []).sort((x, y) => y.at - x.at)[0] ?? null,
            }));
          }),
        );
        return NextResponse.json({
          drive: { pid: p.pid, role: p.role, kind: p.kind, ctc: p.ctc, deadline: p.deadline, rounds: p.rounds, company: p.company },
          applicants: per.flat(),
          test: test ? summaryOf(test) : null,
          iv: ivSetup ? { round: ivSetup.round, title: ivSetup.title, count: ivSetup.count, open: ivSetup.open, focus: ivSetup.focus } : null,
          ivHr: ivHrSetup ? { round: ivHrSetup.round, title: ivHrSetup.title, count: ivHrSetup.count, open: ivHrSetup.open, focus: ivHrSetup.focus } : null,
        });
      }
      if (action === "company-test-get") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        return NextResponse.json({ test: await adminGet(`partnerDrives/${p.pid}/tests/main`) });
      }
      if (action === "company-test-save") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const t = cleanTest((b.test ?? {}) as Record<string, unknown>, Math.max(1, p.rounds.length));
        if (!t) return bad("bad-test");
        // once a student has started, the questions and round stay as they were (their order is saved)
        const prev = (await adminGet(`partnerDrives/${p.pid}/tests/main`)) as Test | null;
        const started = prev ? (await adminList(`partnerDrives/${p.pid}/attempts`, 1).catch(() => [])).length > 0 : false;
        if (prev && started) {
          t.questions = prev.questions;
          t.round = prev.round;
        }
        await adminSet(`partnerDrives/${p.pid}/tests/main`, t);
        return NextResponse.json({ ok: true, count: t.questions.length });
      }
      if (action === "company-iv-get") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        return NextResponse.json({ iv: await adminGet(ivDoc(p.pid, ivKindOf(b.kind))) });
      }
      if (action === "company-iv-save") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const kind = ivKindOf(b.kind);
        const iv = cleanIv((b.iv ?? {}) as Record<string, unknown>, Math.max(1, p.rounds.length), kind);
        await adminSet(ivDoc(p.pid, kind), iv as unknown as Record<string, unknown>);
        return NextResponse.json({ ok: true });
      }
      if (action === "company-iv-report") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const kind = ivKindOf(b.kind);
        const key = ivAttemptKey(p.pid, id(b.cid), id(b.uid), kind);
        const x = (await adminGet(key)) as IvAttempt | null;
        if (!x) return bad("no-drive", 404);
        // the report failed the first time: make it now
        if (x.done && !x.report && b.retry === true) {
          const iv = (await adminGet(ivDoc(p.pid, kind))) as IvSetup | null;
          x.kind = kind;
          x.report = await ivReport(x, p.role, iv?.focus ?? "");
          await adminSet(key, x as unknown as Record<string, unknown>);
        }
        return NextResponse.json({ attempt: x });
      }
      if (action === "company-live-schedule") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((x) => x as Record<string, unknown>);
        const byCollege: Record<string, string[]> = {};
        let n = 0;
        for (const it of items) {
          const cid = id(it.cid), uid = id(it.uid), at = Number(it.at) || 0, minutes = num(it.minutes, 10, 120) || 30;
          if (!cid || !uid || p.statuses?.[cid] !== "approved" || at < Date.now() - 3600_000) continue;
          const path = `colleges/${cid}/drives/${p.pid}/apps/${uid}`;
          const a = (await adminGet(path)) as App | null;
          if (!a) continue;
          const room = roomId();
          const meta: LiveMeta = { room, cid, uid, name: str(a.name, 60), at, minutes, round: Number(a.round) || 0, feedback: null };
          await adminSet(`partnerDrives/${p.pid}/live/${room}`, meta as unknown as Record<string, unknown>);
          const when = new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
          // shows in the student's links, like any interview link, and tells them
          const next = apply("link", a, p.rounds.length, { link: { title: `Live interview on StudentOS (${minutes} min)`, url: `${origin}/placement/live?d=${p.pid}&r=${room}`, when } });
          if (!next) continue;
          await adminSet(path, next);
          (byCollege[cid] ??= []).push(uid);
          n++;
        }
        let people = 0;
        for (const [cid, uids] of Object.entries(byCollege)) {
          const r = await notifyStudents(cid, p.pid, "link", uids, origin).catch(() => null);
          if (r && !("error" in r)) people += r.people;
        }
        return NextResponse.json({ changed: n, told: { people } });
      }
      if (action === "company-live-feedback") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const room = /^[a-f0-9]{24}$/.test(str(b.room)) ? str(b.room) : "";
        const meta = room ? ((await adminGet(`partnerDrives/${p.pid}/live/${room}`)) as LiveMeta | null) : null;
        if (!meta) return bad("no-drive", 404);
        const verdict = ["Strong yes", "Yes", "Maybe", "No"].includes(str(b.verdict)) ? str(b.verdict) : "Maybe";
        await adminMerge(`partnerDrives/${p.pid}/live/${room}`, { feedback: { score: num(b.score, 0, 10), verdict, notes: para(b.notes, 1500), at: Date.now() } });
        return NextResponse.json({ ok: true });
      }
      if (action === "company-update") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const op = str(b.op, 10);
        if (!EVENT_OF[op]) return bad("op");
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, 300).map((x) => x as { cid?: unknown; uid?: unknown }).map((x) => ({ cid: id(x.cid), uid: id(x.uid) })).filter((x) => x.cid && x.uid && p.statuses?.[x.cid] === "approved");
        const byCollege: Record<string, string[]> = {};
        let changed = 0;
        for (const it of items) {
          const a = (await adminGet(`colleges/${it.cid}/drives/${p.pid}/apps/${it.uid}`)) as App | null;
          if (!a) continue;
          const next = apply(op, a, p.rounds.length, b);
          if (!next) continue;
          await adminSet(`colleges/${it.cid}/drives/${p.pid}/apps/${it.uid}`, next);
          (byCollege[it.cid] ??= []).push(it.uid);
          changed++;
        }
        let emailed = 0, pushed = 0, people = 0;
        if (b.notify !== false)
          for (const [cid, uids] of Object.entries(byCollege)) {
            const r = await notifyStudents(cid, p.pid, EVENT_OF[op], uids, origin).catch(() => null);
            if (r && !("error" in r)) {
              emailed += r.emailed;
              pushed += r.pushed;
              people += r.people;
            }
          }
        return NextResponse.json({ changed, told: { emailed, pushed, people } });
      }
      return bad("action");
    }
    return bad("action");
  } catch {
    return bad("failed", 502);
  }
}
