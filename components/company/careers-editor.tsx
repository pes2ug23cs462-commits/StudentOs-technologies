"use client";

/* /partner → Careers, for the StudentOS team:
   Roles        post, edit, pause and delete roles for /careers, with the AI interview
                settings (on/off, how long to finish, or one fixed window, questions)
   Applications everyone who applied, their AI interview report, contact buttons
                (email, WhatsApp, call), and the team's decision. Offer letters are
                written and sent by the team themselves. */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { CAREER_TEAMS, DECISION_LABEL, careersApi, careersErrorText, fmtWhen, loadCareers, stageOf, type CareerApp, type CareerDecision, type CareerRole, type CareerStage, type CareerTeam, type CareersDoc } from "@/lib/careers";
import { partnerApi, partnerErrorText } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const blank = (): CareerRole => ({ id: `r${Date.now().toString(36)}`, title: "", team: "Engineering", where: "Remote", pay: "Unpaid", length: "3 months", tags: [], does: [], wants: [], postedAt: Date.now(), ai: true, within: 3, questions: 6 });
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const toLocal = (ms?: number) => (ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).getTime() : 0);
const STAGE: Record<CareerStage, { label: string; cls: string }> = {
  invited: { label: "Link sent", cls: "bg-cyan-400/10 text-cyan-200" },
  "in-progress": { label: "In interview", cls: "bg-violet-400/15 text-violet-200" },
  completed: { label: "Interview done", cls: "bg-emerald-400/12 text-emerald-300" },
  missed: { label: "Missed", cls: "bg-white/[0.06] text-white/50" },
};
const scoreCls = (v: number) => (v >= 75 ? "text-emerald-300" : v >= 55 ? "text-cyan-200" : "text-amber-300");

export function CareersEditor({ openApp }: { openApp?: string | null }) {
  const [view, setView] = useState<"roles" | "apps">(openApp ? "apps" : "roles");
  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {([["roles", "Roles"], ["apps", "Applications"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={cn("h-9 rounded-full border px-4 text-[13px] font-medium transition", view === k ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-white/60 hover:text-white")}>{l}</button>
        ))}
      </div>
      {view === "roles" ? <Roles /> : <Apps openApp={openApp} />}
    </div>
  );
}

/* ================= roles ================= */
function Roles() {
  const { actions } = useStore();
  const [data, setData] = useState<CareersDoc | null>(null);
  const [edit, setEdit] = useState<CareerRole | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadCareers().then(setData);
  }, []);

  const save = async (next: CareersDoc, msg: string) => {
    setBusy(true);
    try {
      await partnerApi("team-careers", { open: next.open, roles: next.roles });
      setData(next);
      setEdit(null);
      actions.toast(msg);
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;
  if (edit)
    return (
      <RoleForm
        initial={edit}
        isNew={!data.roles.some((r) => r.id === edit.id)}
        busy={busy}
        onCancel={() => setEdit(null)}
        onSave={(r) => {
          const exists = data.roles.some((x) => x.id === r.id);
          void save({ ...data, roles: exists ? data.roles.map((x) => (x.id === r.id ? r : x)) : [r, ...data.roles] }, exists ? "Role updated on the careers page." : "Role posted on the careers page.");
        }}
      />
    );

  const live = data.roles.filter((r) => !r.paused).length;
  return (
    <div className="mt-5 space-y-5">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Hiring on the careers page</p>
          <p className="mt-0.5 text-[12.5px] text-white/55">{data.open ? `On · ${live} role${live === 1 ? "" : "s"} showing at /careers` : "Off · the page says there are no open roles"}</p>
        </div>
        <button type="button" role="switch" aria-checked={data.open} aria-label="Hiring on or off" disabled={busy} onClick={() => void save({ ...data, open: !data.open }, data.open ? "Hiring paused." : "Hiring is on.")} className={cn("relative h-7 w-12 rounded-full transition", data.open ? "bg-emerald-500" : "bg-white/15")}>
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all", data.open ? "left-6" : "left-1")} />
        </button>
        <a href="/careers" target="_blank" rel="noreferrer" className="text-[12.5px] text-accent hover:underline">Open /careers ↗</a>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Roles ({data.roles.length})</h2>
          <Button size="sm" variant="primary" icon={<PlusIcon size={14} />} onClick={() => setEdit(blank())}>Post a role</Button>
        </div>
        {data.roles.length ? (
          <div className="mt-4 space-y-2.5">
            {data.roles.map((r) => (
              <div key={r.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4", r.paused && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-[12px] text-white/50">
                    {[r.team, r.where, r.pay, r.length].join(" · ")} ·{" "}
                    {r.ai === false ? "no AI interview" : r.windowEnd ? `AI interview ${fmtWhen(r.windowStart || Date.now())} – ${fmtWhen(r.windowEnd)}` : `AI interview within ${r.within || 3} day${(r.within || 3) === 1 ? "" : "s"}`}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", r.paused ? "bg-white/[0.06] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{r.paused ? "Paused" : "Live"}</span>
                <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save({ ...data, roles: data.roles.map((x) => (x.id === r.id ? { ...x, paused: !x.paused } : x)) }, r.paused ? "Role is live again." : "Role paused.")}>{r.paused ? "Resume" : "Pause"}</Button>
                <button type="button" disabled={busy} onClick={() => window.confirm(`Delete “${r.title}”?`) && void save({ ...data, roles: data.roles.filter((x) => x.id !== r.id) }, "Role deleted.")} className="h-8 rounded-lg border border-rose-400/30 px-3 text-[12.5px] font-medium text-rose-300 hover:bg-rose-400/10">Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 mb-3 text-center text-[13px] text-white/45">No roles yet. Post the first one.</p>
        )}
      </section>
    </div>
  );
}

function RoleForm({ initial, isNew, busy, onSave, onCancel }: { initial: CareerRole; isNew: boolean; busy: boolean; onSave: (r: CareerRole) => void; onCancel: () => void }) {
  const [r, setR] = useState<CareerRole>({ ai: true, within: 3, questions: 6, ...initial });
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [does, setDoes] = useState(initial.does.join("\n"));
  const [wants, setWants] = useState(initial.wants.join("\n"));
  const [fixed, setFixed] = useState(!!initial.windowEnd);
  const winBad = fixed && (!r.windowEnd || r.windowEnd <= (r.windowStart || 0) || r.windowEnd < Date.now());
  const ok = r.title.trim().length > 2 && !winBad;
  const sel = "h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white";
  return (
    <section className="mx-auto mt-5 max-w-[820px] rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-6">
      <h2 className="text-[18px] font-semibold">{isNew ? "Post a role" : "Edit role"}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="rt">Role title</Label><Input id="rt" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} placeholder="e.g. Full-stack Developer Intern" /></div>
        <div>
          <Label htmlFor="rteam">Team</Label>
          <select id="rteam" value={r.team} onChange={(e) => setR({ ...r, team: e.target.value as CareerTeam })} className={sel}>
            {CAREER_TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="rw">Where</Label><Input id="rw" value={r.where} onChange={(e) => setR({ ...r, where: e.target.value })} placeholder="Remote / Bengaluru / Hybrid" /></div>
        <div><Label htmlFor="rp">Pay</Label><Input id="rp" value={r.pay} onChange={(e) => setR({ ...r, pay: e.target.value })} placeholder="Unpaid / ₹5,000 a month" /></div>
        <div><Label htmlFor="rl">Duration</Label><Input id="rl" value={r.length} onChange={(e) => setR({ ...r, length: e.target.value })} placeholder="3 months / Full-time" /></div>
        <div className="sm:col-span-2"><Label htmlFor="rg">Skills (comma separated)</Label><Input id="rg" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="React, Firebase, Figma" /></div>
        <div><Label htmlFor="rd">What you’ll do (one per line)</Label><Textarea id="rd" rows={5} value={does} onChange={(e) => setDoes(e.target.value)} /></div>
        <div><Label htmlFor="rwnt">What we look for (one per line)</Label><Textarea id="rwnt" rows={5} value={wants} onChange={(e) => setWants(e.target.value)} /></div>
      </div>

      <div className="mt-6 rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">AI interview</p>
            <p className="text-[12.5px] text-white/55">After applying, the applicant gets a link and must finish the interview in time. The team gets the report.</p>
          </div>
          <button type="button" role="switch" aria-checked={r.ai !== false} aria-label="AI interview on or off" onClick={() => setR({ ...r, ai: r.ai === false })} className={cn("relative h-7 w-12 rounded-full transition", r.ai !== false ? "bg-emerald-500" : "bg-white/15")}>
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all", r.ai !== false ? "left-6" : "left-1")} />
          </button>
        </div>
        {r.ai !== false && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {([[false, "Within some days of applying"], [true, "Fixed date and time"]] as const).map(([v, l]) => (
                <button key={l} type="button" onClick={() => { setFixed(v); if (!v) setR({ ...r, windowStart: 0, windowEnd: 0 }); }} className={cn("h-9 rounded-lg border px-3.5 text-[13px] transition", fixed === v ? "border-violet-400/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>{l}</button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {fixed ? (
                <>
                  <div><Label htmlFor="ws">Opens</Label><Input id="ws" type="datetime-local" value={toLocal(r.windowStart)} onChange={(e) => setR({ ...r, windowStart: fromLocal(e.target.value) })} /></div>
                  <div><Label htmlFor="we">Closes</Label><Input id="we" type="datetime-local" value={toLocal(r.windowEnd)} onChange={(e) => setR({ ...r, windowEnd: fromLocal(e.target.value) })} /></div>
                </>
              ) : (
                <div>
                  <Label htmlFor="wd">Finish within</Label>
                  <select id="wd" value={r.within ?? 3} onChange={(e) => setR({ ...r, within: Number(e.target.value) })} className={sel}>
                    {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label htmlFor="wq">Questions</Label>
                <select id="wq" value={r.questions ?? 6} onChange={(e) => setR({ ...r, questions: Number(e.target.value) })} className={sel}>
                  {[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} questions (~{n * 2 + 3} min)</option>)}
                </select>
              </div>
            </div>
            {winBad && <p className="text-[12.5px] text-rose-300">Pick when it opens and a later closing time that hasn’t passed.</p>}
            <div><Label htmlFor="wf">What should the AI check? (optional)</Label><Input id="wf" value={r.ivFocus ?? ""} onChange={(e) => setR({ ...r, ivFocus: e.target.value })} placeholder="e.g. React basics, how they debug, if they can work 15 hours a week" /></div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!ok} onClick={() => onSave({ ...r, title: r.title.trim(), tags: tags.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6), does: lines(does), wants: lines(wants), ...(fixed ? {} : { windowStart: 0, windowEnd: 0 }) })}>{isNew ? "Post role" : "Save"}</Button>
      </div>
    </section>
  );
}

/* ================= applications ================= */
function Apps({ openApp }: { openApp?: string | null }) {
  const { actions } = useStore();
  const [apps, setApps] = useState<CareerApp[] | null>(null);
  const [role, setRole] = useState("all");
  const [stage, setStage] = useState<"all" | CareerStage>("all");
  const [open, setOpen] = useState<string | null>(openApp ?? null);

  const load = () =>
    careersApi<{ apps: CareerApp[] }>("apps", {}, true)
      .then((r) => setApps(r.apps))
      .catch((e) => actions.toast(careersErrorText(e)));
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roles = useMemo(() => [...new Set((apps ?? []).map((a) => a.role))].sort(), [apps]);
  if (!apps) return <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;
  const list = apps
    .filter((a) => role === "all" || a.role === role)
    .filter((a) => stage === "all" || stageOf(a) === stage)
    .sort((x, y) => (stageOf(y) === "completed" ? 1 : 0) - (stageOf(x) === "completed" ? 1 : 0) || (y.report?.overall ?? -1) - (x.report?.overall ?? -1) || y.appliedAt - x.appliedAt);
  const count = (s: CareerStage) => apps.filter((a) => stageOf(a) === s).length;
  const cur = apps.find((a) => a.token === open) ?? null;
  const put = (a: CareerApp) => setApps((xs) => (xs ?? []).map((x) => (x.token === a.token ? a : x)));

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Applied", apps.length], ["Interview done", count("completed")], ["Waiting", count("invited") + count("in-progress")], ["Shortlisted", apps.filter((a) => a.decision === "shortlisted").length]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4">
            <p className="text-[26px] leading-none font-semibold tabular-nums">{v}</p>
            <p className="mt-1.5 text-[12px] text-white/50">{l}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "completed", "in-progress", "invited", "missed"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setStage(k)} className={cn("h-8 rounded-lg border px-3 text-[12.5px] transition", stage === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>
              {k === "all" ? "All" : STAGE[k].label} <span className="text-white/40">{k === "all" ? apps.length : count(k)}</span>
            </button>
          ))}
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className="ml-auto h-8 rounded-lg border border-white/10 bg-field px-2 text-[12.5px] text-white">
            <option value="all">All roles</option>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={() => void load()}>Refresh</Button>
        </div>
        {list.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[840px] text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-white/45">
                  <th className="pb-2 font-medium">Applicant</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Applied</th>
                  <th className="pb-2 font-medium">AI interview</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Decision</th>
                  <th className="pb-2"><span className="sr-only">Resume</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const st = stageOf(a);
                  return (
                    <tr key={a.token} onClick={() => setOpen(a.token)} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="py-2.5"><p className="font-medium text-white">{a.name}</p><p className="text-[11.5px] text-white/45">{a.college}</p></td>
                      <td className="py-2.5 text-white/70">{a.role}</td>
                      <td className="py-2.5 text-white/60">{fmtWhen(a.appliedAt)}</td>
                      <td className="py-2.5">{a.ai ? <span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", STAGE[st].cls)}>{STAGE[st].label}</span> : <span className="text-white/40">—</span>}</td>
                      <td className="py-2.5">{a.report ? <span className={cn("font-semibold tabular-nums", scoreCls(a.report.overall))}>{a.report.overall} <span className="text-[11.5px] font-normal text-white/50">· {a.report.verdict}</span></span> : <span className="text-white/35">—</span>}</td>
                      <td className="py-2.5">{a.decision ? <span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", a.decision === "rejected" ? "bg-white/[0.06] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{DECISION_LABEL[a.decision]}</span> : <span className="text-white/35">New</span>}</td>
                      <td className="py-2.5 text-right">{a.resume && <a href={a.resume} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12px] text-white/70 hover:border-violet-400/50 hover:text-white"><FileIcon size={13} /> Resume</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 mb-6 text-center text-[13px] text-white/45">{apps.length ? "No one matches these filters." : "No applications yet. Share /careers to get some."}</p>
        )}
      </section>
      {cur && <AppDrawer a={cur} onClose={() => setOpen(null)} onChange={put} onDelete={() => { setApps((xs) => (xs ?? []).filter((x) => x.token !== cur.token)); setOpen(null); }} />}
    </div>
  );
}

function AppDrawer({ a, onClose, onChange, onDelete }: { a: CareerApp; onClose: () => void; onChange: (a: CareerApp) => void; onDelete: () => void }) {
  const { actions } = useStore();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState(a.note);
  const st = stageOf(a);
  const phone = a.phone.replace(/\D/g, "");
  const wa = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(`Hi ${a.name.split(" ")[0]}, this is the StudentOS team about your application for ${a.role}.`)}`;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/careers/interview/${a.token}`;
  const run = async (action: string, body: Record<string, unknown>, msg: string) => {
    setBusy(action + String(body.decision ?? ""));
    try {
      const r = await careersApi<{ app?: CareerApp }>(action, { token: a.token, ...body }, true);
      if (r.app) onChange(r.app);
      actions.toast(msg);
    } catch (e) {
      actions.toast(careersErrorText(e));
    } finally {
      setBusy("");
    }
  };
  const urls = a.links.match(/https?:\/\/\S+/g) ?? [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#000000]/50" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={a.name} className="relative h-full w-full max-w-[560px] overflow-y-auto border-l border-white/10 bg-[#121118] p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
        <p className="text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">{a.role}</p>
        <h2 className="mt-1 text-[24px] font-semibold">{a.name}</h2>
        <p className="mt-0.5 text-[13px] text-white/55">{a.college} · applied {fmtWhen(a.appliedAt)}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href={`mailto:${a.email}?subject=${encodeURIComponent(`StudentOS · ${a.role}`)}`} className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[13px] font-medium text-white/85 hover:border-violet-400/50">Email</a>
          <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] text-[13px] font-medium text-emerald-300 hover:bg-emerald-400/15">WhatsApp</a>
          <a href={`tel:${phone.length === 10 ? `+91${phone}` : `+${phone}`}`} className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[13px] font-medium text-white/85 hover:border-violet-400/50">Call</a>
        </div>
        {a.resume && <a href={a.resume} target="_blank" rel="noreferrer" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-black"><FileIcon size={15} /> Open resume</a>}
        <div className="mt-4 space-y-1.5 text-[13px]">
          <p className="text-white/70"><span className="text-white/40">Email:</span> {a.email}</p>
          <p className="text-white/70"><span className="text-white/40">Phone:</span> {a.phone}</p>
          <p className="break-all text-white/70"><span className="text-white/40">Links:</span> {urls.length ? urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 text-accent hover:underline">{u.replace(/^https?:\/\//, "")}</a>) : a.links}</p>
          {a.why && <p className="whitespace-pre-line text-white/70"><span className="text-white/40">Why StudentOS:</span> {a.why}</p>}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold">AI interview</p>
            {a.ai && <span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", STAGE[st].cls)}>{STAGE[st].label}</span>}
          </div>
          {!a.ai ? (
            <p className="mt-2 text-[13px] text-white/55">This role has no AI interview.</p>
          ) : st === "completed" ? (
            a.report ? (
              <>
                <div className="mt-3 flex items-end gap-3">
                  <p className={cn("text-[40px] leading-none font-bold tabular-nums", scoreCls(a.report.overall))}>{a.report.overall}</p>
                  <p className="pb-1 text-[13px] text-white/60">/ 100 · <b className="text-white">{a.report.verdict}</b></p>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/75">{a.report.summary}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><p className="text-[11.5px] font-semibold text-emerald-300 uppercase">Strengths</p>{a.report.strengths.map((x) => <p key={x} className="mt-1 text-[12.5px] text-white/70">+ {x}</p>)}</div>
                  <div><p className="text-[11.5px] font-semibold text-amber-300 uppercase">Concerns</p>{a.report.concerns.map((x) => <p key={x} className="mt-1 text-[12.5px] text-white/70">– {x}</p>)}</div>
                </div>
              </>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <p className="flex-1 text-[13px] text-white/55">Answers are in, but the report couldn’t be made.</p>
                <Button size="sm" loading={busy === "app-evaluate"} onClick={() => void run("app-evaluate", {}, "Report ready.")}>Make report</Button>
              </div>
            )
          ) : (
            <>
              <p className="mt-2 text-[13px] text-white/60">Window: {fmtWhen(a.start)} – {fmtWhen(a.end)} (IST){st === "in-progress" ? ` · answered ${a.answers.length} of ${a.questions.length}` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(link).then(() => actions.toast("Interview link copied. Send it on WhatsApp or email."))}>Copy interview link</Button>
                <Button size="sm" loading={busy === "app-update"} onClick={() => void run("app-update", { extendDays: 2 }, "2 more days given.")}>Give 2 more days</Button>
              </div>
            </>
          )}
          {(a.flags.tabs > 0 || a.flags.pastes > 0) && <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">Left the tab {a.flags.tabs}× · pasted {a.flags.pastes}× during the interview.</p>}
        </div>

        {a.answers.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-[14px] font-semibold">Questions and answers</p>
            {a.questions.map((q, i) =>
              a.answers[i] ? (
                <div key={i} className="rounded-xl border border-white/[0.07] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-white">{i + 1}. {q}</p>
                    {a.report?.items[i] && <span className={cn("shrink-0 text-[13px] font-semibold tabular-nums", scoreCls(a.report.items[i].score * 10))}>{a.report.items[i].score}/10</span>}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-white/70">{a.answers[i].a}</p>
                  <p className="mt-2 text-[11.5px] text-white/40">{Math.round(a.answers[i].secs / 60)} min{a.report?.items[i]?.note ? ` · ${a.report.items[i].note}` : ""}</p>
                </div>
              ) : null,
            )}
          </div>
        )}

        <div className="mt-6">
          <p className="text-[14px] font-semibold">Your decision</p>
          <p className="text-[12px] text-white/45">The AI only helps. Write and send the offer letter yourselves, then mark it here.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["shortlisted", "rejected", "offer-sent", "hired"] as Exclude<CareerDecision, "">[]).map((d) => (
              <button key={d} type="button" disabled={!!busy} onClick={() => void run("app-update", { decision: a.decision === d ? "" : d }, a.decision === d ? "Decision cleared." : `Marked: ${DECISION_LABEL[d]}.`)} className={cn("h-9 rounded-lg border px-3.5 text-[13px] font-medium transition", a.decision === d ? (d === "rejected" ? "border-white/30 bg-white/10 text-white" : "border-emerald-400/60 bg-emerald-400/15 text-emerald-200") : "border-white/10 text-white/65 hover:text-white")}>
                {DECISION_LABEL[d]}
              </button>
            ))}
          </div>
          <Label htmlFor="cn">Team notes</Label>
          <Textarea id="cn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== a.note && void run("app-update", { note }, "Note saved.")} placeholder="Only the team sees this" />
        </div>
        <button type="button" onClick={() => window.confirm(`Delete ${a.name}’s application? This can’t be undone.`) && void careersApi("app-delete", { token: a.token }, true).then(() => { onDelete(); actions.toast("Application deleted."); }).catch((e) => actions.toast(careersErrorText(e)))} className="mt-6 text-[12.5px] text-rose-300 hover:underline">Delete application</button>
      </aside>
    </div>
  );
}
