/* POST /api/contact { name, email, topic, message, website (honeypot) }
   The contact form, sent straight to the StudentOS team by email (Resend), with
   Reply-To set to the sender, so the team just presses Reply. A copy is kept in
   Firestore (contactMessages) so nothing is lost if email fails. The sender gets
   a short "we got it" email.
   Who receives it: CONTACT_TO (comma-separated), else STUDENTOS_TEAM_EMAILS. */

import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { CONTACT_TOPICS } from "@/lib/contact";
import { adminConfigured, adminIncrement, adminSet } from "@/lib/server/firestore-admin";
import { mailConfigured, mailHtml, sendMails } from "@/lib/server/mail";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const inbox = () =>
  (process.env.CONTACT_TO || process.env.STUDENTOS_TEAM_EMAILS || "")
    .toLowerCase()
    .split(/[,;\s"']+/)
    .filter((x) => /^\S+@\S+\.\S+$/.test(x));

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // bots fill every field, people never see this one
  if (str(b.website, 200)) return NextResponse.json({ ok: true });
  const name = str(b.name, 80);
  const email = str(b.email, 120).toLowerCase();
  const topic = CONTACT_TOPICS.includes(String(b.topic)) ? String(b.topic) : CONTACT_TOPICS[0];
  const message = typeof b.message === "string" ? b.message.replace(/\r/g, "").trim().slice(0, 4000) : "";
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) return bad("bad-form");

  const to = inbox();
  const canStore = adminConfigured();
  if (!canStore && !(mailConfigured() && to.length)) return bad("failed", 503);

  // spam limits: 5 a day per email, 30 a day per network
  const now = Date.now();
  const id = `${new Date(now).toISOString().slice(0, 10)}_${randomBytes(5).toString("hex")}`;
  if (canStore) {
    const day = id.slice(0, 10);
    const h = (v: string) => createHash("sha256").update(v).digest("hex").slice(0, 16);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "x";
    try {
      if ((await adminIncrement(`contactRate/${day}_e${h(email)}`, "n")) > 5) return bad("slow-down", 429);
      if ((await adminIncrement(`contactRate/${day}_${h(ip)}`, "n")) > 30) return bad("slow-down", 429);
    } catch {
      /* limits are best effort */
    }
  }

  let stored = false;
  if (canStore) {
    try {
      await adminSet(`contactMessages/${id}`, { name, email, topic, message, at: now, ua: str(req.headers.get("user-agent"), 200) });
      stored = true;
    } catch (e) {
      console.error("contact store", e instanceof Error ? e.message : e);
    }
  }

  const lines = message.split("\n").filter(Boolean);
  const sentTeam = to.length
    ? await sendMails(
        to.map((addr) => ({
          to: addr,
          subject: `${topic} · ${name} (StudentOS contact)`,
          text: `${name} <${email}> wrote (${topic}):\n\n${message}\n\nReply to this email to answer them.`,
          html: mailHtml({ brand: "StudentOS · Contact form", heading: `${topic}: ${name}`, lines: [`From ${name} · ${email}`, ...lines], button: `Reply to ${name}`, url: `mailto:${email}?subject=${encodeURIComponent(`Re: ${topic} · StudentOS`)}`, foot: "Sent from the contact form on student-os.in. Press Reply to answer them." }),
          replyTo: email,
        })),
      )
    : 0;
  if (!stored && !sentTeam) return bad("failed", 502);

  // a short confirmation to the sender (not counted as a failure if it doesn't go)
  await sendMails([
    {
      to: email,
      subject: "We got your message · StudentOS",
      text: `Hi ${name},\n\nThanks for writing to StudentOS about “${topic}”. Our team will reply to this email soon.\n\nThe StudentOS team`,
      html: mailHtml({ brand: "StudentOS", heading: "We got your message", lines: [`Hi ${name}, thanks for writing to us about “${topic}”.`, "Our team will reply to this email address soon."], button: "Open StudentOS", url: "https://student-os.in", foot: "You’re getting this because you used the contact form on student-os.in." }),
      replyTo: "support@student-os.in",
    },
  ]);
  return NextResponse.json({ ok: true });
}
