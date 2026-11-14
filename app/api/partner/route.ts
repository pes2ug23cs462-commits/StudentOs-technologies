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
import { verifyIdUser } from "@/lib/server/auth";
import { adminConfigured, adminProblem, adminCreate, adminGet, adminList, adminMerge, adminSet } from "@/lib/server/firestore-admin";
import { notifyStudents, type NotifyEv } from "@/lib/server/notify-core";

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v: unknown, min = 0, max = 100) => Math.max(min, Math.min(max, Number(v) || 0));
const id = (v: unknown) => (/^[\w-]{1,80}$/.test(String(v ?? "")) ? String(v) : "");
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

type Drive = {
  id: string; company: string; role: string; kind: string; ctc: string; location: string; about: string;
  rounds: string[]; elig: { branches: string[]; minCgpa: number; maxBacklogs: number; batch: string };
  deadline: string; open: boolean; createdAt: number; createdBy: string;
};
type PDrive = Drive & { pid: string; companyId: string; colleges: string[]; statuses: Record<string, string>; minInterview: number };

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
          colleges: colleges.map((c) => ({ id: c.id, name: str(c.data.name), type: str(c.data.type), city: str(c.data.city) })),
          companies: companies.map((c) => ({ id: c.id, name: str(c.data.name), website: str(c.data.website), code: str(c.data.code) })),
          drives: drives.map((d) => d.data).sort((x, y) => Number(y.createdAt) - Number(x.createdAt)),
        });
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
        const p: PDrive = { ...drive, pid, companyId, colleges, statuses, minInterview: num(b.minInterview, 0, 100) };
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
            .map((d) => ({ pid: d.pid, role: d.role, kind: d.kind, ctc: d.ctc, deadline: d.deadline, rounds: d.rounds, colleges: Object.values(d.statuses ?? {}).filter((s) => s === "approved").length })),
        });
      }
      if (action === "company-applicants") {
        const p = await mine(id(b.pid));
        if (!p) return bad("no-drive", 404);
        const approved = Object.entries(p.statuses ?? {}).filter(([, s]) => s === "approved").map(([cid]) => cid);
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
              scores: a.scores ?? null,
              status: str(a.status, 20),
              round: Number(a.round) || 0,
              links: a.links ?? [],
              offer: a.offer ?? null,
              decision: str(a.decision, 10),
              appliedAt: Number(a.appliedAt) || 0,
            }));
          }),
        );
        return NextResponse.json({ drive: { pid: p.pid, role: p.role, kind: p.kind, ctc: p.ctc, deadline: p.deadline, rounds: p.rounds, company: p.company }, applicants: per.flat() });
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
