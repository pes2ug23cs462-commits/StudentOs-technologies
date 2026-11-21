"use client";

/* College side of the face check: rounds that were stopped because the face on camera
   looked like another student of this college who is already placed (see lib/faceprint.ts).
   A flag is only a lead for the placement cell to check, never proof. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckIcon, ShieldIcon } from "@/components/ui/icons";
import type { College } from "@/lib/college";
import { faceApi } from "@/lib/faceprint";

type Flag = { id: string; account: string; looksLike: string; where: string; closeness: number; at: number };

const SAMPLE: { flags: Flag[]; names: Record<string, string> } = {
  flags: [
    { id: "s1", account: "u1", looksLike: "u2", where: "/tests", closeness: 96.8, at: Date.now() - 2 * 3600e3 },
    { id: "s2", account: "u3", looksLike: "u4", where: "/interview", closeness: 95.9, at: Date.now() - 26 * 3600e3 },
  ],
  names: { u1: "Sample student A (CSE, 4th year)", u2: "Sample student B (CSE, placed)", u3: "Sample student C (ECE, 3rd year)", u4: "Sample student D (ECE, placed)" },
};

const WHERE: Record<string, string> = { "/tests": "Mock test", "/interview": "AI interview", "/code/company": "Company coding round", "/placement": "Aptitude mock" };

export function IdentityChecks({ college, sample }: { college: College; sample: boolean }) {
  const [data, setData] = useState<{ flags: Flag[]; names: Record<string, string> } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (sample) return setData(SAMPLE);
    faceApi<{ flags: Flag[]; names: Record<string, string> }>({ action: "flags", cid: college.id })
      .then(setData)
      .catch(() => setError("Couldn’t load identity checks. Try again later."));
  }, [college.id, sample]);

  const clear = async (id: string) => {
    if (!sample) await faceApi({ action: "clear", cid: college.id, id }).catch(() => {});
    setData((d) => (d ? { ...d, flags: d.flags.filter((f) => f.id !== id) } : d));
  };

  const nm = (u: string) => data?.names[u] ?? "A student";
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
            <ShieldIcon size={18} />
          </span>
          <div className="text-[13px] leading-relaxed text-white/70">
            <p className="text-[15px] font-semibold text-white">Someone taking a round for another student</p>
            <p className="mt-1">
              Students who set up the face check are checked by camera during strict tests and interviews. If the face on camera looks like a student of your college who is <b className="text-white">already placed</b> (holds an offer they haven’t declined), the round stops and it shows up here.
            </p>
            <p className="mt-1 text-white/50">A flag is a lead, not proof: lighting or a lookalike can cause one. Talk to both students before acting. Only face measurements are compared; no photo is kept.</p>
          </div>
        </div>
      </section>

      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
      {!data && !error && <p className="text-[13px] text-white/50">Loading…</p>}
      {data && !data.flags.length && (
        <p className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-[13px] text-white/60">
          <CheckIcon size={15} className="text-emerald-300" /> No identity flags. Nothing to check.
        </p>
      )}
      {data && data.flags.length > 0 && (
        <ul className="space-y-3">
          {data.flags.map((f) => (
            <li key={f.id} className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.05] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                    <AlertCircleIcon size={15} className="text-rose-300" /> {WHERE[f.where] ?? "Strict round"} stopped
                  </p>
                  <p className="mt-1.5 text-[13px] text-white/75">
                    Account: <b className="text-white">{nm(f.account)}</b>
                  </p>
                  <p className="text-[13px] text-white/75">
                    Face looked like: <b className="text-white">{nm(f.looksLike)}</b> · {f.closeness}% close
                  </p>
                  <p className="mt-1 text-[11.5px] text-white/45">{new Date(f.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void clear(f.id)}>
                  Checked, clear
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
