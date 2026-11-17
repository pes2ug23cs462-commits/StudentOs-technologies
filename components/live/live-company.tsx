"use client";

/* The recruiter's side of a live interview: the call, what strict mode saw on the
   student's side (live), and the feedback form. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { Label, LogoMark, Textarea, Wordmark } from "@/components/ui/primitives";
import { CallStage, useLiveCall, type Signal } from "@/components/live/live-call";
import { breachLabel } from "@/components/live/live-student";
import { partnerApi, partnerErrorText } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const VERDICTS = ["Strong yes", "Yes", "Maybe", "No"];

export function LiveCompany({ pid, room }: { pid: string; room: string }) {
  const { status } = useStore();
  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  if (status === "loading") return <div className="min-h-screen bg-ink" />;
  if (status === "signed-out")
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-center">
        <div>
          <p className="text-[15px] text-white/75">Log in with your recruiter account to join this interview.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`/company/live?d=${pid}&r=${room}`)}`} variant="primary" className="mt-4">Log in</ButtonLink>
        </div>
      </div>
    );
  return <LiveRoom pid={pid} room={room} />;
}

/** The host's call screen. `signal`/`saveFeedback`/`back` default to a company drive. */
export function LiveRoom({ pid, room, signal, saveFeedback, back = { href: "/company", label: "Applicants" }, note = "Only your company sees this. The student’s college sees the score and verdict." }: { pid: string; room: string; signal?: Signal; saveFeedback?: (fb: { score: number; verdict: string; notes: string }) => Promise<unknown>; back?: { href: string; label: string }; note?: string }) {
  const { actions } = useStore();
  const call = useLiveCall(pid, room, { signal });
  const m = call.info?.meta;
  const warns = call.other?.warnings ?? [];
  const [fb, setFb] = useState({ score: 6, verdict: "Maybe", notes: "" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!loaded && m) {
      if (m.feedback) {
        setFb({ score: m.feedback.score, verdict: m.feedback.verdict, notes: m.feedback.notes });
        setSent(true);
      }
      setLoaded(true);
    }
  }, [m, loaded]);
  const save = async () => {
    setBusy(true);
    try {
      await (saveFeedback ? saveFeedback(fb) : partnerApi("company-live-feedback", { pid, room, ...fb }));
      setSent(true);
      actions.toast("Feedback submitted. It shows in the applicants list.");
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col bg-ink p-4 text-white lg:h-screen lg:p-5">
      <div className="mb-3 flex items-center gap-3">
        <Link href={back.href} className="flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><ArrowLeftIcon size={13} /> {back.label}</Link>
        <span className="flex items-center gap-2"><LogoMark size={20} /><Wordmark className="text-[14px]" /></span>
        <span className="ml-auto text-[12.5px] text-white/50">{m ? `${m.role} · ${new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${m.minutes} min` : ""}</span>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CallStage call={call} otherName={m?.name ?? "the student"} className="min-h-[360px]" onEnd={() => window.confirm(`End the interview with ${m?.name ?? "the student"}? Then submit your feedback.`) && call.hangUp()} />
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4">
            <p className="text-[16px] font-semibold">{m?.name ?? "…"}</p>
            <p className="text-[12.5px] text-white/50">Live interview on StudentOS</p>
            <div className={cn("mt-3 rounded-xl p-3 text-[12.5px]", warns.length ? "border border-amber-400/30 bg-amber-400/[0.06]" : "bg-white/[0.04]")}>
              <p className={cn("font-semibold", warns.length ? "text-amber-100" : "text-emerald-300")}>{warns.length ? `Strict mode: ${warns.length} warning${warns.length === 1 ? "" : "s"}` : "Strict mode: no warnings"}</p>
              {warns.length > 0 && <ul className="mt-1 list-disc pl-4 text-white/70">{warns.map((w, i) => <li key={i}>{breachLabel(w)}</li>)}</ul>}
            </div>
          </div>
          <div className={cn("rounded-2xl border bg-[#0f0f11] p-4", call.state === "ended" && !sent ? "border-accent/60 shadow-[0_0_40px_-16px_rgba(167,139,250,0.8)]" : "border-white/[0.08]")}>
            <p className="text-[14px] font-semibold">Your feedback</p>
            {call.state === "ended" && !sent && <p className="mt-1 text-[12.5px] text-accent">Interview ended. Submit your feedback below.</p>}
            {sent && <p className="mt-1 text-[12.5px] text-emerald-300">Submitted ✓ You can change it and submit again.</p>}
            <div className="mt-3">
              <Label htmlFor="fs">Score: {fb.score}/10</Label>
              <input id="fs" type="range" min={0} max={10} value={fb.score} onChange={(e) => setFb({ ...fb, score: Number(e.target.value) })} className="w-full accent-[#a78bfa]" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {VERDICTS.map((v) => (
                <button key={v} type="button" onClick={() => setFb({ ...fb, verdict: v })} className={cn("h-9 rounded-lg border text-[12.5px]", fb.verdict === v ? "border-accent bg-accent/15 text-white" : "border-white/10 text-white/65 hover:text-white")}>{v}</button>
              ))}
            </div>
            <div className="mt-3"><Label htmlFor="fn">Notes</Label><Textarea id="fn" rows={4} value={fb.notes} onChange={(e) => setFb({ ...fb, notes: e.target.value })} placeholder="What went well, what didn’t, next step" /></div>
            <div className="sticky bottom-0 -mx-4 mt-3 bg-[#0f0f11] px-4 pt-1 pb-1">
              <Button variant="primary" className="w-full" loading={busy} onClick={() => void save()}>{sent ? "Submit again" : "Submit feedback"}</Button>
              {sent && <Link href={back.href} className="mt-2 block text-center text-[12.5px] text-white/60 hover:text-white">Back to {back.label.toLowerCase()}</Link>}
            </div>
            <p className="mt-2 text-[11.5px] text-white/40">{note}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
