/* POST /api/placement-notify — tells students about a placement update by email and by
   phone/laptop notification. Called by the college's admin or placement coordinator
   right after they save the change in the app.
   Body: { cid, did, event, uids? }
     event "new-drive": every college member who can apply (or hasn't filled the profile yet)
     event "link" | "advance" | "selected" | "offer" | "rejected": the students in `uids`
   The server reads the drive, the members / applications and push tokens itself with the
   service account, so it only ever sends what is really saved. A new drive is announced once.
   Every student told also gets an item in their in-app bell (users/{uid}/inbox).
   Returns { emailed, pushed, people }. Needs FIREBASE_SERVICE_ACCOUNT; email also needs
   RESEND_API_KEY (and EMAIL_FROM with a verified domain to reach every student). */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { adminConfigured, adminCreate, adminGet, adminList, adminPush, adminUpdate } from "@/lib/server/firestore-admin";
import { mailConfigured, mailHtml, sendMails, type Mail } from "@/lib/server/mail";

type Ev = "new-drive" | "link" | "advance" | "selected" | "offer" | "rejected";
const EVENTS: Ev[] = ["new-drive", "link", "advance", "selected", "offer", "rejected"];

type Drive = { company?: string; role?: string; kind?: string; ctc?: string; location?: string; deadline?: string; open?: boolean; rounds?: string[]; elig?: { branches?: string[]; minCgpa?: number; maxBacklogs?: number; batch?: string }; notifiedAt?: string };
type Person = { uid: string; name: string; email: string; wantsEmail: boolean; text: { subject: string; heading: string; lines: string[]; push: string; bell?: string } };

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v: unknown) => Number(v) || 0;
const fmtDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

function canApply(d: Drive, m: Record<string, unknown>) {
  if (!m.branch) return true; // profile not filled yet: tell them so they can fill it and apply
  const e = d.elig ?? {};
  if (e.branches?.length && !e.branches.includes(str(m.branch))) return false;
  if (e.minCgpa && num(m.cgpa) < e.minCgpa) return false;
  if (num(m.backlogs) > num(e.maxBacklogs)) return false;
  if (e.batch && m.batch && e.batch !== m.batch) return false;
  return true;
}

export async function POST(req: Request) {
  const me = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!me) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as { cid?: unknown; did?: unknown; event?: unknown; uids?: unknown };
  const cid = str(b.cid, 60), did = str(b.did, 60), event = str(b.event, 20) as Ev;
  if (!/^[\w-]+$/.test(cid) || !/^[\w-]+$/.test(did) || !EVENTS.includes(event)) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  try {
    const staff = await adminGet(`colleges/${cid}/staff/${me}`);
    if (!staff || !["admin", "placement"].includes(str(staff.role))) return NextResponse.json({ error: "not-allowed" }, { status: 403 });
    const drive = (await adminGet(`colleges/${cid}/drives/${did}`)) as Drive | null;
    if (!drive) return NextResponse.json({ error: "no-drive" }, { status: 404 });
    const college = await adminGet(`colleges/${cid}`);
    const collegeName = str(college?.name, 80) || "your college";
    const company = str(drive.company, 60), role = str(drive.role, 60);
    const where = `${company} · ${role}`;

    const people: Person[] = [];
    if (event === "new-drive") {
      if (drive.notifiedAt) return NextResponse.json({ emailed: 0, pushed: 0, people: 0, already: true });
      if (!drive.open) return NextResponse.json({ emailed: 0, pushed: 0, people: 0 });
      const members = await adminList(`colleges/${cid}/members`, 2000);
      const deadline = fmtDate(str(drive.deadline, 10));
      for (const { id, data: m } of members) {
        if (!canApply(drive, m)) continue;
        people.push({
          uid: id,
          name: str(m.name, 60),
          email: str(m.email, 120),
          wantsEmail: m.notifyEmail !== false,
          text: {
            subject: `New placement drive: ${company} – ${role}`,
            heading: `${company} is hiring: ${role}`,
            lines: [
              [str(drive.kind, 30), drive.ctc ? `Package: ${str(drive.ctc, 40)}` : "", drive.location ? str(drive.location, 60) : ""].filter(Boolean).join(" · "),
              deadline ? `Apply by ${deadline}.` : "Applications are open now.",
              m.branch ? "You’re eligible for this drive." : "Add your branch, CGPA and backlogs in StudentOS to apply.",
            ],
            push: `${role}${deadline ? ` · apply by ${deadline}` : ""}`,
          },
        });
      }
    } else {
      const uids = (Array.isArray(b.uids) ? b.uids : []).map((u) => str(u, 128)).filter((u) => /^[\w-]+$/.test(u)).slice(0, 300);
      const rounds = (drive.rounds ?? []).map((r) => str(r, 40));
      const apps = await Promise.all(uids.map((u) => adminGet(`colleges/${cid}/drives/${did}/apps/${u}`).catch(() => null)));
      const members = await Promise.all(uids.map((u) => adminGet(`colleges/${cid}/members/${u}`).catch(() => null)));
      apps.forEach((a, i) => {
        if (!a) return;
        const status = str(a.status, 20);
        const round = num(a.round);
        const links = (Array.isArray(a.links) ? a.links : []) as { title?: string; when?: string }[];
        const last = links[links.length - 1];
        const offer = a.offer as { ctc?: string; joining?: string } | undefined;
        let text: Person["text"] | null = null;
        if (event === "link" && last)
          text = { subject: `${company}: ${str(last.title, 60)}`, heading: `Your ${str(last.title, 60)} for ${company}`, lines: [`${role}.`, last.when ? `When: ${str(last.when, 60)}.` : "", "Open StudentOS to see the link."].filter(Boolean), push: `${str(last.title, 60)}${last.when ? ` · ${str(last.when, 60)}` : ""}`, bell: `Your ${str(last.title, 60)} is ready${last.when ? ` · ${str(last.when, 60)}` : ""}` };
        else if ((event === "advance" || event === "selected") && status === "selected")
          text = { subject: `You’re selected at ${company}!`, heading: `Congratulations, you’re selected at ${company}`, lines: [`${role}.`, "Your placement cell will share the offer details. Keep an eye on StudentOS."], push: `Selected for ${role} 🎉` };
        else if (event === "advance" && status === "in-process")
          text = { subject: `${company}: you’re in the next round`, heading: `You’ve moved to ${rounds[round] ?? `round ${round + 1}`}`, lines: [`${where}.`, "Your placement cell will share the details and links in StudentOS."], push: `Next: ${rounds[round] ?? `round ${round + 1}`}` };
        else if (event === "offer" && offer)
          text = { subject: `${company}: your offer details are ready`, heading: `Your offer from ${company}`, lines: [`${role}.`, offer.ctc ? `Package: ${str(offer.ctc, 40)}.` : "", offer.joining ? `Joining: ${str(offer.joining, 40)}.` : "", "Open StudentOS to see it and accept or decline."].filter(Boolean), push: `Offer: ${str(offer.ctc, 40) || role}` };
        else if (event === "rejected" && status === "rejected")
          text = { subject: `Update on ${company}`, heading: `An update on your ${company} application`, lines: [`${role}: you weren’t selected this time.`, "Every drive is practice for the next one. Other open drives are in StudentOS."], push: "You weren’t selected this time. See other open drives." };
        if (!text) return;
        const m = members[i];
        people.push({ uid: uids[i], name: str(a.name, 60), email: str(a.email, 120), wantsEmail: m?.notifyEmail !== false, text });
      });
    }

    const origin = new URL(req.url).origin;
    const url = `${origin}/placement`;
    // email
    const mails: Mail[] = mailConfigured()
      ? people
          .filter((p) => p.wantsEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email))
          .map((p) => ({
            to: p.email,
            subject: p.text.subject,
            text: `Hi ${p.name || "there"},\n\n${p.text.heading}\n${p.text.lines.join("\n")}\n\nOpen StudentOS: ${url}\n\nSent by StudentOS for ${collegeName}'s placement cell. You can turn off placement emails in StudentOS → Placements.`,
            html: mailHtml({ heading: p.text.heading, lines: [`Hi ${p.name || "there"},`, ...p.text.lines], button: "Open in StudentOS", url, foot: `Sent by StudentOS for ${collegeName}’s placement cell. You can turn off placement emails in StudentOS → Placements.` }),
          }))
      : [];
    const emailed = await sendMails(mails);
    // the bell inside StudentOS: always, whatever the email / push settings
    const at = Date.now();
    const bellTitle = event === "new-drive" ? `New drive: ${company}` : company;
    await Promise.all(
      people.map((p) =>
        adminCreate(`users/${p.uid}/inbox`, `${event}-${did}-${at}`, { id: `${event}-${did}-${at}`, kind: "placement", title: bellTitle, body: (p.text.bell ?? (event === "new-drive" ? p.text.push : p.text.heading)).slice(0, 220), url: "/placement", at, read: false }).catch(() => false),
      ),
    );
    // phone / laptop notifications
    let pushed = 0;
    const tokens = await Promise.all(people.map((p) => adminGet(`pushTokens/${p.uid}`).catch(() => null)));
    await Promise.all(
      people.map(async (p, i) => {
        const token = str(tokens[i]?.token, 4096);
        if (!token) return;
        try {
          if (await adminPush(token, { title: event === "new-drive" ? `New drive: ${company}` : company, body: p.text.push, url: "/placement" })) pushed++;
        } catch {
          /* skip this one */
        }
      }),
    );
    if (event === "new-drive") await adminUpdate(`colleges/${cid}/drives/${did}`, { notifiedAt: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ emailed, pushed, people: people.length, email: mailConfigured() });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
