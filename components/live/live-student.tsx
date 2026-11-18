"use client";

/* The student's side of a live interview: the call, full screen, in strict mode.
   Leaving full screen or switching tabs is noted and shown to the recruiter live.
   Joining works only in the booked slot (start time to end); when it's over the
   call ends for both sides. */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldIcon } from "@/components/ui/icons";
import { BREACH_TEXT, enterFullscreen, ProctorWarning, STRICT_SHELL, useProctor, type Breach } from "@/components/interview/proctor";
import { CallStage, useLiveCall, type Signal } from "@/components/live/live-call";
import { partnerApi, type LiveSignal } from "@/lib/partner";
import { slotState } from "@/lib/live-slot";
import { cn } from "@/lib/utils";

export function LiveStudent({ pid, room, signal, other = "the recruiter" }: { pid: string; room: string; signal?: Signal; other?: string }) {
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(false);
  // the slot: joining works only from the start time to the end
  const [slot, setSlot] = useState<{ at: number; minutes: number; skew: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const sigRef = useRef(signal);
  sigRef.current = signal;
  useEffect(() => {
    if (joined) return;
    let dead = false;
    const peek = () =>
      (sigRef.current ? sigRef.current({ pid, room }) : partnerApi<LiveSignal>("live-signal", { pid, room }))
        .then((r) => !dead && setSlot({ at: r.meta.at, minutes: r.meta.minutes, skew: (r.now ?? Date.now()) - Date.now() }))
        .catch(() => {});
    void peek();
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    const p = window.setInterval(() => void peek(), 60000);
    return () => {
      dead = true;
      window.clearInterval(t);
      window.clearInterval(p);
    };
  }, [pid, room, joined]);
  const state = slot ? slotState(slot.at, slot.minutes, now + slot.skew) : "early";
  const when = slot ? new Date(slot.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  const wait = slot ? slot.at - (now + slot.skew) : 0;
  const waitText = wait > 3600000 ? `${Math.floor(wait / 3600000)} h ${Math.ceil((wait % 3600000) / 60000)} min` : `${Math.max(1, Math.ceil(wait / 60000))} min`;
  if (left)
    return (
      <div className="mx-auto mt-6 max-w-[600px] rounded-2xl border border-white/[0.08] bg-[#0d152a] p-7 text-center">
        <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">Live interview</p>
        <h1 className="mt-1 text-[24px] font-semibold text-white">{state === "over" ? "The interview has ended" : "You’ve left the interview"}</h1>
        <p className="mt-2 text-[13.5px] text-white/60">Thank you! {other.replace(/^the /, "The ")} will share the result with you. {state === "over" ? "" : "Left by mistake? Join again while the slot is on."}</p>
        {state === "" ? <Button className="mt-5" onClick={() => { setLeft(false); enterFullscreen(); setJoined(true); }}>Join again</Button> : <p className="mt-4 text-[12.5px] text-white/45">The interview time is over.</p>}
      </div>
    );
  if (!joined)
    return (
      <div className="mx-auto mt-6 max-w-[600px] rounded-2xl border border-white/[0.08] bg-[#0d152a] p-7">
        <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">Live interview on StudentOS</p>
        <h1 className="mt-1 text-[24px] font-semibold text-white">Join your interview</h1>
        <p className="mt-1 text-[13.5px] text-white/60">A video call with {other}, right here. Use Chrome or Edge with a working camera and mic.</p>
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-100"><ShieldIcon size={15} /> Strict mode</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/70">
            <li>The call runs full screen. Leaving it or switching tabs is shown to {other}.</li>
            <li>Sit in a quiet place, alone, with your face in view.</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-white/45">Video goes straight between you and {other}. Nothing is recorded by StudentOS.</p>
        </div>
        {slot && <p className="mt-5 text-[14px] text-white"><b>{when}</b> (IST) · {slot.minutes} minutes</p>}
        {state === "over" ? (
          <p className="mt-4 rounded-lg bg-white/[0.05] px-3 py-2.5 text-[13px] text-white/65">This interview’s time is over. You can only join during the booked time. Missed it? Ask {other} for a new slot.</p>
        ) : state === "early" ? (
          <>
            <Button variant="primary" className="mt-4 w-full" disabled>{slot ? `Opens at the start time · in ${waitText}` : "Checking your slot…"}</Button>
            <p className="mt-2 text-center text-[12px] text-white/45">You can join only during the booked time, not before or after. Keep this page open; the button turns on by itself.</p>
          </>
        ) : (
          <Button variant="primary" className="mt-4 w-full" onClick={() => { enterFullscreen(); setJoined(true); }}>Join the interview</Button>
        )}
      </div>
    );
  return <InCall pid={pid} room={room} signal={signal} onLeft={() => { setJoined(false); setLeft(true); }} />;
}

function InCall({ pid, room, signal, onLeft }: { pid: string; room: string; signal?: Signal; onLeft: () => void }) {
  // warnings are sent to the recruiter; the call itself never ends on its own
  const proctor = useProctor(true, () => {});
  const call = useLiveCall(pid, room, { warnings: proctor.log, signal });
  const m = call.info?.meta;
  // the booked time ran out: the call has ended for both sides
  useEffect(() => {
    if (call.state !== "over") return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onLeft();
  }, [call.state, onLeft]);
  return (
    <div className={cn(STRICT_SHELL, "flex flex-col p-4 lg:p-6")}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">{m ? `${m.company} · ${m.role}` : "Live interview"}</p>
          <p className="text-[13px] text-white/60">{m ? `${new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${m.minutes} min` : ""}</p>
        </div>
        {proctor.log.length > 0 && <span className="rounded-lg border border-amber-400/30 px-2.5 py-1 text-[12px] text-amber-200">{proctor.log.length} warning{proctor.log.length === 1 ? "" : "s"} shown to the recruiter</span>}
      </div>
      <CallStage call={call} otherName={m?.company === "StudentOS" ? "the StudentOS team" : m?.company ? `the ${m.company} recruiter` : "the recruiter"} className="min-h-0 flex-1" onEnd={() => {
        if (!window.confirm("Leave the interview? Do this only when the interviewer says it’s over.")) return;
        call.hangUp();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        onLeft();
      }} />
      <ProctorWarning warn={proctor.warn} count={Math.min(proctor.log.length, 2)} onResume={proctor.resume} />
    </div>
  );
}

export const breachLabel = (b: string) => BREACH_TEXT[b as Breach] ?? b;
