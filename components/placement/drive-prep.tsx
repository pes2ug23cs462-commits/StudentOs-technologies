"use client";

/* "Prepare for <company>": opens from a drive the student applied to.
   The drive's own rounds, a plan for the days ahead, what the company asked
   seniors at this college (checked by the placement cell), and practice. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { TOPIC, type TopicId } from "@/lib/aptitude";
import { TAGS, TAG_TOPIC, loadMine, loadVerified, shareExperience, tagCounts, type ExpResult, type Experience } from "@/lib/experiences";
import { currentLinks, driveRef, myApp, type Application, type Drive } from "@/lib/placement";
import { myReadiness, resumeCheck } from "@/lib/placement-prep";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Kind = "test" | "coding" | "tech" | "hr" | "gd" | "other";
/** What a round name most likely means. */
function kindOf(r: string): Kind {
  const s = r.toLowerCase();
  if (/hr|human/.test(s)) return "hr";
  if (/group discussion|\bgd\b/.test(s)) return "gd";
  if (/cod|program|hackathon/.test(s)) return "coding";
  if (/tech|interview|managerial/.test(s)) return "tech";
  if (/aptitude|test|assessment|online|written|exam|quiz/.test(s)) return "test";
  return "other";
}
const daysTo = (iso: string) => Math.ceil((new Date(`${iso}T23:59:59`).getTime() - Date.now()) / 86400000);

export function DrivePrep({ did }: { did: string }) {
  const { state, uid } = useStore();
  const link = state.college;
  const [drive, setDrive] = useState<Drive | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [seen, setSeen] = useState<Experience[]>([]);
  const [mine, setMine] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [share, setShare] = useState(false);

  useEffect(() => {
    if (!link || !uid) return;
    let live = true;
    (async () => {
      try {
        const s = await getDoc(driveRef(link.cid, did));
        if (!s.exists()) throw new Error("gone");
        const d = s.data() as Drive;
        const [a, v, m] = await Promise.all([myApp(link.cid, did, uid), loadVerified(link.cid, d.company).catch(() => []), loadMine(link.cid, uid).catch(() => [])]);
        if (!live) return;
        setDrive(d);
        setApp(a);
        setSeen(v);
        setMine(m.filter((x) => x.companyName.toLowerCase() === d.company.toLowerCase()));
      } catch {
        if (live) setErr("Couldn’t open this drive. It may have been removed.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [link?.cid, uid, did]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => tagCounts(seen), [seen]);
  const focus = useMemo(() => counts.map(([t]) => TAG_TOPIC[t]).filter((t): t is TopicId => !!t).slice(0, 4), [counts]);
  const { parts } = useMemo(() => myReadiness(state), [state]);

  if (!link) return <Card className="p-6 text-[13.5px] text-white/60">Join your college first to prepare for its drives.</Card>;
  if (loading) return <div className="space-y-4"><div className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" /><div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" /></div>;
  if (err || !drive) return <Card className="p-6 text-[13.5px] text-rose-300">{err || "Drive not found."}</Card>;

  const kinds = drive.rounds.map(kindOf);
  const has = (k: Kind) => kinds.includes(k);
  // readiness for this drive: only the parts its rounds use
  const used = [...new Set(kinds.flatMap((k) => (k === "test" ? ["Aptitude"] : k === "coding" ? ["Coding"] : k === "tech" ? ["Interviews", "Projects"] : k === "hr" || k === "gd" ? ["Interviews"] : [])))] as (keyof typeof parts)[];
  const forDrive = Math.round((used.length ? used : (["Aptitude", "Interviews", "Coding"] as const)).reduce((n, p) => n + parts[p], 0) / Math.max(1, used.length || 3) * 0.85 + resumeCheck(state).score * 0.15);
  const next = app ? [...currentLinks(app)].sort((a, b) => b.at - a.at)[0] : undefined;
  const left = daysTo(drive.deadline);
  const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
  const mockHref = `/placement?${q({ tab: "aptitude", mock: "1", for: drive.company, ...(focus.length ? { focus: focus.join(",") } : {}) })}`;
  const ivHref = (kind: string) => `/interview?${q({ role: drive.role, company: drive.company, kind })}`;
  const roundLink = (k: Kind): { label: string; href: string } =>
    k === "test" ? { label: "Aptitude mock", href: mockHref } : k === "coding" ? { label: "Coding practice", href: "/code" } : k === "hr" || k === "gd" ? { label: "HR mock interview", href: ivHref("hr") } : k === "tech" ? { label: "Technical mock interview", href: ivHref("technical") } : { label: "Practice", href: "/placement?tab=aptitude" };

  // a simple plan for the next 7 days, built from the rounds and the weakest topics
  const weakTopic = focus[0] ?? ("percent" as TopicId);
  const pool: { text: string; href: string }[] = [
    ...(has("test") ? [{ text: `Aptitude: ${TOPIC[weakTopic].name.toLowerCase()} (10 questions)`, href: `/placement?tab=aptitude&topic=${weakTopic}` }] : []),
    ...(has("coding") ? [{ text: "Coding: 3 problems on arrays and strings", href: "/code" }] : []),
    ...(seen.length ? [{ text: `Go through what ${drive.company} asked your seniors`, href: "#asked" }] : []),
    ...(has("test") ? [{ text: `Aptitude mock for ${drive.company} (30 min, strict mode)`, href: mockHref }] : []),
    ...(has("tech") ? [{ text: `Technical mock interview: ${drive.role}`, href: ivHref("technical") }] : []),
    ...(focus[1] ? [{ text: `Aptitude: ${TOPIC[focus[1]].name.toLowerCase()} (10 questions)`, href: `/placement?tab=aptitude&topic=${focus[1]}` }] : []),
    ...(has("coding") ? [{ text: "Coding: 2 medium problems, timed", href: "/code" }] : []),
    ...(has("hr") || has("gd") ? [{ text: "HR mock interview: why this company, strengths, relocation", href: ivHref("hr") }] : []),
    { text: "Resume: tailor it to this role and fix the checklist", href: "/resume" },
  ];
  const DAYS = ["Today", ...Array.from({ length: 6 }, (_, k) => new Date(Date.now() + (k + 1) * 86400000).toLocaleDateString("en-IN", { weekday: "short" }))];
  const plan = DAYS.map((d, k) => ({ day: d, ...pool[k % pool.length] }));

  return (
    <div className="space-y-5">
      <Link href="/placement?tab=drives" className="inline-flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white"><ArrowLeftIcon size={14} /> Campus drives</Link>

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.12em] text-accent uppercase">{app ? "You applied" : "Drive"} · {link.name}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white">Prepare for {drive.company}</h1>
          <p className="mt-1 text-[13.5px] text-white/60">{drive.role} · {drive.ctc} · {drive.rounds.length} round{drive.rounds.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-5 py-3 text-center">
            <p className="text-[11.5px] text-white/50">{next ? next.title : left > 0 ? "Applications close in" : "Applications"}</p>
            <p className="mt-0.5 text-[20px] font-semibold text-amber-200">{next ? next.when || "Link sent" : left > 0 ? `${left} day${left === 1 ? "" : "s"}` : "closed"}</p>
          </Card>
          <Card className="px-5 py-3 text-center">
            <p className="text-[11.5px] text-white/50">Ready for this drive</p>
            <p className="mt-0.5 text-[20px] font-semibold text-accent tabular-nums">{forDrive}%</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card className="p-5">
          <p className="text-[15px] font-semibold text-white">How this drive runs</p>
          <p className="mt-0.5 text-[12.5px] text-white/50">From the drive your placement cell posted</p>
          <ol className="mt-3">
            {drive.rounds.map((r, k) => {
              const l = roundLink(kinds[k]);
              const reached = app && app.status !== "rejected" ? k < app.round : false;
              return (
                <li key={k} className={cn("flex items-center gap-3 py-3", k > 0 && "border-t border-white/[0.06]")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", reached ? "bg-emerald-400/15 text-emerald-300" : "bg-accent/15 text-accent")}>{reached ? <CheckIcon size={12} /> : k + 1}</span>
                  <span className="min-w-0 flex-1 text-[14px] text-white">{r}</span>
                  <Link href={l.href} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[12.5px] text-white/80 hover:border-accent/50 hover:text-white">{l.label} <ArrowRightIcon size={12} /></Link>
                </li>
              );
            })}
          </ol>
          {drive.about && <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/60">{drive.about}</p>}
        </Card>

        <Card className="p-5">
          <p className="text-[15px] font-semibold text-white">Your 7-day plan</p>
          <p className="mt-0.5 text-[12.5px] text-white/50">From the rounds{focus.length ? ` and what ${drive.company} asked your seniors` : ""}</p>
          <ol className="mt-3 space-y-1.5">
            {plan.map((p, k) => (
              <li key={k}>
                <Link href={p.href} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] transition hover:border-accent/40", k === 0 ? "border-accent/40 bg-accent/[0.07] text-white" : "border-white/[0.07] text-white/80")}>
                  <span className={cn("w-11 shrink-0 text-[12px] font-semibold", k === 0 ? "text-accent" : "text-white/45")}>{p.day}</span>
                  <span className="min-w-0 flex-1">{p.text}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card id="asked" className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-white">Asked before at your college</p>
              <p className="mt-0.5 text-[12.5px] text-white/50">Seniors share what {drive.company} asked. Your placement cell checks each one.</p>
            </div>
            <Button size="sm" onClick={() => setShare(true)}><PlusIcon size={13} /> Share yours</Button>
          </div>
          {seen.length ? (
            <div className="mt-4 space-y-3">
              {seen.slice(0, 12).map((e) => <ExpCard key={e.id} e={e} />)}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/12 p-5 text-center text-[13px] text-white/50">No one at {link.name} has shared {drive.company} questions yet. After your rounds, share what was asked: it helps your juniors.</p>
          )}
          {mine.filter((m) => m.status !== "verified").map((m) => (
            <p key={m.id} className="mt-3 text-[12px] text-white/45">Your share for “{m.round}” is {m.status === "pending" ? "waiting for the placement cell to check" : "not approved"}.</p>
          ))}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[15px] font-semibold text-white">Most asked for {drive.company}</p>
            <p className="mt-0.5 text-[12.5px] text-white/50">{seen.length ? `From ${seen.length} checked report${seen.length === 1 ? "" : "s"} at your college` : "Shows up once seniors share their rounds"}</p>
            {counts.length ? (
              <ul className="mt-4 space-y-2.5">
                {counts.slice(0, 7).map(([t, n]) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-[130px] truncate text-[12.5px] text-white/80">{t}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-accent" style={{ width: `${(n / counts[0][1]) * 100}%` }} /></span>
                    <span className="w-16 text-right text-[11.5px] text-white/45">{n} report{n === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] text-white/45">Until then, practise the rounds above.</p>
            )}
          </Card>
          <Card className="p-5">
            <p className="text-[15px] font-semibold text-white">Practise for {drive.company}</p>
            <div className="mt-3 space-y-2">
              {[
                ...(has("test") || !kinds.length ? [{ t: `Aptitude mock for ${drive.company}`, s: focus.length ? `30 min, strict mode, more ${focus.map((f) => TOPIC[f].name.toLowerCase()).slice(0, 2).join(" and ")}` : "30 min, strict mode", href: mockHref }] : []),
                ...(has("coding") ? [{ t: "Coding practice", s: "Problems with hidden tests", href: "/code" }] : []),
                { t: "Technical mock interview", s: `${drive.role} at ${drive.company}`, href: ivHref("technical") },
                ...(has("hr") || has("gd") ? [{ t: "HR mock interview", s: "Why this company, strengths, relocation", href: ivHref("hr") }] : []),
              ].map((p) => (
                <Link key={p.t} href={p.href} className="flex items-center gap-3 rounded-xl border border-white/[0.07] px-3.5 py-3 transition hover:border-accent/40">
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium text-white">{p.t}</span><span className="block text-[12px] text-white/50">{p.s}</span></span>
                  <ArrowRightIcon size={14} className="text-white/35" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <p className="text-[11.5px] text-white/40">Practice questions are StudentOS’s own, in the style of the rounds. “Asked before” comes only from seniors at your college, checked by your placement cell.</p>
      {share && <ShareDialog drive={drive} cid={link.cid} onClose={() => setShare(false)} onDone={(e) => setMine((m) => [e, ...m])} />}
    </div>
  );
}

function ExpCard({ e }: { e: Experience }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-white">{e.round}</p>
        <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 text-[11px] font-medium text-emerald-300">✓ Checked by placement cell</span>
      </div>
      {e.text && <p className="mt-2 text-[13px] leading-relaxed text-white/75">{e.text}</p>}
      {e.questions.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/80">
          {e.questions.map((x, k) => <li key={k}>{x}</li>)}
        </ul>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {e.tags.map((t) => <span key={t} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/60">{t}</span>)}
        <span className="ml-auto text-[11.5px] text-white/40">{e.name ? `${e.name} · ` : ""}{e.by} · {e.result === "selected" ? "Selected" : e.result === "not-selected" ? "Not selected" : "Result awaited"}</span>
      </div>
    </div>
  );
}

function ShareDialog({ drive, cid, onClose, onDone }: { drive: Drive; cid: string; onClose: () => void; onDone: (e: Experience) => void }) {
  const { state, uid, actions } = useStore();
  const p = state.college?.placement;
  const [round, setRound] = useState(drive.rounds[0] ?? "Online test");
  const [text, setText] = useState("");
  const [qs, setQs] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<ExpResult>("waiting");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const by = [p?.branch, p?.batch ? `${p.batch} batch` : ""].filter(Boolean).join(" · ") || "Student";
  const save = async () => {
    if (!uid) return;
    if (!text.trim() && !qs.trim()) return actions.toast("Write what was asked.");
    setBusy(true);
    try {
      const e = await shareExperience(cid, {
        companyName: drive.company,
        role: drive.role,
        driveId: drive.id,
        round,
        text: text.trim().slice(0, 1500),
        questions: qs.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 15).map((x) => x.slice(0, 300)),
        tags,
        result,
        uid,
        by,
        ...(showName && state.profile.name ? { name: state.profile.name } : {}),
      });
      onDone(e);
      actions.toast("Thanks! Your placement cell will check it before juniors see it.");
      onClose();
    } catch {
      actions.toast("Couldn’t share. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sh-title" className="w-full max-w-[600px]" onClick={(e) => e.stopPropagation()}>
        <Card glow className="p-6">
          <div className="flex items-center justify-between">
            <p id="sh-title" className="text-[17px] font-semibold text-white">What did {drive.company} ask?</p>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">Only what you remember. Your placement cell checks it, then juniors preparing for {drive.company} see it.</p>
          <label className="mt-4 block text-[12.5px] font-medium text-white/75" htmlFor="sh-round">Round</label>
          <select id="sh-round" value={round} onChange={(e) => setRound(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-field px-3 text-[13.5px] text-white">
            {[...drive.rounds, "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="mt-3 block text-[12.5px] font-medium text-white/75" htmlFor="sh-text">How it went</label>
          <textarea id="sh-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="e.g. 20 aptitude questions in 30 minutes, mostly percentages and series. Then 2 coding problems." className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-accent" />
          <label className="mt-3 block text-[12.5px] font-medium text-white/75" htmlFor="sh-qs">Questions you remember (one per line)</label>
          <textarea id="sh-qs" value={qs} onChange={(e) => setQs(e.target.value)} rows={4} placeholder={"Reverse the words in a sentence\nDifference between process and thread"} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-accent" />
          <p className="mt-3 text-[12.5px] font-medium text-white/75">Topics</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TAGS.map(({ tag }) => (
              <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]))} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", tags.includes(tag) ? "border-accent bg-accent/15 text-white" : "border-white/10 text-white/55 hover:border-white/25")}>{tag}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div role="radiogroup" aria-label="Result" className="inline-flex rounded-lg border border-white/10 p-0.5">
              {([["waiting", "Result awaited"], ["selected", "Selected"], ["not-selected", "Not selected"]] as const).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={result === k} onClick={() => setResult(k)} className={cn("h-8 rounded-md px-3 text-[12.5px]", result === k ? "bg-[var(--color-plum)] text-white" : "text-white/55")}>{l}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-white/65"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="h-4 w-4 accent-[#a78bfa]" /> Show my name (else “{by}”)</label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void save()}>Share</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

