/* POST /api/face — the face check for strict rounds (see lib/faceprint.ts).

   Student (signed in):
     status                       → {enrolled, at}
     enroll {print, consent:true} → {ok}       saves their faceprint (numbers, not a photo)
     delete                       → {ok}       removes it
     check  {print, cid?, where}  → {enrolled, own, other}
        own:   does the face on camera look like this account's owner?
        other: does it look like a student of the same college who is already placed?
               If so the college's placement cell gets a flag to look at. The answer never
               names the other student.
   College staff (admin or placement):
     flags {cid}                  → {flags}    the flags for their college, newest first
     clear {cid, id}              → {ok}

   Faceprints live in faceprints/{uid}; flags in colleges/{cid}/identityFlags. Both are read
   and written only here with the service account; the Firestore rules keep them closed. */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { OTHER_MATCH, OWN_MISMATCH, decodePrint, encodePrint, printDistance } from "@/lib/faceprint";
import { verifyIdUser } from "@/lib/server/auth";
import { adminConfigured, adminDelete, adminGet, adminIncrement, adminList, adminSet } from "@/lib/server/firestore-admin";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const str = (v: unknown, max = 60) => String(v ?? "").trim().slice(0, max);
const okId = (s: string) => /^[\w-]{1,60}$/.test(s);

/** Students of a college who hold an offer they haven't declined. */
async function placedUids(cid: string): Promise<Set<string>> {
  const out = new Set<string>();
  const drives = await adminList(`colleges/${cid}/drives`, 300);
  for (const d of drives) {
    const apps = await adminList(`colleges/${cid}/drives/${d.id}/apps`, 2000).catch(() => []);
    for (const a of apps) if (a.data.status === "selected" && a.data.offer && a.data.decision !== "declined") out.add(a.id);
  }
  return out;
}

export async function POST(req: Request) {
  const me = await verifyIdUser(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!me) return bad("signed-out", 401);
  if (!adminConfigured()) return bad("not-configured", 503);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const uid = me.uid;

  try {
    if (b.action === "status") {
      const f = await adminGet(`faceprints/${uid}`);
      return NextResponse.json({ enrolled: !!decodePrint(f?.print), at: Number(f?.at ?? 0) });
    }

    if (b.action === "enroll") {
      if (b.consent !== true) return bad("no-consent");
      const p = Array.isArray(b.print) ? decodePrint((b.print as number[]).join(",")) : null;
      if (!p) return bad("bad-print");
      const day = new Date().toISOString().slice(0, 10);
      if ((await adminIncrement(`faceLimits/${uid}_enroll_${day}`, "n")) > 5) return bad("too-many", 429);
      await adminSet(`faceprints/${uid}`, { print: encodePrint(p), at: Date.now(), consent: true });
      return NextResponse.json({ ok: true });
    }

    if (b.action === "delete") {
      await adminDelete(`faceprints/${uid}`).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (b.action === "check") {
      const p = Array.isArray(b.print) ? decodePrint((b.print as number[]).join(",")) : null;
      if (!p) return bad("bad-print");
      const day = new Date().toISOString().slice(0, 10);
      if ((await adminIncrement(`faceLimits/${uid}_check_${day}`, "n")) > 400) return bad("too-many", 429);
      const mine = decodePrint((await adminGet(`faceprints/${uid}`))?.print);
      if (!mine) return NextResponse.json({ enrolled: false });
      const ownDist = printDistance(p, mine);
      const own = ownDist <= OWN_MISMATCH;

      // only when it doesn't look like the owner: does it look like a placed classmate?
      let other = false;
      const cid = str(b.cid);
      if (!own && cid && okId(cid) && (await adminGet(`colleges/${cid}/members/${uid}`))) {
        let best = { uid: "", dist: 1 };
        for (const u of await placedUids(cid)) {
          if (u === uid) continue;
          const theirs = decodePrint((await adminGet(`faceprints/${u}`).catch(() => null))?.print);
          if (!theirs) continue;
          const dist = printDistance(p, theirs);
          if (dist < best.dist) best = { uid: u, dist };
        }
        if (best.uid && best.dist <= OTHER_MATCH && best.dist < ownDist) {
          other = true;
          await adminSet(`colleges/${cid}/identityFlags/${randomBytes(8).toString("hex")}`, {
            account: uid,
            looksLike: best.uid,
            where: str(b.where, 40),
            closeness: Math.round((1 - best.dist) * 1000) / 10,
            at: Date.now(),
          });
        }
      }
      return NextResponse.json({ enrolled: true, own, other });
    }

    if (b.action === "flags" || b.action === "clear") {
      const cid = str(b.cid);
      if (!okId(cid)) return bad("bad-request");
      const staff = await adminGet(`colleges/${cid}/staff/${uid}`);
      if (!staff || !["admin", "placement"].includes(str(staff.role))) return bad("not-allowed", 403);
      if (b.action === "clear") {
        const id = str(b.id, 40);
        if (!/^[a-f0-9]{16}$/.test(id)) return bad("bad-id");
        await adminDelete(`colleges/${cid}/identityFlags/${id}`);
        return NextResponse.json({ ok: true });
      }
      const flags = (await adminList(`colleges/${cid}/identityFlags`, 500)).map((f) => ({ id: f.id, ...f.data })).sort((x, y) => Number((y as { at?: number }).at ?? 0) - Number((x as { at?: number }).at ?? 0));
      // names from the college's own member list, so staff see who is who
      const names: Record<string, string> = {};
      for (const f of flags as { account?: string; looksLike?: string }[])
        for (const u of [f.account, f.looksLike]) if (u && !(u in names)) names[u] = str((await adminGet(`colleges/${cid}/members/${u}`).catch(() => null))?.name, 80) || "A student";
      return NextResponse.json({ flags, names });
    }
  } catch {
    return bad("failed", 500);
  }
  return bad("bad-action");
}
