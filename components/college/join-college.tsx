"use client";

/* Student side: join your college with its code and choose to share progress.
   Shows exactly what the college sees and doesn't, and lets them stop any time. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BuildingIcon, CheckIcon, LockIcon, XIcon } from "@/components/ui/icons";
import { Card, Input, Label } from "@/components/ui/primitives";
import { cleanCode, findByCode, joinCollege, leaveCollege, pushSummary, type College } from "@/lib/college";
import { useStore } from "@/lib/store";

const SEES = ["Your name and class / section", "Test scores for each chapter", "Videos and tests done, last active day", "Mock interview scores, coding and projects count"];
const NEVER = ["AI chats and questions you ask", "Your notes and uploaded files", "Phone, email, address", "Anything you didn’t do on StudentOS"];

export function JoinCollege({ initialCode = "" }: { initialCode?: string }) {
  const { state, actions, uid } = useStore();
  const link = state.college;
  const [code, setCode] = useState(cleanCode(initialCode));
  const [college, setCollege] = useState<College | null>(null);
  const [section, setSection] = useState(link?.section ?? "");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const school = state.setup?.academic.type === "school";

  const find = async (c = code) => {
    setError("");
    if (cleanCode(c).length < 6) return setError("The code has 6 letters and numbers.");
    setBusy(true);
    try {
      const col = await findByCode(c);
      if (!col) setError("No college has this code. Check it with your teacher.");
      setCollege(col);
    } catch {
      setError("Couldn’t check the code. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!link && cleanCode(initialCode).length >= 6) void find(initialCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    if (!college || !uid) return;
    if (!section.trim()) return setError("Write your class and section, e.g. II PUC A or CSE 3rd year.");
    setBusy(true);
    setError("");
    try {
      const l = await joinCollege(state, uid, college, section);
      actions.patch({ college: l });
      actions.toast(`You’re now sharing your progress with ${college.name}.`);
    } catch {
      setError("Couldn’t join. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    if (!link || !uid) return;
    if (!window.confirm(`Stop sharing with ${link.name}? They won’t see your progress any more.`)) return;
    setBusy(true);
    try {
      await leaveCollege(uid, link);
      actions.patch({ college: undefined });
      setCollege(null);
      setCode("");
      actions.toast("You’ve stopped sharing. Your college can’t see your progress now.");
    } catch {
      actions.toast("Couldn’t stop sharing. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const saveSection = async () => {
    if (!link || !uid || !section.trim()) return;
    const l = { ...link, section: section.trim() };
    actions.patch({ college: l });
    await pushSummary(state, uid, l).catch(() => {});
    setEditing(false);
    actions.toast("Section updated.");
  };

  const Lists = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
        <p className="text-[12.5px] font-semibold text-emerald-300">Your college sees</p>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-white/75">
          {SEES.map((x) => <li key={x} className="flex gap-2"><CheckIcon size={13} className="mt-0.5 shrink-0 text-emerald-300" />{x}</li>)}
        </ul>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[12.5px] font-semibold text-white/80">They never see</p>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-white/60">
          {NEVER.map((x) => <li key={x} className="flex gap-2"><LockIcon size={13} className="mt-0.5 shrink-0 text-white/40" />{x}</li>)}
        </ul>
      </div>
    </div>
  );

  if (link) {
    return (
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-plum)] text-accent"><BuildingIcon size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-emerald-300">Sharing your progress</p>
            <p className="mt-0.5 text-[18px] font-semibold text-white">{link.name}</p>
            {editing ? (
              <div className="mt-2 flex max-w-sm gap-2">
                <Input value={section} onChange={(e) => setSection(e.target.value)} aria-label="Class and section" />
                <Button variant="primary" size="sm" onClick={saveSection}>Save</Button>
              </div>
            ) : (
              <p className="mt-0.5 text-[13px] text-white/55">
                {link.section} · <button type="button" onClick={() => setEditing(true)} className="text-accent hover:underline">change section</button>
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={<XIcon size={13} />} onClick={leave} disabled={busy}>Stop sharing</Button>
        </div>
        <div className="mt-5">{Lists}</div>
        <p className="mt-3 text-[12px] text-white/45">Your summary updates by itself as you study. Stop sharing any time and the college loses access straight away.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-[16px] font-semibold text-white">Join your college</p>
      <p className="mt-1 text-[13px] text-white/55">Your teachers can see where the class is weak and plan extra classes. Get the 6-letter code from your college.</p>

      <div className="mt-5 flex max-w-md gap-2">
        <Input value={code} onChange={(e) => { setCode(cleanCode(e.target.value)); setCollege(null); }} placeholder="6-letter code" aria-label="College code" className="font-mono tracking-[0.2em] uppercase" onKeyDown={(e) => e.key === "Enter" && void find()} />
        <Button variant="primary" onClick={() => void find()} loading={busy && !college}>Find</Button>
      </div>

      {college && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-[var(--color-plum)]/40 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent"><BuildingIcon size={20} /></span>
            <div>
              <p className="text-[15px] font-semibold text-white">{college.name}</p>
              <p className="text-[12.5px] text-white/55">{college.city || (college.type === "school" ? "PU / school" : "Degree college")}</p>
            </div>
          </div>
          {Lists}
          <div className="max-w-sm">
            <Label htmlFor="sec">Your class and section</Label>
            <Input id="sec" value={section} onChange={(e) => setSection(e.target.value)} placeholder={school ? "e.g. II PUC A" : "e.g. CSE 3rd year"} />
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-white/75">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#a78bfa]" />
            <span>I agree to share this with {college.name}. I can stop any time.{school ? " If I’m under 18, my parent or guardian knows and agrees." : ""}</span>
          </label>
          <Button variant="primary" onClick={join} disabled={!agree || busy} loading={busy}>Share with my college</Button>
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
    </Card>
  );
}
