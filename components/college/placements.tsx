"use client";

/* College side of campus placements: post drives, see who applied, move
   students through rounds, send assessment / interview links only to the
   students picked, and add offers. */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, BriefcaseIcon, CheckIcon, DownloadIcon, PlusIcon, SendIcon, TrophyIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import type { College } from "@/lib/college";
import { BRANCHES, effective, closed, loadApps, loadDrives, placementStats, sampleDrives, saveApp, saveDrive, stageLabel, type Application, type Drive, type DriveKind } from "@/lib/placement";
import { notifyPlacement, notifySummary, type NotifyEvent } from "@/lib/notify";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Tilt } from "./skyline-3d";

const fmtDate = (s: string) => (s ? new Date(s + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5", className)}>{children}</section>;
}

/** A 3D funnel: one glowing layer per stage, width = students at that stage. */
export function Funnel3D({ steps }: { steps: { label: string; n: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.n));
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative py-2">
      <div style={{ transform: "rotateX(52deg)", transformStyle: "preserve-3d" }} className="mr-[150px] flex flex-col items-center gap-3">
        {steps.map((s, i) => {
          const w = 18 + (s.n / max) * 82;
          const hue = i === steps.length - 1 ? "16,185,129" : `${124 + i * 8},${58 + i * 22},237`;
          return (
            <div key={s.label} className="relative h-12 rounded-[50%]" style={{ width: on ? `${w}%` : "10%", transition: `width 900ms cubic-bezier(.2,.8,.2,1) ${i * 90}ms`, background: `radial-gradient(ellipse at 50% 40%, rgba(${hue},0.95), rgba(${hue},0.45) 70%)`, boxShadow: `0 10px 0 rgba(${hue},0.35), 0 20px 40px -10px rgba(${hue},0.6)`, transform: `translateY(${i * -2}px)` }} />
          );
        })}
      </div>
      <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-[13px] text-right">
        {steps.map((s) => (
          <p key={s.label} className="text-[12px] text-white/60"><b className="text-[15px] text-white tabular-nums">{s.n}</b> {s.label}</p>
        ))}
      </div>
    </div>
  );
}

export function Placements({ college, uid, sample, canEdit }: { college: College; uid: string | null; sample: boolean; canEdit: boolean }) {
  const { actions } = useStore();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [apps, setApps] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Drive | null>(null);

  const load = async () => {
    if (sample) {
      const s = sampleDrives();
      setDrives(s.drives);
      setApps(s.apps);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ds = await loadDrives(college.id);
      const all = await Promise.all(ds.map((d) => loadApps(college.id, d.id).then((a) => [d.id, a] as const)));
      setDrives(ds);
      setApps(Object.fromEntries(all));
    } catch {
      actions.toast("Couldn’t load placements. Check your internet.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setOpen(null);
    void load();
  }, [sample, college.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => placementStats(drives, apps), [drives, apps]);
  const drive = drives.find((d) => d.id === open);

  const blank = (): Drive => ({ id: `d${Date.now().toString(36)}`, company: "", role: "", kind: "Full-time", ctc: "", location: "", about: "", rounds: ["Online test", "Technical interview", "HR interview"], elig: { branches: [], minCgpa: 0, maxBacklogs: 0, batch: "" }, deadline: "", open: true, createdAt: Date.now(), createdBy: uid ?? "" });
  const save = async (d: Drive) => {
    if (sample) {
      setDrives((x) => [d, ...x.filter((y) => y.id !== d.id)]);
      setForm(null);
      return actions.toast("Sample data: not saved.");
    }
    try {
      const isNew = !drives.some((y) => y.id === d.id);
      await saveDrive(college.id, d);
      setDrives((x) => [d, ...x.filter((y) => y.id !== d.id)].sort((a, b) => b.createdAt - a.createdAt));
      setForm(null);
      actions.toast(`${d.company} drive is live for eligible students.`);
      if (isNew && d.open) {
        const told = notifySummary(await notifyPlacement(college.id, d.id, "new-drive"));
        if (told) actions.toast(`Eligible students told: ${told}.`);
      }
    } catch {
      actions.toast("Couldn’t save the drive. Try again.");
    }
  };

  if (loading) return <div className="h-[420px] animate-pulse rounded-2xl bg-white/[0.04]" />;
  if (form) return <DriveForm initial={form} onCancel={() => setForm(null)} onSave={save} />;
  if (drive)
    return (
      <DriveDetail
        college={college}
        drive={drive}
        apps={apps[drive.id] ?? []}
        sample={sample}
        canEdit={canEdit}
        back={() => setOpen(null)}
        edit={() => setForm(drive)}
        setDrive={(d) => void save(d)}
        setApps={(list) => setApps((x) => ({ ...x, [drive.id]: list }))}
      />
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Open drives", stats.open, `${stats.drives} in total`],
          ["Applications", stats.applications, "from your students"],
          ["Offers", stats.offers, "added by your team"],
          ["Students placed", stats.placed, "with an offer"],
        ].map(([l, v, s]) => (
          <Tilt key={l as string}>
            <div className="p-5">
              <p className="text-[12px] text-white/50">{l}</p>
              <p className="mt-2 text-[30px] leading-none font-semibold text-white tabular-nums">{v}</p>
              <p className="mt-2 text-[12px] text-white/50">{s}</p>
            </div>
          </Tilt>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Drives</h2>
        {canEdit ? <Button variant="primary" size="sm" icon={<PlusIcon size={14} />} onClick={() => setForm(blank())}>New drive</Button> : <ReadOnly />}
      </div>
      {drives.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drives.map((d) => {
            const list = apps[d.id] ?? [];
            const sel = list.filter((a) => a.status === "selected").length;
            const isClosed = closed(d);
            return (
              <button key={d.id} type="button" onClick={() => setOpen(d.id)} className="text-left">
                <Tilt>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-[15px] font-bold text-white">{d.company.slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-white">{d.company}</p>
                        <p className="truncate text-[12.5px] text-white/55">{d.role} · {d.kind}</p>
                      </div>
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", isClosed ? "bg-white/[0.06] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{isClosed ? "Closed" : "Open"}</span>
                    </div>
                    <p className="mt-4 text-[20px] font-semibold text-white">{d.ctc || "—"}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[["Applied", list.length], ["In rounds", list.filter((a) => a.status === "in-process").length], ["Selected", sel]].map(([l, v]) => (
                        <div key={l as string} className="rounded-lg bg-white/[0.03] py-2">
                          <p className="text-[16px] font-semibold text-white tabular-nums">{v}</p>
                          <p className="text-[10.5px] text-white/45">{l}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11.5px] text-white/45">Apply by {fmtDate(d.deadline)} · {d.rounds.length} rounds</p>
                  </div>
                </Tilt>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <BriefcaseIcon size={26} className="mx-auto text-white/35" />
          <p className="mx-auto mt-3 max-w-md text-[13.5px] text-white/60">{canEdit ? "No drives yet. Add the first company coming to campus; eligible students see it in their Placement page straight away." : "No drives yet. Your placement coordinator adds them here."}</p>
          {canEdit && <Button variant="primary" size="sm" className="mt-4" onClick={() => setForm(blank())}>Add a drive</Button>}
        </div>
      )}
    </div>
  );
}

function ReadOnly() {
  return <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] text-white/55">View only · the placement coordinator makes changes</span>;
}

/* ---------------- new / edit drive ---------------- */

function DriveForm({ initial, onSave, onCancel }: { initial: Drive; onSave: (d: Drive) => void; onCancel: () => void }) {
  const [d, setD] = useState<Drive>(initial);
  const [rounds, setRounds] = useState(initial.rounds.join("\n"));
  const [err, setErr] = useState("");
  const set = (p: Partial<Drive>) => setD((x) => ({ ...x, ...p }));
  const setE = (p: Partial<Drive["elig"]>) => setD((x) => ({ ...x, elig: { ...x.elig, ...p } }));
  const submit = () => {
    const rs = rounds.split("\n").map((r) => r.trim()).filter(Boolean).slice(0, 6);
    if (!d.company.trim() || !d.role.trim()) return setErr("Add the company and the role.");
    if (!d.deadline) return setErr("Add the last date to apply.");
    if (!rs.length) return setErr("Add at least one round.");
    onSave({ ...d, company: d.company.trim(), role: d.role.trim(), rounds: rs });
  };
  return (
    <div className="mx-auto max-w-[820px]">
      <button type="button" onClick={onCancel} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><ArrowLeftIcon size={13} /> Drives</button>
      <Card className="p-6">
        <h2 className="text-[18px] font-semibold text-white">{initial.company ? "Edit drive" : "New drive"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="co">Company</Label><Input id="co" value={d.company} onChange={(e) => set({ company: e.target.value })} placeholder="e.g. Infosys" /></div>
          <div><Label htmlFor="ro">Role</Label><Input id="ro" value={d.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Systems Engineer" /></div>
          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {(["Full-time", "Internship", "Internship + PPO"] as DriveKind[]).map((k) => (
                <button key={k} type="button" onClick={() => set({ kind: k })} className={cn("h-9 rounded-lg border px-3 text-[12.5px]", d.kind === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>{k}</button>
              ))}
            </div>
          </div>
          <div><Label htmlFor="ct">Package / stipend</Label><Input id="ct" value={d.ctc} onChange={(e) => set({ ctc: e.target.value })} placeholder="e.g. ₹4.5 LPA" /></div>
          <div><Label htmlFor="lo">Location</Label><Input id="lo" value={d.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Bengaluru / Remote" /></div>
          <div><Label htmlFor="dl">Last date to apply</Label><Input id="dl" type="date" value={d.deadline} onChange={(e) => set({ deadline: e.target.value })} /></div>
        </div>

        <p className="mt-6 text-[13.5px] font-semibold text-white">Who can apply</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setE({ branches: [] })} className={cn("h-8 rounded-lg border px-2.5 text-[12px]", !d.elig.branches.length ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>All branches</button>
          {BRANCHES.map((b) => {
            const on = d.elig.branches.includes(b);
            return (
              <button key={b} type="button" onClick={() => setE({ branches: on ? d.elig.branches.filter((x) => x !== b) : [...d.elig.branches, b] })} className={cn("h-8 rounded-lg border px-2.5 text-[12px]", on ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>{b}</button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="cg">Minimum CGPA</Label><Input id="cg" type="number" step="0.1" min={0} max={10} value={d.elig.minCgpa || ""} onChange={(e) => setE({ minCgpa: Number(e.target.value) || 0 })} placeholder="e.g. 6.5" /></div>
          <div><Label htmlFor="bl">Backlogs allowed</Label><Input id="bl" type="number" min={0} value={d.elig.maxBacklogs} onChange={(e) => setE({ maxBacklogs: Math.max(0, Number(e.target.value) || 0) })} /></div>
          <div><Label htmlFor="ba">Passing-out year</Label><Input id="ba" value={d.elig.batch} onChange={(e) => setE({ batch: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="e.g. 2027 (blank = any)" /></div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="rs" hint="One per line, in order">Rounds</Label><Textarea id="rs" rows={4} value={rounds} onChange={(e) => setRounds(e.target.value)} /></div>
          <div><Label htmlFor="ab" hint="Optional">About the role</Label><Textarea id="ab" rows={4} value={d.about} onChange={(e) => set({ about: e.target.value })} placeholder="What the job is, skills needed, bond, documents to carry…" /></div>
        </div>
        {err && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={submit}>{initial.company ? "Save drive" : "Post drive"}</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- one drive ---------------- */

type Filter = "all" | "applied" | `r${number}` | "selected" | "rejected";

function DriveDetail({ college, drive, apps: rawApps, sample, canEdit, back, edit, setDrive, setApps }: { college: College; drive: Drive; apps: Application[]; sample: boolean; canEdit: boolean; back: () => void; edit: () => void; setDrive: (d: Drive) => void; setApps: (a: Application[]) => void }) {
  const { actions } = useStore();
  const apps = useMemo(() => rawApps.map(effective), [rawApps]);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | "link" | "offer">(null);
  const [link, setLink] = useState({ title: "", url: "", when: "" });
  const [offer, setOffer] = useState({ ctc: drive.ctc, joining: "", url: "", note: "" });
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [tell, setTell] = useState(true);

  const steps = [{ label: "applied", n: apps.length }, ...drive.rounds.map((r, i) => ({ label: r.toLowerCase(), n: apps.filter((a) => (a.status === "in-process" && a.round >= i) || (a.status === "selected")).length })), { label: "selected", n: apps.filter((a) => a.status === "selected").length }];
  const list = apps.filter((a) => (filter === "all" ? true : filter === "applied" ? a.status === "applied" : filter === "selected" ? a.status === "selected" : filter === "rejected" ? a.status === "rejected" : a.status === "in-process" && a.round === Number(filter.slice(1))));
  const chosen = apps.filter((a) => picked.has(a.uid));

  const update = async (fn: (a: Application) => Application, msg: string, event?: NotifyEvent) => {
    const next = apps.map((a) => (picked.has(a.uid) ? { ...fn(a), updatedAt: Date.now() } : a));
    const who = [...picked];
    if (!sample) {
      try {
        await Promise.all(next.filter((a) => picked.has(a.uid)).map((a) => saveApp(college.id, drive.id, a)));
      } catch {
        return actions.toast("Couldn’t update. Try again.");
      }
    }
    setApps(next);
    setPicked(new Set());
    actions.toast(sample ? "Sample data: not saved." : msg);
    if (!sample && event && tell) {
      const told = notifySummary(await notifyPlacement(college.id, drive.id, event, who));
      if (told) actions.toast(`Students told: ${told}.`);
    }
  };
  const advance = () =>
    update((a) => {
      if (a.status === "applied") return { ...a, status: "in-process", round: 0 };
      if (a.status === "in-process" && a.round < drive.rounds.length - 1) return { ...a, round: a.round + 1 };
      if (a.status === "in-process") return { ...a, status: "selected" };
      return a;
    }, `${picked.size} moved to the next round`, "advance");
  const reject = () => update((a) => ({ ...a, status: "rejected" }), `${picked.size} marked not selected`, "rejected");
  const select = () => update((a) => ({ ...a, status: "selected" }), `${picked.size} marked selected`, "selected");
  const sendLink = () => {
    if (!link.title.trim() || !/^https?:\/\//.test(link.url.trim())) return actions.toast("Add a title and a link starting with https://");
    setModal(null);
    // sending a test / interview link to a new applicant means they are shortlisted for the first round
    void update((a) => {
      const b: Application = a.status === "applied" ? { ...a, status: "in-process", round: 0 } : a;
      return { ...b, links: [...b.links, { title: link.title.trim(), url: link.url.trim(), when: link.when.trim(), at: Date.now(), round: b.round }] };
    }, `Link sent to ${picked.size} student${picked.size > 1 ? "s" : ""}`, "link");
    setLink({ title: "", url: "", when: "" });
  };
  const addOffer = () => {
    if (!offer.ctc.trim()) return actions.toast("Add the package.");
    if (offer.url && !/^https?:\/\//.test(offer.url.trim())) return actions.toast("The offer letter link must start with https://");
    setModal(null);
    void update((a) => ({ ...a, status: "selected", offer: { ctc: offer.ctc.trim(), joining: offer.joining.trim(), url: offer.url.trim(), note: offer.note.trim(), at: Date.now() } }), `Offer added for ${picked.size} student${picked.size > 1 ? "s" : ""}`, "offer");
  };
  const csv = () => {
    const rows = [["Name", "Branch", "Section", "CGPA", "Backlogs", "Batch", "Stage", "Offer", "Decision", "Email"], ...apps.map((a) => [a.name, a.branch, a.section, a.cgpa, a.backlogs, a.batch, stageLabel(a, drive), a.offer?.ctc ?? "", a.decision ?? "", a.email])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: u, download: `${drive.company} ${drive.role} applicants.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const toggleAll = () => setPicked(picked.size === list.length ? new Set() : new Set(list.map((a) => a.uid)));
  const isClosed = closed(drive);

  return (
    <div className="space-y-5">
      <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><ArrowLeftIcon size={13} /> All drives</button>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-[22px] font-bold text-white">{drive.company.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-semibold text-white">{drive.company}</p>
              <p className="text-[13px] text-white/60">{drive.role} · {drive.kind}{drive.location ? ` · ${drive.location}` : ""}</p>
              <p className="mt-2 text-[22px] font-semibold text-white">{drive.ctc}</p>
            </div>
            {canEdit ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={edit}>Edit</Button>
                <Button size="sm" onClick={() => setDrive({ ...drive, open: !drive.open })}>{drive.open ? "Close applications" : "Reopen"}</Button>
              </div>
            ) : (
              <ReadOnly />
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-white/70">{drive.elig.branches.length ? drive.elig.branches.join(", ") : "All branches"}</span>
            {!!drive.elig.minCgpa && <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-white/70">CGPA {drive.elig.minCgpa}+</span>}
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-white/70">{drive.elig.maxBacklogs ? `≤ ${drive.elig.maxBacklogs} backlogs` : "No backlogs"}</span>
            {drive.elig.batch && <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-white/70">{drive.elig.batch} batch</span>}
            <span className={cn("rounded-lg px-2.5 py-1", isClosed ? "bg-white/[0.05] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{isClosed ? "Applications closed" : `Apply by ${fmtDate(drive.deadline)}`}</span>
          </div>
          <ol className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-white/60">
            {drive.rounds.map((r, i) => (
              <li key={r} className="flex items-center gap-2"><span className="rounded-lg border border-white/10 px-2.5 py-1">{i + 1}. {r}</span>{i < drive.rounds.length - 1 && <span className="text-white/25">→</span>}</li>
            ))}
          </ol>
          {drive.about && <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">{drive.about}</p>}
        </Card>
        <Card>
          <p className="text-[13.5px] font-semibold text-white">Hiring funnel</p>
          <Funnel3D steps={steps} />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          {([["all", `All ${apps.length}`], ["applied", "New"], ...drive.rounds.map((r, i) => [`r${i}`, r]), ["selected", "Selected"], ["rejected", "Not selected"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setFilter(k); setPicked(new Set()); }} className={cn("h-8 rounded-lg border px-3 text-[12px]", filter === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>{l}</button>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto" icon={<DownloadIcon size={13} />} onClick={csv} disabled={!apps.length}>Excel</Button>
        </div>

        {canEdit && picked.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-[var(--color-plum)]/50 px-3 py-2.5">
            <span className="mr-1 text-[12.5px] text-white">{picked.size} picked</span>
            <Button size="sm" variant="primary" onClick={advance}>Move to next round</Button>
            <Button size="sm" icon={<SendIcon size={13} />} onClick={() => setModal("link")}>Send test / interview link</Button>
            <Button size="sm" icon={<CheckIcon size={13} />} onClick={select}>Mark selected</Button>
            <Button size="sm" icon={<TrophyIcon size={13} />} onClick={() => setModal("offer")}>Add offer</Button>
            <Button size="sm" variant="ghost" icon={<XIcon size={13} />} onClick={reject}>Not selected</Button>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-white/70" title="Email and phone notification to the picked students">
              <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} className="accent-[#a78bfa]" /> Notify students
            </label>
          </div>
        )}

        {list.length ? (
          <table className="mt-4 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-white/45">
                <th className={cn("w-8 pb-2", !canEdit && "hidden")}><input type="checkbox" checked={picked.size > 0 && picked.size === list.length} onChange={toggleAll} className="accent-[#a78bfa]" aria-label="Pick all" /></th>
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Branch</th>
                <th className="pb-2 font-medium">CGPA</th>
                <th className="hidden pb-2 font-medium md:table-cell">Skills</th>
                <th className="pb-2 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => [
                <tr key={a.uid} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                  <td className={cn("py-2.5", !canEdit && "hidden")}><input type="checkbox" checked={picked.has(a.uid)} onChange={() => setPicked((p) => { const n = new Set(p); n.has(a.uid) ? n.delete(a.uid) : n.add(a.uid); return n; })} className="accent-[#a78bfa]" aria-label={`Pick ${a.name}`} /></td>
                  <td className="cursor-pointer py-2.5 pr-3 whitespace-nowrap text-white" onClick={() => setOpenRow(openRow === a.uid ? null : a.uid)}>{a.name}</td>
                  <td className="py-2.5 pr-3 text-white/60">{a.branch}</td>
                  <td className="py-2.5 pr-3 text-white/60 tabular-nums">{a.cgpa}</td>
                  <td className="hidden max-w-[260px] truncate py-2.5 pr-3 text-[12px] text-white/55 md:table-cell">{a.resume.skills || "—"}</td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", a.status === "selected" ? "bg-emerald-400/12 text-emerald-300" : a.status === "rejected" ? "bg-white/[0.06] text-white/45" : a.status === "in-process" ? "bg-violet-400/15 text-violet-200" : "bg-cyan-400/10 text-cyan-200")}>{stageLabel(a, drive)}</span>
                  </td>
                </tr>,
                openRow === a.uid && (
                  <tr key={a.uid + "-o"}>
                    {canEdit && <td />}
                    <td colSpan={5} className="pb-3">
                      <div className="grid gap-3 rounded-xl bg-white/[0.03] p-3 text-[12.5px] md:grid-cols-3">
                        <div><p className="text-white/45">Headline</p><p className="text-white/80">{a.resume.headline || "—"}</p><p className="mt-2 text-white/45">Projects</p><p className="text-white/80">{a.resume.projects.join(", ") || "—"}</p></div>
                        <div><p className="text-white/45">Links sent</p>{a.links.length ? a.links.map((l) => <p key={l.at + l.title} className="text-white/80">{l.title}{l.when ? ` · ${l.when}` : ""}<span className="text-white/40"> · {drive.rounds[l.round ?? 0] ?? "round"}{(l.round ?? 0) !== a.round || a.status !== "in-process" ? " (done)" : ""}</span></p>) : <p className="text-white/50">None yet</p>}</div>
                        <div><p className="text-white/45">Offer</p><p className="text-white/80">{a.offer ? `${a.offer.ctc}${a.offer.joining ? ` · joins ${a.offer.joining}` : ""}` : "—"}</p>{a.decision && <p className={a.decision === "accepted" ? "text-emerald-300" : "text-rose-300"}>Student {a.decision}</p>}</div>
                      </div>
                    </td>
                  </tr>
                ),
              ])}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-[13px] text-white/50">{apps.length ? "No one at this stage." : "No applications yet. Eligible students see this drive in their Placement page."}</p>
        )}
      </Card>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121216] p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold text-white">{modal === "link" ? "Send a test or interview link" : "Add offer"}</p>
            <p className="mt-1 text-[12.5px] text-white/55">Only the {picked.size} picked student{picked.size > 1 ? "s" : ""} will see this, in their Placement page.</p>
            <div className="mt-4 space-y-3">
              {modal === "link" ? (
                <>
                  <div><Label htmlFor="lt">What is it</Label><Input id="lt" value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="e.g. Online test (HackerRank)" /></div>
                  <div><Label htmlFor="lu">Link</Label><Input id="lu" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" /></div>
                  <div><Label htmlFor="lw" hint="Optional">When</Label><Input id="lw" value={link.when} onChange={(e) => setLink({ ...link, when: e.target.value })} placeholder="e.g. 14 Nov, 10:00 AM" /></div>
                </>
              ) : (
                <>
                  <div><Label htmlFor="oc">Package</Label><Input id="oc" value={offer.ctc} onChange={(e) => setOffer({ ...offer, ctc: e.target.value })} /></div>
                  <div><Label htmlFor="oj" hint="Optional">Joining</Label><Input id="oj" value={offer.joining} onChange={(e) => setOffer({ ...offer, joining: e.target.value })} placeholder="e.g. July 2027" /></div>
                  <div><Label htmlFor="ou" hint="Optional">Offer letter link</Label><Input id="ou" value={offer.url} onChange={(e) => setOffer({ ...offer, url: e.target.value })} placeholder="https://… (Drive / company link)" /></div>
                  <div><Label htmlFor="on" hint="Optional">Note</Label><Input id="on" value={offer.note} onChange={(e) => setOffer({ ...offer, note: e.target.value })} placeholder="e.g. Accept by 20 Nov" /></div>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={modal === "link" ? sendLink : addOffer}>{modal === "link" ? "Send" : "Add offer"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
