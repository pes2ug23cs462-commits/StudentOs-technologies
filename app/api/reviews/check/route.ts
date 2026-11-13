/* POST /api/reviews/check   (signed-in student, after saving their review)
   Checks the student's review automatically and approves it when it is fine:
   simple rules first (no links or phone numbers), then a short AI check for
   abuse, spam, ads or other people's personal details. Honest criticism is
   allowed. If anything is unsure or not set up, the review simply waits for a
   manual check in the Firebase console, like before.
   Returns { approved: boolean, reason?: string }. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { adminConfigured, adminGet, adminUpdate } from "@/lib/server/firestore-admin";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

// links, social handles and phone numbers (“B.Com” / “M.Com” are degrees, not links)
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|in|net|org|io|co|xyz|app|link)\b|@[a-z0-9_]{3,}|\b\d{10}\b|\+91|telegram|whatsapp|t\.me)/i;

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ approved: false, reason: "manual" });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ approved: false, reason: "manual" });

  try {
    const r = await adminGet(`reviews/${uid}`);
    if (!r) return NextResponse.json({ error: "missing" }, { status: 404 });
    if (r.approved === true) return NextResponse.json({ approved: true });
    const name = String(r.name ?? "");
    const role = String(r.role ?? "");
    const text = String(r.text ?? "");
    if (LINK.test(`${name} ${role} ${text}`)) return NextResponse.json({ approved: false, reason: "Please remove links, handles and phone numbers." });

    const prompt = `You moderate public student reviews of StudentOS, a study-planner app for Indian college students. Decide if this review can be shown publicly.

Approve if it is a genuine review of the app, in any language (English, Hindi, Hinglish, Kannada…), positive OR negative. Honest criticism and complaints MUST be approved.
Reject only if it contains: abuse, insults, hate, sexual content, threats; spam, ads or promotion of another product; personal details of other people; content unrelated to StudentOS; or the "name" field is offensive or clearly not a person's name.

Name: ${JSON.stringify(name.slice(0, 60))}
Course/college: ${JSON.stringify(role.slice(0, 90))}
Review: ${JSON.stringify(text.slice(0, 500))}

Reply with JSON only: {"ok": true} or {"ok": false, "reason": "one short sentence for the student"}`;

    const { text: raw } = await chat([{ role: "user", content: prompt }], { maxTokens: 300, temperature: 0 });
    const m = raw.match(/\{[\s\S]*\}/);
    const verdict = m ? (JSON.parse(m[0]) as { ok?: boolean; reason?: string }) : null;
    if (verdict?.ok === true) {
      await adminUpdate(`reviews/${uid}`, { approved: true });
      return NextResponse.json({ approved: true });
    }
    if (verdict?.ok === false) return NextResponse.json({ approved: false, reason: String(verdict.reason ?? "").slice(0, 200) || "This review needs a manual check." });
    return NextResponse.json({ approved: false, reason: "manual" });
  } catch (e) {
    console.error("[reviews/check]", e instanceof AiError ? e.code : e instanceof Error ? e.message : e);
    return NextResponse.json({ approved: false, reason: "manual" });
  }
}
