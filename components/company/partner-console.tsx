"use client";

/* /partner — for the StudentOS team only (STUDENTOS_TEAM_EMAILS on the server):
   add companies (each gets a code for its recruiters), post partner drives and
   offer them to partner colleges, and see which colleges approved. */

import { useEffect, useMemo, useState } from "react";
import { DriveForm } from "@/components/college/placements";
import { CareersEditor } from "@/components/company/careers-editor";
import { Button, ButtonLink } from "@/components/ui/button";
import { CopyIcon, LogOutIcon, PlusIcon } from "@/components/ui/icons";
import { Input, Label, LogoMark, Wordmark } from "@/components/ui/primitives";
import { logOut } from "@/lib/auth";
import { partnerApi, partnerErrorText, type PartnerCollege, type PartnerCompany, type PartnerDrive, type Whoami } from "@/lib/partner";
import type { Drive } from "@/lib/placement";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Overview = { colleges: PartnerCollege[]; companies: PartnerCompany[]; drives: PartnerDrive[] };
const STATUS: Record<string, string> = { pending: "bg-amber-400/15 text-amber-200", approved: "bg-emerald-400/12 text-emerald-300", declined: "bg-white/[0.06] text-white/45" };

export function PartnerConsole() {
  const { status, actions } = useStore();
  const [who, setWho] = useState<Whoami | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [co, setCo] = useState({ name: "", website: "" });
  const [busy, setBusy] = useState("");
  const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [tab, setTab] = useState<"drives" | "careers">(qs?.get("tab") === "careers" ? "careers" : "drives");
  const [draft, setDraft] = useState<{ companyId: string; colleges: Set<string>; minInterview: number; drive: Drive | null } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  const load = () =>
    partnerApi<Overview>("team-overview")
      .then(setData)
      .catch((e) => setErr(partnerErrorText(e)));
  useEffect(() => {
    if (status !== "ready") return;
    partnerApi<Whoami>("whoami")
      .then((w) => {
        setWho(w);
        if (w.team) void load();
      })
      .catch((e) => setErr(partnerErrorText(e)));
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const degree = useMemo(() => (data?.colleges ?? []).filter((c) => c.type === "degree"), [data]);
  const nameOf = (cid: string) => data?.colleges.find((c) => c.id === cid)?.name ?? cid;

  if (status === "loading") return <div className="min-h-screen bg-ink" />;
  if (status === "signed-out")
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-center text-white">
        <div><p className="text-[15px]">StudentOS team only.</p><ButtonLink href="/login?next=/partner" variant="primary" className="mt-4">Log in</ButtonLink></div>
      </div>
    );
  if (err) return <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-[14px] text-rose-300">{err}</div>;
  if (who && !who.team)
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-center text-[14px] text-white/60">
        <div className="max-w-md space-y-2">
          <p>This page is only for the StudentOS team.</p>
          <p className="text-[12.5px] text-white/45">
            Logged in as <span className="text-white/80">{who.email || "an account with no email"}</span>
            {!who.teamSet ? " · STUDENTOS_TEAM_EMAILS isn’t set on the server." : !who.verified ? " · this email isn’t verified yet (verify it, or log in with Google)." : " · this email isn’t in STUDENTOS_TEAM_EMAILS."}
          </p>
          <button type="button" onClick={() => void logOut().then(() => (window.location.href = "/login?next=/partner"))} className="text-[12.5px] text-accent hover:underline">Log in with another account</button>
        </div>
      </div>
    );

  const addCompany = async () => {
    if (co.name.trim().length < 2) return;
    setBusy("co");
    try {
      await partnerApi("team-company", co);
      setCo({ name: "", website: "" });
      await load();
      actions.toast("Company added. Share its code with their recruiter.");
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy("");
    }
  };
  const send = async (drive: Drive) => {
    if (!draft) return;
    if (!draft.companyId) return actions.toast("Pick the company.");
    if (!draft.colleges.size) return actions.toast("Pick at least one college.");
    setBusy("drive");
    try {
      await partnerApi("team-drive", { drive, companyId: draft.companyId, colleges: [...draft.colleges], minInterview: draft.minInterview });
      actions.toast(`Sent to ${draft.colleges.size} college${draft.colleges.size === 1 ? "" : "s"} for approval.`);
      setDraft(null);
      await load();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy("");
    }
  };
  const blank = (companyName: string): Drive => ({ id: `pd${Date.now().toString(36)}`, company: companyName, role: "", kind: "Full-time", ctc: "", location: "", about: "", rounds: ["Online test", "Technical interview", "HR interview"], elig: { branches: [], minCgpa: 0, maxBacklogs: 0, batch: "" }, deadline: "", open: true, createdAt: Date.now(), createdBy: "" });

  return (
    <div className="min-h-screen bg-ink px-5 py-7 text-white sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center gap-3">
        <LogoMark size={26} />
        <Wordmark className="text-[16px]" />
        <span className="rounded-md border border-cyan-400/40 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider text-cyan-200">TEAM</span>
        <button type="button" onClick={() => void logOut().then(() => (window.location.href = "/"))} className="ml-auto flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><LogOutIcon size={14} /> Log out</button>
      </header>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{tab === "careers" ? "Careers" : "Placement partner"}</h1>
          <p className="mt-1 text-[14px] text-white/55">{tab === "careers" ? "Roles on /careers, applications and AI interview reports." : "Bring companies to partner colleges. Each college approves a drive before its students see it."}</p>
        </div>
        <div className="flex rounded-xl border border-white/10 p-1">
          {([["drives", "Partner drives"], ["careers", "Careers"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-8 rounded-lg px-3.5 text-[13px] font-medium transition", tab === k ? "bg-[var(--color-plum)] text-white" : "text-white/60 hover:text-white")}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "careers" ? (
        <CareersEditor openApp={qs?.get("app")} />
      ) : !data ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : draft ? (
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div>
                <Label htmlFor="pc">Company</Label>
                <select id="pc" value={draft.companyId} onChange={(e) => setDraft({ ...draft, companyId: e.target.value, drive: blank(data.companies.find((c) => c.id === e.target.value)?.name ?? "") })} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
                  <option value="">Pick a company</option>
                  {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="mi">Min. mock interview score</Label>
                <Input id="mi" type="number" min={0} max={100} value={draft.minInterview || ""} onChange={(e) => setDraft({ ...draft, minInterview: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} placeholder="0 = anyone" />
              </div>
            </div>
            <p className="mt-4 mb-2 text-[12.5px] font-medium text-white/75">Send to partner colleges ({draft.colleges.size} picked)</p>
            {degree.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {degree.map((c) => (
                  <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] transition", draft.colleges.has(c.id) ? "border-accent/60 bg-[var(--color-plum)]/60" : "border-white/[0.08] hover:border-white/20")}>
                    <input type="checkbox" checked={draft.colleges.has(c.id)} onChange={() => setDraft((d) => { if (!d) return d; const s = new Set(d.colleges); if (s.has(c.id)) s.delete(c.id); else s.add(c.id); return { ...d, colleges: s }; })} className="accent-[#a78bfa]" />
                    <span className="min-w-0"><span className="block truncate">{c.name}</span><span className="block text-[11px] text-white/40">{c.city || "—"}</span></span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-white/45">No degree colleges on StudentOS yet.</p>
            )}
          </section>
          {draft.drive ? (
            <div className={cn(busy === "drive" && "pointer-events-none opacity-60")}>
              <DriveForm isNew key={draft.companyId} initial={draft.drive} onCancel={() => setDraft(null)} onSave={(d) => void send(d)} />
            </div>
          ) : (
            <p className="text-[13px] text-white/45">Pick the company to fill in the drive. <button type="button" onClick={() => setDraft(null)} className="text-accent hover:underline">Cancel</button></p>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Partner drives</h2>
              <Button size="sm" variant="primary" icon={<PlusIcon size={14} />} onClick={() => setDraft({ companyId: "", colleges: new Set(), minInterview: 0, drive: null })} disabled={!data.companies.length}>New partner drive</Button>
            </div>
            {data.drives.length ? (
              <div className="mt-4 space-y-3">
                {data.drives.map((d) => (
                  <div key={d.pid} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-[14.5px] font-semibold">{d.company} · {d.role}</p>
                    <p className="mt-0.5 text-[12px] text-white/50">{[d.kind, d.ctc, d.deadline ? `apply by ${d.deadline}` : "", d.minInterview ? `interview ${d.minInterview}+` : ""].filter(Boolean).join(" · ")}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {Object.entries(d.statuses ?? {}).map(([cid, s]) => (
                        <span key={cid} className={cn("rounded-full px-2 py-0.5 text-[11px]", STATUS[s])}>{nameOf(cid)} · {s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 mb-4 text-center text-[13px] text-white/45">{data.companies.length ? "No partner drives yet." : "Add a company first, then post its drive."}</p>
            )}
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5">
            <h2 className="text-[15px] font-semibold">Companies</h2>
            <div className="mt-3 space-y-2">
              {data.companies.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#ffffff] text-[13px] font-extrabold text-[#0b0a12]">{c.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{c.name}</span><span className="block text-[11px] text-white/40">{c.website || "—"}</span></span>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(`Join ${c.name} on StudentOS: ${window.location.origin}/company · code ${c.code}`).then(() => actions.toast("Invite copied."))} title="Copy recruiter invite" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 font-mono text-[12px] tracking-wider text-white/75 hover:text-white">
                    {c.code} <CopyIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
              <Label htmlFor="cn2">Add a company</Label>
              <Input id="cn2" value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} placeholder="Company name" />
              <Input aria-label="Company website" value={co.website} onChange={(e) => setCo({ ...co, website: e.target.value })} placeholder="Website (optional)" />
              <Button className="w-full" loading={busy === "co"} disabled={co.name.trim().length < 2} onClick={() => void addCompany()}>Add company</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
