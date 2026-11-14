"use client";

/* Student side of campus placements: drives your college posted, apply in one
   click with your StudentOS resume, follow every round, open test / interview
   links sent only to you, and see and answer your offer. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BellIcon, BriefcaseIcon, CheckIcon, ClockIcon, FileIcon, LockIcon, MailIcon, PencilIcon, SendIcon, TrophyIcon } from "@/components/ui/icons";
import { Input, Label } from "@/components/ui/primitives";
import { BRANCHES, currentLinks, effective, closed, ineligible, loadDrives, myApp, newApplication, saveApp, stageLabel, type Application, type Drive, type PlacementProfile } from "@/lib/placement";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/notify";
import { useStore } from "@/lib/store";
import { collegeInfo } from "@/lib/college";
import { CollegeLogo } from "@/components/college/college-logo";
import { cn } from "@/lib/utils";

const fmtDate = (s: string) => (s ? new Date(s + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const daysLeft = (s: string) => Math.ceil((new Date(s + "T23:59:59").getTime() - Date.now()) / 86400000);

function ProfileForm({ initial, onSave, onCancel }: { initial?: PlacementProfile; onSave: (p: PlacementProfile) => void; onCancel?: () => void }) {
  const [p, setP] = useState<PlacementProfile>(initial ?? { branch: "", cgpa: 0, backlogs: 0, batch: "" });
  const [err, setErr] = useState("");
  const save = () => {
    if (!p.branch) return setErr("Choose your branch.");
    if (!(p.cgpa > 0 && p.cgpa <= 10)) return setErr("Write your CGPA out of 10.");
    if (!/^20\d\d$/.test(p.batch)) return setErr("Write your passing-out year, e.g. 2027.");
    onSave(p);
  };
  return (
    <div className="rounded-2xl border border-accent/30 bg-[#0f0f11] p-5 shadow-[0_0_40px_-20px_rgba(167,139,250,0.7)]">
      <p className="text-[15px] font-semibold text-white">Your placement details</p>
      <p className="mt-1 text-[12.5px] text-white/55">Companies set rules on these. Your college sees them with your applications. Fill them honestly; the college checks them.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="br">Branch / course</Label>
          <select id="br" value={p.branch} onChange={(e) => setP({ ...p, branch: e.target.value })} className="h-10 w-full rounded-xl border border-white/10 bg-[#121216] px-3 text-[13.5px] text-white outline-none focus:border-accent">
            <option value="">Choose</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div><Label htmlFor="cg">CGPA</Label><Input id="cg" type="number" step="0.01" min={0} max={10} value={p.cgpa || ""} onChange={(e) => setP({ ...p, cgpa: Number(e.target.value) || 0 })} placeholder="e.g. 7.8" /></div>
        <div><Label htmlFor="bl">Backlogs</Label><Input id="bl" type="number" min={0} value={p.backlogs} onChange={(e) => setP({ ...p, backlogs: Math.max(0, Number(e.target.value) || 0) })} /></div>
        <div><Label htmlFor="ba">Passing-out year</Label><Input id="ba" value={p.batch} onChange={(e) => setP({ ...p, batch: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2027" /></div>
      </div>
      {err && <p className="mt-3 text-[12.5px] text-rose-300">{err}</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="primary" size="sm" onClick={save}>Save</Button>
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}

function Steps({ a: a0, d }: { a: Application; d: Drive }) {
  const a = effective(a0);
  const stages = ["Applied", ...d.rounds, "Selected"];
  const at = a.status === "applied" ? 0 : a.status === "selected" ? stages.length - 1 : a.round + 1;
  return (
    <ol className="mt-4 flex items-center">
      {stages.map((s, i) => {
        const done = i < at || (i === at && a.status === "selected");
        const cur = i === at && a.status !== "selected";
        const fail = a.status === "rejected" && i === at;
        return (
          <li key={s + i} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1.5">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold", fail ? "bg-rose-500/20 text-rose-300" : done ? "bg-emerald-400 text-[#06281d]" : cur ? "bg-accent text-[#120826] shadow-[0_0_0_4px_rgba(167,139,250,0.25)]" : "bg-white/[0.07] text-white/40")}>{done ? <CheckIcon size={12} /> : i + 1}</span>
              <span className={cn("max-w-[86px] text-center text-[10.5px] leading-tight", cur || done ? "text-white/80" : "text-white/40")}>{s}</span>
            </span>
            {i < stages.length - 1 && <span className={cn("mx-1 mb-5 h-0.5 flex-1 rounded-full", i < at ? "bg-emerald-400/60" : "bg-white/[0.08]")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* Placement alerts: email (on by default) and phone / laptop notifications (opt-in). */
function PlacementAlerts() {
  const { state, actions, uid } = useStore();
  const link = state.college!;
  const [push, setPush] = useState<PushState | "busy" | null>(null);
  useEffect(() => {
    if (uid) void pushState(uid).then(setPush);
  }, [uid]);
  const emailOn = link.notifyEmail !== false;
  const togglePush = async () => {
    if (!uid || push === "busy") return;
    const was = push;
    setPush("busy");
    try {
      const next = was === "on" ? await disablePush(uid) : await enablePush(uid);
      setPush(next);
      if (next === "on") actions.toast("Notifications are on for this device.");
      if (next === "blocked") actions.toast("Notifications are blocked. Allow them for this site in your browser settings.");
    } catch (e) {
      setPush(was);
      const msg = `${(e as { code?: string })?.code ?? ""} ${e instanceof Error ? e.message : String(e)}`;
      const brave = (navigator as Navigator & { brave?: unknown }).brave;
      if (/push service|AbortError|token-subscribe|registration failed/i.test(msg))
        actions.toast(brave ? "Brave blocks this. Open brave://settings/privacy, turn on “Use Google services for push messaging”, restart Brave and try again." : "Your browser’s push service refused. Try Chrome, or check that notifications aren’t blocked for this site.");
      else if (/permission-denied|insufficient permissions/i.test(msg)) actions.toast("Notifications aren’t ready on the server yet (Firestore rules). Ask your admin to publish the latest rules.");
      else if (/API key|401|403|authentication/i.test(msg)) actions.toast("Firebase refused the request. Check the Firebase API key restrictions allow this site.");
      else actions.toast(`Couldn’t turn on notifications (${msg.trim().slice(0, 80) || "unknown error"}).`);
    }
  };
  const sw = (on: boolean) => (
    <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-accent" : "bg-white/15")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/[0.08] bg-[#0f0f11] px-4 py-3">
      <p className="mr-auto text-[13px] font-medium text-white">
        Placement alerts
        <span className="block text-[11.5px] font-normal text-white/45">New drives you can apply to, test links, rounds and offers.</span>
      </p>
      <button type="button" role="switch" aria-checked={emailOn} onClick={() => actions.patch({ college: { ...link, notifyEmail: !emailOn } })} className="flex items-center gap-2 text-[12.5px] text-white/75">
        <MailIcon size={14} className="text-white/45" /> Email {state.profile.email ? <span className="text-white/35">({state.profile.email})</span> : null} {sw(emailOn)}
      </button>
      {push && push !== "unsupported" && (
        <button type="button" role="switch" aria-checked={push === "on"} disabled={push === "busy" || push === "blocked"} onClick={() => void togglePush()} className="flex items-center gap-2 text-[12.5px] text-white/75 disabled:opacity-60" title={push === "blocked" ? "Blocked in your browser settings" : undefined}>
          <BellIcon size={14} className="text-white/45" /> {push === "blocked" ? "Notifications blocked" : "Notifications on this device"} {sw(push === "on")}
        </button>
      )}
    </div>
  );
}

export function CampusDrives() {
  const { state, actions, uid } = useStore();
  const link = state.college!;
  const profile = link.placement;
  const [drives, setDrives] = useState<Drive[]>([]);
  const [apps, setApps] = useState<Record<string, Application | null>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [busy, setBusy] = useState("");
  const bestIv = Math.max(0, ...(state.interviews ?? []).filter((h) => h.kind !== "coding").map((h) => h.feedback.overall));
  const [logo, setLogo] = useState<string | undefined>();
  useEffect(() => {
    void collegeInfo(link.cid).then((c) => setLogo(c?.logo || undefined));
  }, [link.cid]);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const run = async () => {
      try {
        const ds = await loadDrives(link.cid);
        const mine = await Promise.all(ds.map((d) => myApp(link.cid, d.id, uid).then((a) => [d.id, a] as const)));
        if (!live) return;
        setDrives(ds);
        setApps(Object.fromEntries(mine));
      } catch {
        if (live) setErr("Couldn’t load your college’s drives. Check your internet and refresh.");
      } finally {
        if (live) setLoading(false);
      }
    };
    void run();
    // keep rounds, links and offers fresh: when the tab comes back and every minute
    const onFocus = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onFocus);
    const t = setInterval(onFocus, 60000);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(t);
    };
  }, [link.cid, uid]);

  const saveProfile = (p: PlacementProfile) => {
    actions.patch({ college: { ...link, placement: p } });
    setEditing(false);
    actions.toast("Placement details saved.");
  };
  const apply = async (d: Drive) => {
    if (!uid || !profile) return;
    setBusy(d.id);
    try {
      const a = newApplication(state, uid, profile, link.section);
      await saveApp(link.cid, d.id, a);
      setApps((x) => ({ ...x, [d.id]: a }));
      actions.toast(`Applied to ${d.company}. Your college will update you here.`);
    } catch {
      actions.toast("Couldn’t apply. Try again.");
    } finally {
      setBusy("");
    }
  };
  const decide = async (d: Drive, a: Application, decision: "accepted" | "declined") => {
    if (decision === "declined" && !window.confirm(`Decline the offer from ${d.company}? Your college will see this.`)) return;
    const next = { ...a, decision, decidedAt: Date.now(), updatedAt: Date.now() };
    try {
      await saveApp(link.cid, d.id, next);
      setApps((x) => ({ ...x, [d.id]: next }));
      actions.toast(decision === "accepted" ? `Congratulations! You accepted ${d.company}’s offer.` : "Offer declined.");
    } catch {
      actions.toast("Couldn’t save. Try again.");
    }
  };

  const openDrives = useMemo(() => drives.filter((d) => !apps[d.id] && !closed(d)), [drives, apps]);
  const mine = useMemo(() => drives.filter((d) => apps[d.id]), [drives, apps]);
  const offers = mine.filter((d) => apps[d.id]?.offer);
  const newLinks = mine.reduce((n, d) => n + (apps[d.id] ? currentLinks(apps[d.id]!).filter((l) => Date.now() - l.at < 3 * 86400000).length : 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-accent uppercase">Campus placements</p>
          <h1 className="mt-1 flex items-center gap-3 text-[26px] font-semibold tracking-tight text-white">
            <CollegeLogo name={link.name} logo={logo} size={40} />
            {link.name}
          </h1>
          <p className="mt-1 text-[13px] text-white/55">Drives your placement cell posted. Only you and your college see your applications.</p>
        </div>
        <div className="flex gap-2">
          {[["Open for you", openDrives.filter((d) => !ineligible(d, profile)).length], ["Applied", mine.length], ["Offers", offers.length]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-white/[0.08] bg-[#0f0f11] px-4 py-2.5 text-center">
              <p className="text-[20px] font-semibold text-white tabular-nums">{v}</p>
              <p className="text-[11px] text-white/45">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <PlacementAlerts />

      {(!profile || editing) && <ProfileForm initial={profile} onSave={saveProfile} onCancel={profile ? () => setEditing(false) : undefined} />}
      {profile && !editing && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-white/55">
          <span className="rounded-lg bg-white/[0.05] px-2.5 py-1">{profile.branch}</span>
          <span className="rounded-lg bg-white/[0.05] px-2.5 py-1">CGPA {profile.cgpa}</span>
          <span className="rounded-lg bg-white/[0.05] px-2.5 py-1">{profile.backlogs} backlogs</span>
          <span className="rounded-lg bg-white/[0.05] px-2.5 py-1">{profile.batch} batch</span>
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-accent hover:underline"><PencilIcon size={12} /> Edit</button>
          <Link href="/resume" className="ml-auto inline-flex items-center gap-1 text-white/55 hover:text-white"><FileIcon size={13} /> Your resume goes with every application</Link>
        </p>
      )}

      {newLinks > 0 && (
        <button type="button" onClick={() => setTab("mine")} className="flex w-full items-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.06] px-4 py-3 text-left">
          <SendIcon size={16} className="text-cyan-300" />
          <span className="text-[13px] text-white">You have {newLinks} new test / interview link{newLinks > 1 ? "s" : ""} from your college.</span>
          <span className="ml-auto text-[12.5px] text-cyan-300">Open →</span>
        </button>
      )}

      <div className="flex gap-1.5">
        {([["open", `Open drives (${openDrives.length})`], ["mine", `My applications (${mine.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-9 rounded-lg border px-3.5 text-[13px]", tab === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
      ) : err ? (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300">{err}</p>
      ) : tab === "open" ? (
        openDrives.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {openDrives.map((d) => {
              const why = ineligible(d, profile) ?? (d.partner?.minInterview && bestIv < d.partner.minInterview ? `Needs a StudentOS mock interview score of ${d.partner.minInterview}+ (yours: ${bestIv || "none yet"})` : null);
              const left = daysLeft(d.deadline);
              return (
                <div key={d.id} className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-[16px] font-bold text-white">{d.company.slice(0, 1)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15.5px] font-semibold text-white">{d.company}</p>
                      <p className="text-[12.5px] text-white/55">{d.role} · {d.kind}{d.location ? ` · ${d.location}` : ""}</p>
                      {d.partner && <span className="mt-1 inline-block rounded-full bg-cyan-400/12 px-2 py-0.5 text-[10.5px] font-semibold text-cyan-200">via StudentOS</span>}
                    </div>
                    <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]", left <= 2 ? "bg-amber-400/15 text-amber-200" : "bg-white/[0.06] text-white/60")}><ClockIcon size={11} /> {left <= 0 ? "Last day" : `${left} day${left > 1 ? "s" : ""} left`}</span>
                  </div>
                  <p className="mt-4 text-[20px] font-semibold text-white">{d.ctc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] text-white/60">
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5">{d.elig.branches.length ? d.elig.branches.join(", ") : "All branches"}</span>
                    {!!d.elig.minCgpa && <span className="rounded-md bg-white/[0.05] px-2 py-0.5">CGPA {d.elig.minCgpa}+</span>}
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5">{d.elig.maxBacklogs ? `≤ ${d.elig.maxBacklogs} backlogs` : "No backlogs"}</span>
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5">{d.rounds.join(" → ")}</span>
                  </div>
                  {d.about && <p className="mt-3 line-clamp-2 text-[12.5px] text-white/55">{d.about}</p>}
                  {d.partner && !why && <p className="mt-3 text-[11.5px] text-white/45">Brought by StudentOS, approved by your college. When you apply, {d.company} sees your application, resume and StudentOS interview scores.</p>}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-white/45">Apply by {fmtDate(d.deadline)}</span>
                    {why ? (
                      <span className="flex items-center gap-1.5 text-[12px] text-white/50"><LockIcon size={12} /> {why}</span>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => void apply(d)} loading={busy === d.id}>Apply with my resume</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <BriefcaseIcon size={26} className="mx-auto text-white/35" />
            <p className="mt-3 text-[13.5px] text-white/60">No open drives right now. When your college adds one, it shows up here.</p>
          </div>
        )
      ) : mine.length ? (
        <div className="space-y-4">
          {mine.map((d) => {
            const a = apps[d.id]!;
            return (
              <div key={d.id} className={cn("rounded-2xl border bg-[#0f0f11] p-5", a.offer ? "border-emerald-400/30 shadow-[0_0_50px_-24px_rgba(16,185,129,0.8)]" : "border-white/[0.08]")}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-[16px] font-bold text-white">{d.company.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-semibold text-white">{d.company} · {d.role}</p>
                    <p className="text-[12.5px] text-white/55">{d.ctc} · applied {new Date(a.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                  <span className={cn("rounded-md px-2.5 py-1 text-[12px] font-medium", a.status === "selected" ? "bg-emerald-400/15 text-emerald-300" : a.status === "rejected" ? "bg-white/[0.06] text-white/50" : effective(a).status === "in-process" ? "bg-violet-400/15 text-violet-200" : "bg-cyan-400/10 text-cyan-200")}>{stageLabel(a, d)}</span>
                </div>
                <Steps a={a} d={d} />

                {currentLinks(a).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {[...currentLinks(a)].reverse().map((l) => (
                      <a key={l.at + l.title} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.05] px-4 py-3 hover:border-cyan-300/50">
                        <SendIcon size={15} className="text-cyan-300" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-white">{l.title}</span>
                          <span className="block text-[12px] text-white/50">{l.when ? `${l.when} · ` : ""}sent {new Date(l.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                        </span>
                        <span className="text-[12.5px] text-cyan-300">Open →</span>
                      </a>
                    ))}
                  </div>
                )}

                {a.offer && (
                  <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-emerald-300"><TrophyIcon size={16} /> Offer from {d.company}</p>
                    <p className="mt-1.5 text-[13px] text-white/80">{a.offer.ctc}{a.offer.joining ? ` · joining ${a.offer.joining}` : ""}{a.offer.note ? ` · ${a.offer.note}` : ""}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {a.offer.url && <a href={a.offer.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[12.5px] text-white hover:border-white/30"><FileIcon size={13} /> View offer letter</a>}
                      {a.decision ? (
                        <span className={cn("text-[12.5px] font-medium", a.decision === "accepted" ? "text-emerald-300" : "text-white/55")}>You {a.decision} this offer</span>
                      ) : (
                        <>
                          <Button size="sm" variant="primary" onClick={() => void decide(d, a, "accepted")}>Accept offer</Button>
                          <Button size="sm" variant="ghost" onClick={() => void decide(d, a, "declined")}>Decline</Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-[13.5px] text-white/60">You haven’t applied to any drive yet.</p>
      )}
    </div>
  );
}

/** Shown on the Placement page to students who haven't joined a college. */
export function JoinForDrives() {
  return (
    <Link href="/join" className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-[var(--color-plum)]/40 px-5 py-4 transition hover:border-accent/60">
      <BriefcaseIcon size={20} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-white">Does your college use StudentOS for placements?</span>
        <span className="block text-[12.5px] text-white/60">Join with your college code to see campus drives, apply and get your test links and offers here.</span>
      </span>
      <span className="text-[13px] text-accent">Join →</span>
    </Link>
  );
}
