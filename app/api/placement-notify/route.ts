/* POST /api/placement-notify — see lib/server/notify-core.ts for who gets what.
   Body: { cid, did, event, uids? }. Only the college's admin or placement coordinator. */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { adminConfigured, adminGet } from "@/lib/server/firestore-admin";
import { NOTIFY_EVENTS, notifyStudents, type NotifyEv } from "@/lib/server/notify-core";

const str = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(req: Request) {
  const me = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!me) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { cid?: unknown; did?: unknown; event?: unknown; uids?: unknown };
  const cid = str(b.cid, 60), did = str(b.did, 60), event = str(b.event, 20) as NotifyEv;
  if (!/^[\w-]+$/.test(cid) || !/^[\w-]+$/.test(did) || !NOTIFY_EVENTS.includes(event)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    const staff = await adminGet(`colleges/${cid}/staff/${me}`);
    if (!staff || !["admin", "placement"].includes(str(staff.role))) return NextResponse.json({ error: "not-allowed" }, { status: 403 });
    const r = await notifyStudents(cid, did, event, b.uids, new URL(req.url).origin);
    if ("error" in r) return NextResponse.json(r, { status: 404 });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
