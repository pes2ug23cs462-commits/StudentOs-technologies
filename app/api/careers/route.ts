/* POST /api/careers — careers applications and the AI interview.

   Anyone (no login):
     apply {roleId, name, email, phone, college, links, why}   → {token, start, end, ai}
   The candidate, with the link token (careerApps/{token}):
     interview-get {token}                                      → what to show
     interview-start {token}                                    → writes the questions once, returns the first
     interview-answer {token, index, answer, secs, flags}       → next question, or done
     interview-finish {token}                                   → AI report, team is emailed
   StudentOS team only (STUDENTOS_TEAM_EMAILS, verified email):
     apps | app-update {token, decision?, note?, extendDays?} | app-delete {token} | app-evaluate {token}

   Applications are only read and written here, with the service account; the
   Firestore rules keep careerApps closed to the browser. AI runs at most twice per
   application (questions once, report once), so the public endpoints can't be used
   as a free AI. */

import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { DEFAULT_ROLES, fmtWhen, stageOf, type CareerApp, type CareerReport, type CareerRole } from "@/lib/careers-data";
import { chat } from "@/lib/server/ai";
import { verifyIdUser } from "@/lib/server/auth";
import { adminConfigured, adminDelete, adminGet, adminIncrement, adminList, adminSet } from "@/lib/server/firestore-admin";
import { mailHtml, sendMails } from "@/lib/server/mail";

export const maxDuration = 60;

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const para = (v: unknown, max = 3000) => String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const GRACE = 15 * 60 * 1000; // a started interview may finish up to 15 minutes after the window
const teamEmails = () => (process.env.STUDENTOS_TEAM_EMAILS ?? "").toLowerCase().split(/[,;\s"']+/).filter(Boolean);

function json<T>(raw: string, open: "{" | "["): T | null {
  const close = open === "{" ? "}" : "]";
  const a = raw.indexOf(open);
  const b = raw.lastIndexOf(close);
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

async function roles(): Promise<{ open: boolean; roles: CareerRole[] }> {
  const d = await adminGet("site/careers");
  if (!d) return { open: true, roles: DEFAULT_ROLES };
  return { open: d.open !== false, roles: (Array.isArray(d.roles) ? d.roles : []) as CareerRole[] };
}

async function getApp(token: unknown): Promise<CareerApp | null> {
  const t = String(token ?? "");
  if (!/^[a-f0-9]{24}$/.test(t)) return null;
  const a = (await adminGet(`careerApps/${t}`)) as CareerApp | null;
  return a ? { ...a, answers: a.answers ?? [], questions: a.questions ?? [], flags: a.flags ?? { tabs: 0, pastes: 0 } } : null;
}
const save = (a: CareerApp) => adminSet(`careerApps/${a.token}`, a as unknown as Record<string, unknown>);

/** what the candidate's page needs, nothing about the team's decision */
function view(a: CareerApp) {
  const stage = stageOf(a);
  const i = a.answers.length;
  return { name: a.name, role: a.role, start: a.start, end: a.end, ai: a.ai, stage, total: a.questions.length || 0, index: i, question: stage === "in-progress" && i < a.questions.length ? a.questions[i] : "" };
}

async function questionsFor(a: CareerApp, r: CareerRole | undefined, n: number): Promise<string[]> {
  const prompt = `You interview applicants for an internship at StudentOS, an Indian ed-tech startup (an AI study and placement app for students).
Role: "${a.role}".
${r?.does.length ? `The intern will: ${r.does.join("; ")}.` : ""}
${r?.wants.length ? `We look for: ${r.wants.join("; ")}.` : ""}
${r?.ivFocus ? `The team wants you to check especially: ${r.ivFocus}.` : ""}
Applicant: ${a.college}. Their links: ${[a.resume, a.links].filter(Boolean).join(", ") || "none"}. Why they applied: ${str(a.why, 400) || "not given"}.

Write exactly ${n} interview questions, in the order a good interviewer would ask them: 1 short warm-up about them, then mostly role questions (real tasks, tools, a small scenario), and 1 question on how they work in a team. Each must be answerable in 1–2 minutes by typing or speaking, one thing at a time, under 220 characters, in simple English.
Reply with JSON only: ["question 1", "question 2", ...]`;
  for (let i = 0; i < 2; i++) {
    const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1200, temperature: 0.7 });
    const list = (json<unknown[]>(text, "[") ?? []).map((x) => str(x, 300)).filter((x) => x.length > 10);
    if (list.length >= Math.min(3, n)) return list.slice(0, n);
  }
  throw new Error("busy");
}

async function report(a: CareerApp, r: CareerRole | undefined): Promise<CareerReport> {
  const qa = a.questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${str(a.answers[i]?.a, 1500) || "(no answer)"}`).join("\n\n");
  const prompt = `You are a fair hiring panel at StudentOS, an Indian ed-tech startup, reviewing an AI interview for the role "${a.role}" (internship).
${r?.wants.length ? `We look for: ${r.wants.join("; ")}.` : ""}
Applicant studies at: ${a.college}.

${qa}

Score each answer 0–10 for substance, clarity and fit for the role. Be honest: empty, copied-looking or off-topic answers score low. Don't judge English grammar harshly; judge thinking.
Reply with JSON only:
{"overall":0-100,"verdict":"one of: Strong yes, Yes, Maybe, No","summary":"2 short sentences for the team","strengths":["up to 3"],"concerns":["up to 3"],"items":[{"score":0-10,"note":"one short line"}]}`;
  for (let i = 0; i < 2; i++) {
    const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 1500, temperature: 0.3 });
    const j = json<{ overall?: unknown; verdict?: unknown; summary?: unknown; strengths?: unknown[]; concerns?: unknown[]; items?: { score?: unknown; note?: unknown }[] }>(text, "{");
    if (!j) continue;
    const overall = Math.round(Math.min(100, Math.max(0, Number(j.overall) || 0)));
    return {
      overall,
      verdict: ["Strong yes", "Yes", "Maybe", "No"].includes(str(j.verdict)) ? str(j.verdict) : overall >= 75 ? "Yes" : overall >= 55 ? "Maybe" : "No",
      summary: str(j.summary, 400),
      strengths: (j.strengths ?? []).map((x) => str(x, 160)).filter(Boolean).slice(0, 3),
      concerns: (j.concerns ?? []).map((x) => str(x, 160)).filter(Boolean).slice(0, 3),
      items: a.questions.map((_, k) => ({ score: Math.min(10, Math.max(0, Math.round(Number(j.items?.[k]?.score) || 0))), note: str(j.items?.[k]?.note, 200) })),
    };
  }
  throw new Error("busy");
}

async function tellTeam(a: CareerApp, origin: string, kind: "applied" | "done") {
  const to = teamEmails();
  if (!to.length) return;
  const url = `${origin}/partner?tab=careers&app=${a.token}`;
  const lines =
    kind === "applied"
      ? [`${a.name} applied for ${a.role}.`, `${a.college} · ${a.email} · ${a.phone}`, `Resume: ${a.resume}`, a.ai ? `AI interview window: ${fmtWhen(a.start)} – ${fmtWhen(a.end)}.` : "No AI interview for this role."]
      : [`${a.name} finished the AI interview for ${a.role}.`, a.report ? `Score ${a.report.overall}/100 · ${a.report.verdict}. ${a.report.summary}` : "The report couldn’t be made yet; open the application to try again.", a.flags.tabs || a.flags.pastes ? `Left the tab ${a.flags.tabs}× · pasted ${a.flags.pastes}×.` : ""];
  await sendMails(
    to.map((m) => ({
      to: m,
      subject: kind === "applied" ? `New application: ${a.role} · ${a.name}` : `AI interview done: ${a.name} · ${a.report ? `${a.report.overall}/100` : "report pending"}`,
      text: `${lines.filter(Boolean).join("\n")}\n\nOpen: ${url}`,
      html: mailHtml({ brand: "StudentOS · Careers", heading: kind === "applied" ? "New application" : "AI interview finished", lines: lines.filter(Boolean), button: "Open the application", url, foot: "You get this because you’re on the StudentOS team." }),
      replyTo: a.email,
    })),
  );
}

export async function POST(req: Request) {
  if (!adminConfigured()) return bad("not-configured", 503);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = str(b.action, 30);
  const origin = new URL(req.url).origin;

  try {
    /* ---------------- apply (public) ---------------- */
    if (action === "apply") {
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "x";
      const day = new Date().toISOString().slice(0, 10);
      if ((await adminIncrement(`careerRate/${day}_${createHash("sha256").update(ip).digest("hex").slice(0, 16)}`, "n")) > 8) return bad("slow-down", 429);
      const f = { name: str(b.name, 80), email: str(b.email, 120).toLowerCase(), phone: str(b.phone, 20), college: str(b.college, 160), resume: str(b.resume, 500), links: str(b.links, 500), why: para(b.why, 1500) };
      if (f.name.length < 2 || !/^\S+@\S+\.\S+$/.test(f.email) || f.phone.replace(/\D/g, "").length < 10 || f.college.length < 2 || !/^https?:\/\/\S+\.\S+/.test(f.resume)) return bad("bad-form");
      const site = await roles();
      const role = site.roles.find((r) => r.id === str(b.roleId, 80) && !r.paused);
      const other = str(b.roleId, 80) === "other";
      if (!site.open || (!role && !other)) return bad("closed");
      // already applied for this role: give the same link again
      const mine = (await adminList("careerApps", 2000)).map((x) => x.data as unknown as CareerApp).find((x) => x.email === f.email && x.roleId === (role?.id ?? "other") && stageOf(x) !== "missed");
      if (mine) return NextResponse.json({ token: mine.token, start: mine.start, end: mine.end, ai: mine.ai, again: true });
      const now = Date.now();
      const ai = !!role && role.ai !== false;
      const fixed = role?.windowEnd && role.windowEnd > now;
      if (role?.windowEnd && !fixed) return bad("closed");
      const start = fixed ? Math.max(now, role!.windowStart || now) : now;
      const end = fixed ? role!.windowEnd! : now + (role?.within || 3) * 86400000;
      const a: CareerApp = { token: randomBytes(12).toString("hex"), ...f, roleId: role?.id ?? "other", role: role?.title ?? "Other", appliedAt: now, start, end, ai, stage: "invited", questions: [], answers: [], flags: { tabs: 0, pastes: 0 }, report: null, decision: "", note: "" };
      await save(a);
      const link = `${origin}/careers/interview/${a.token}`;
      await Promise.all([
        sendMails([
          {
            to: a.email,
            subject: ai ? `Your StudentOS AI interview: ${a.role}` : `We got your application: ${a.role}`,
            text: ai ? `Hi ${a.name},\n\nThanks for applying for ${a.role} at StudentOS. Your next step is a short AI interview (about 15 minutes).\nOpen it between ${fmtWhen(start)} and ${fmtWhen(end)} (IST):\n${link}\n\nThe StudentOS team` : `Hi ${a.name},\n\nThanks for applying for ${a.role} at StudentOS. Our team will read your application and get back to you.\n\nThe StudentOS team`,
            html: mailHtml({ brand: "StudentOS · Careers", heading: ai ? "Your AI interview is ready" : "We got your application", lines: ai ? [`Hi ${a.name}, thanks for applying for ${a.role}.`, "Your next step is a short AI interview, about 15 minutes. Type or speak your answers.", `Open it between ${fmtWhen(start)} and ${fmtWhen(end)} (IST).`] : [`Hi ${a.name}, thanks for applying for ${a.role}.`, "Our team will read your application and get back to you."], button: ai ? "Start my interview" : "See StudentOS careers", url: ai ? link : `${origin}/careers`, foot: "You get this because you applied on studentos careers. Keep this link private." }),
          },
        ]),
        tellTeam(a, origin, "applied"),
      ]);
      return NextResponse.json({ token: a.token, start, end, ai });
    }

    /* ---------------- interview (link token) ---------------- */
    if (action.startsWith("interview-")) {
      const a = await getApp(b.token);
      if (!a) return bad("not-found", 404);
      if (action === "interview-get") return NextResponse.json(view(a));
      const now = Date.now();
      if (!a.ai) return bad("not-found", 404);
      if (a.stage === "completed" && action !== "interview-finish") return bad("done", 409);
      if (now < a.start) return bad("not-yet", 409);
      const late = a.stage === "in-progress" ? now > a.end + GRACE : now > a.end;
      if (late && action !== "interview-finish") return bad("over", 409);

      if (action === "interview-start") {
        if (!a.questions.length) {
          const site = await roles();
          const r = site.roles.find((x) => x.id === a.roleId);
          a.questions = await questionsFor(a, r, r?.questions || 6);
        }
        if (a.stage === "invited") {
          a.stage = "in-progress";
          a.startedAt = now;
        }
        await save(a);
        return NextResponse.json(view(a));
      }
      if (action === "interview-answer") {
        if (a.stage !== "in-progress") return bad("not-found", 409);
        const i = Number(b.index);
        if (i !== a.answers.length || i >= a.questions.length) return NextResponse.json(view(a)); // a double click: just send the current state
        a.answers.push({ a: para(b.answer, 2500), secs: Math.min(3600, Math.max(0, Math.round(Number(b.secs) || 0))) });
        const fl = (b.flags ?? {}) as Record<string, unknown>;
        a.flags = { tabs: Math.min(999, Math.max(a.flags.tabs, Number(fl.tabs) || 0)), pastes: Math.min(999, Math.max(a.flags.pastes, Number(fl.pastes) || 0)) };
        await save(a);
        return NextResponse.json(view(a));
      }
      if (action === "interview-finish") {
        if (a.stage === "completed") return NextResponse.json(view(a));
        if (a.stage !== "in-progress" || a.answers.length < a.questions.length) return bad("not-found", 409);
        a.stage = "completed";
        a.completedAt = now;
        await save(a);
        try {
          const site = await roles();
          a.report = await report(a, site.roles.find((x) => x.id === a.roleId));
          await save(a);
        } catch {
          /* the team can run the report again from the dashboard */
        }
        await tellTeam(a, origin, "done");
        return NextResponse.json(view(a));
      }
      return bad("action");
    }

    /* ---------------- StudentOS team ---------------- */
    const me = await verifyIdUser(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
    if (!me) return bad("signed-out", 401);
    if (!(me.verified && me.email && teamEmails().includes(me.email))) return bad("not-allowed", 403);

    if (action === "apps") {
      const list = (await adminList("careerApps", 2000)).map((x) => x.data as unknown as CareerApp).sort((x, y) => y.appliedAt - x.appliedAt);
      return NextResponse.json({ apps: list });
    }
    const a = await getApp(b.token);
    if (!a) return bad("not-found", 404);
    if (action === "app-update") {
      if (typeof b.decision === "string" && ["", "shortlisted", "rejected", "offer-sent", "hired"].includes(b.decision)) a.decision = b.decision as CareerApp["decision"];
      if (typeof b.note === "string") a.note = para(b.note, 1500);
      const days = Math.min(14, Math.max(0, Number(b.extendDays) || 0));
      if (days) {
        a.end = Math.max(a.end, Date.now()) + days * 86400000;
        if (a.stage === "missed") a.stage = a.answers.length ? "in-progress" : "invited";
      }
      await save(a);
      return NextResponse.json({ app: a });
    }
    if (action === "app-evaluate") {
      if (a.stage !== "completed") return bad("not-found", 409);
      const site = await roles();
      a.report = await report(a, site.roles.find((x) => x.id === a.roleId));
      await save(a);
      return NextResponse.json({ app: a });
    }
    if (action === "app-delete") {
      await adminDelete(`careerApps/${a.token}`);
      return NextResponse.json({ ok: true });
    }
    return bad("action");
  } catch (e) {
    return bad(e instanceof Error && e.message === "busy" ? "busy" : "failed", 502);
  }
}
