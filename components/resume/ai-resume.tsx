"use client";

/* Resume Creator → AI Resume Builder (Premium).
   The student adds a target role or job description, then:
   · Write with AI: a new headline, summary, action-verb points for each project
     and skills ordered for the role. Every change is shown before → after and
     only what they tick is applied. The original projects are never changed.
   · Check ATS score: a checklist score, keyword match with the job description
     and the AI’s top fixes. */

import Link from "next/link";
import { useState } from "react";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { Button } from "@/components/ui/button";
import { CheckIcon, CrownIcon, SparkleIcon, TargetIcon, XIcon } from "@/components/ui/icons";
import { Card, Checkbox, Textarea } from "@/components/ui/primitives";
import { AssistantError } from "@/lib/assistant";
import type { Entry, ResumeData } from "@/lib/free";
import { usePremium } from "@/lib/premium";
import { atsScore, checkResume, entryPoints, localChecks, resumeText, writeResume, type AiCheck, type AiDraft } from "@/lib/resume-ai";
import { cn } from "@/lib/utils";

/** The AI’s order first, then any of the student’s own skills it left out (nothing is dropped). */
function orderedSkills(own: string, ai: string[]) {
  const mine = own.split(",").map((x) => x.trim()).filter(Boolean);
  return [...ai, ...mine.filter((o) => !ai.some((x) => x.toLowerCase() === o.toLowerCase()))];
}

type Pick = { headline: boolean; summary: boolean; skills: boolean; bullets: Record<string, boolean>; add: string[] };

function Ring({ value }: { value: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const col = value >= 75 ? "#34d399" : value >= 50 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" className="stroke-white/10" strokeWidth="3.4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={col} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] leading-none font-bold text-white">{value}</span>
        <span className="mt-0.5 text-[10px] text-white/50">/ 100</span>
      </span>
    </div>
  );
}

export function AiResume({ r, entries, certs, profile, set }: { r: ResumeData; entries: Entry[]; certs: string[]; profile: string; set: (p: Partial<ResumeData>) => void }) {
  const { premium, loading } = usePremium();
  const [busy, setBusy] = useState<"" | "write" | "check">("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [check, setCheck] = useState<AiCheck | null>(null);
  const [showCheck, setShowCheck] = useState(false);
  const target = r.target ?? "";
  const items = localChecks(r, entries);
  const score = atsScore(items, check);

  if (loading) return <div className="h-[150px] animate-pulse rounded-2xl bg-white/[0.04]" />;
  if (!premium) {
    return (
      <div className="rounded-2xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(34,211,238,0.04))] p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <SparkleIcon size={15} className="text-violet-300" /> AI Resume Builder <PremiumBadge />
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">Paste a job description and AI writes your summary and project points with strong action verbs, orders your skills for the role and gives you an ATS score with missing keywords.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href="/premium" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 text-[12.5px] font-semibold text-[#ffffff]">
            <CrownIcon size={13} /> See Premium
          </Link>
          <span className="text-[12px] text-white/50">Quick check: <b className="text-white">{score.local}/100</b></span>
        </div>
      </div>
    );
  }

  const write = async () => {
    setError("");
    if (!r.name.trim() && !entries.length) return setError("Add your details and at least one project first.");
    setBusy("write");
    try {
      const d = await writeResume(r, entries, target, profile);
      setDraft(d);
      setPick({ headline: !!d.headline, summary: !!d.summary, skills: d.skills.length > 0, bullets: Object.fromEntries(d.bullets.map((b) => [b.id, true])), add: [] });
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t write your resume. Try again.");
    } finally {
      setBusy("");
    }
  };

  const runCheck = async () => {
    setError("");
    setBusy("check");
    try {
      setCheck(await checkResume(resumeText(r, entries, certs), target));
      setShowCheck(true);
    } catch (e) {
      setError(e instanceof AssistantError ? e.message : "Couldn’t check your resume. Try again.");
    } finally {
      setBusy("");
    }
  };

  const apply = () => {
    if (!draft || !pick) return;
    const patch: Partial<ResumeData> = {};
    if (pick.headline && draft.headline) patch.headline = draft.headline;
    if (pick.summary && draft.summary) patch.summary = draft.summary;
    let skills = pick.skills && draft.skills.length ? orderedSkills(r.skills, draft.skills) : r.skills.split(",").map((x) => x.trim()).filter(Boolean);
    skills = [...skills, ...pick.add.filter((a) => !skills.some((x) => x.toLowerCase() === a.toLowerCase()))];
    patch.skills = skills.join(", ");
    const bullets = { ...(r.bullets ?? {}) };
    for (const b of draft.bullets) if (pick.bullets[b.id]) bullets[b.id] = b.points.join("\n");
    patch.bullets = bullets;
    set(patch);
    setDraft(null);
    setPick(null);
    setCheck(null);
  };

  return (
    <>
      <Card glow className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <SparkleIcon size={15} className="text-violet-300" /> AI Resume Builder
          </p>
          <PremiumBadge />
        </div>
        <label htmlFor="r-target" className="mt-3 block text-[12.5px] font-medium text-white/75">
          Target role or job description <span className="font-normal text-white/40">(optional, makes it much better)</span>
        </label>
        <Textarea id="r-target" rows={3} value={target} onChange={(e) => set({ target: e.target.value })} placeholder="e.g. Accounts executive at a CA firm — or paste the full job description here" className="mt-1.5" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="primary" loading={busy === "write"} disabled={!!busy} icon={<SparkleIcon size={14} />} onClick={() => void write()}>
            {busy === "write" ? "Writing…" : "Write with AI"}
          </Button>
          <Button loading={busy === "check"} disabled={!!busy} icon={<TargetIcon size={14} />} onClick={() => void runCheck()}>
            {busy === "check" ? "Checking…" : "Check ATS score"}
          </Button>
        </div>
        <button type="button" onClick={() => setShowCheck((v) => !v)} className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left text-[12.5px] text-white/70 hover:bg-white/[0.06]">
          <span>
            Resume score: <b className={cn(score.score >= 75 ? "text-emerald-400" : score.score >= 50 ? "text-amber-300" : "text-rose-400")}>{score.score}/100</b>
            {score.match !== null && <span className="text-white/45"> · {score.match}% keyword match</span>}
          </span>
          <span className="text-[11.5px] text-accent">{showCheck ? "Hide" : "Details"}</span>
        </button>
        {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}

        {showCheck && (
          <div className="land-screen-in mt-4 space-y-4 border-t border-white/[0.07] pt-4">
            <div className="flex items-center gap-4">
              <Ring value={score.score} />
              <div className="text-[12.5px] text-white/60">
                <p className="text-[14px] font-semibold text-white">{score.score >= 80 ? "Strong resume" : score.score >= 60 ? "Good, a few fixes left" : "Needs work"}</p>
                <p className="mt-0.5">Checklist {score.local}/100{score.match !== null ? ` · keywords ${score.match}%` : ""}</p>
                {!check && <p className="mt-1 text-white/45">Press “Check ATS score” for keyword match and AI tips.</p>}
              </div>
            </div>
            <ul className="space-y-1.5">
              {items.map((x) => (
                <li key={x.label} className="flex items-start gap-2 text-[12.5px]">
                  <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", x.ok ? "bg-emerald-400/20 text-emerald-400" : "bg-rose-400/20 text-rose-400")}>{x.ok ? <CheckIcon size={10} /> : <XIcon size={10} />}</span>
                  <span>
                    <span className="text-white/85">{x.label}</span>
                    {!x.ok && <span className="block text-[11.5px] text-white/45">{x.tip}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {check && (check.matched.length > 0 || check.missing.length > 0) && (
              <div>
                <p className="text-[12px] font-semibold text-white/70">Job description keywords</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {check.matched.map((k) => <span key={k} className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11.5px] text-emerald-300">✓ {k}</span>)}
                  {check.missing.map((k) => <span key={k} className="rounded-full bg-rose-400/10 px-2.5 py-0.5 text-[11.5px] text-rose-300">✗ {k}</span>)}
                </div>
                {check.missing.length > 0 && <p className="mt-1.5 text-[11.5px] text-white/45">Add the missing ones only if you really have them, or learn them.</p>}
              </div>
            )}
            {check && check.tips.length > 0 && (
              <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-3.5">
                <p className="text-[12px] font-semibold text-violet-300">AI suggestions</p>
                <ul className="mt-1.5 space-y-1.5">
                  {check.tips.map((t) => (
                    <li key={t} className="flex gap-2 text-[12.5px] leading-relaxed text-white/75">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* review the AI draft */}
      {draft && pick && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDraft(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ai-review" className="my-6 w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
            <Card glow className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p id="ai-review" className="flex items-center gap-2 text-[19px] font-bold text-white"><SparkleIcon size={16} className="text-violet-300" /> Review AI changes</p>
                  <p className="mt-1 text-[12.5px] text-white/55">Tick what you want to keep. Your projects page stays as it is; these points are used only on your resume.</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => setDraft(null)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
              </div>

              <div className="mt-5 space-y-3">
                {draft.headline && (
                  <Change label="Headline" on={pick.headline} toggle={() => setPick({ ...pick, headline: !pick.headline })} before={r.headline} after={draft.headline} />
                )}
                {draft.summary && <Change label="Summary" on={pick.summary} toggle={() => setPick({ ...pick, summary: !pick.summary })} before={r.summary} after={draft.summary} />}
                {draft.bullets.map((b) => {
                  const e = entries.find((x) => x.id === b.id);
                  if (!e) return null;
                  return (
                    <Change
                      key={b.id}
                      label={e.title}
                      on={!!pick.bullets[b.id]}
                      toggle={() => setPick({ ...pick, bullets: { ...pick.bullets, [b.id]: !pick.bullets[b.id] } })}
                      before={entryPoints(r, e)}
                      after={b.points.map((p) => `• ${p}`).join("\n")}
                    />
                  );
                })}
                {draft.skills.length > 0 && (
                  <Change label="Skills (ordered for the role)" on={pick.skills} toggle={() => setPick({ ...pick, skills: !pick.skills })} before={r.skills} after={orderedSkills(r.skills, draft.skills).join(", ")} />
                )}
                {draft.suggested.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[13px] font-semibold text-white">Skills the role asks for that you didn’t list</p>
                    <p className="mt-0.5 text-[11.5px] text-white/50">Add only the ones you actually have.</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {draft.suggested.map((k) => {
                        const on = pick.add.includes(k);
                        return (
                          <button key={k} type="button" onClick={() => setPick({ ...pick, add: on ? pick.add.filter((x) => x !== k) : [...pick.add, k] })} aria-pressed={on} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", on ? "border-accent bg-accent/15 text-white" : "border-white/15 text-white/65 hover:border-white/30")}>
                            {on ? "✓ " : "+ "}{k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button variant="primary" icon={<CheckIcon size={14} />} onClick={apply}>Apply selected</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Change({ label, on, toggle, before, after }: { label: string; on: boolean; toggle: () => void; before: string; after: string }) {
  return (
    <div className={cn("rounded-xl border p-4 transition", on ? "border-violet-400/50 bg-violet-500/[0.06]" : "border-white/10 bg-white/[0.02]")}>
      <Checkbox checked={on} onChange={toggle} label={label}>
        <span className="text-[13.5px] font-semibold text-white">{label}</span>
      </Checkbox>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10.5px] font-semibold tracking-wide text-white/40 uppercase">Now</p>
          <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-white/50">{before.trim() || "(empty)"}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold tracking-wide text-violet-300 uppercase">AI version</p>
          <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-white/90">{after}</p>
        </div>
      </div>
    </div>
  );
}
