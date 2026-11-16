"use client";

/* The student's side of a live interview: the call, full screen, in strict mode.
   Leaving full screen or switching tabs is noted and shown to the recruiter live;
   the call doesn't end, the recruiter decides. */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldIcon } from "@/components/ui/icons";
import { BREACH_TEXT, enterFullscreen, ProctorWarning, STRICT_SHELL, useProctor, type Breach } from "@/components/interview/proctor";
import { CallStage, useLiveCall } from "@/components/live/live-call";
import { cn } from "@/lib/utils";

export function LiveStudent({ pid, room }: { pid: string; room: string }) {
  const [joined, setJoined] = useState(false);
  if (!joined)
    return (
      <div className="mx-auto mt-6 max-w-[600px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-7">
        <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">Live interview on StudentOS</p>
        <h1 className="mt-1 text-[24px] font-semibold text-white">Join your interview</h1>
        <p className="mt-1 text-[13.5px] text-white/60">A video call with the recruiter, right here. Use Chrome or Edge with a working camera and mic.</p>
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-100"><ShieldIcon size={15} /> Strict mode</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/70">
            <li>The call runs full screen. Leaving it or switching tabs is shown to the recruiter.</li>
            <li>Sit in a quiet place, alone, with your face in view.</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-white/45">Video goes straight between you and the recruiter. Nothing is recorded by StudentOS.</p>
        </div>
        <Button variant="primary" className="mt-5 w-full" onClick={() => { enterFullscreen(); setJoined(true); }}>Join the interview</Button>
      </div>
    );
  return <InCall pid={pid} room={room} />;
}

function InCall({ pid, room }: { pid: string; room: string }) {
  // warnings are sent to the recruiter; the call itself never ends on its own
  const proctor = useProctor(true, () => {});
  const call = useLiveCall(pid, room, { warnings: proctor.log });
  const m = call.info?.meta;
  return (
    <div className={cn(STRICT_SHELL, "flex flex-col p-4 lg:p-6")}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">{m ? `${m.company} · ${m.role}` : "Live interview"}</p>
          <p className="text-[13px] text-white/60">{m ? `${new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${m.minutes} min` : ""}</p>
        </div>
        {proctor.log.length > 0 && <span className="rounded-lg border border-amber-400/30 px-2.5 py-1 text-[12px] text-amber-200">{proctor.log.length} warning{proctor.log.length === 1 ? "" : "s"} shown to the recruiter</span>}
      </div>
      <CallStage call={call} otherName={m?.company ? `the ${m.company} recruiter` : "the recruiter"} className="min-h-0 flex-1" />
      <ProctorWarning warn={proctor.warn} count={Math.min(proctor.log.length, 2)} onResume={proctor.resume} />
    </div>
  );
}

export const breachLabel = (b: string) => BREACH_TEXT[b as Breach] ?? b;
