"use client";

/* StudentOS for companies (/company): a recruiter joins with the code StudentOS gives
   them, then sees every applicant to their partner drives from the colleges that
   approved them, and runs the rounds: links, next round, selected, offer letters.
   Students are told by email, notification and the in-app bell. */

import { CompanyLogo } from "@/components/company/company-logo";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useResumePrint } from "@/components/resume/resume-print";
import { Button, ButtonLink } from "@/components/ui/button";
import { VideoIcon, ArrowLeftIcon, BriefcaseIcon, CheckIcon, DownloadIcon, FileIcon, LogOutIcon, SendIcon, TrophyIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, LogoMark, Textarea, Wordmark } from "@/components/ui/primitives";
import { logOut } from "@/lib/auth";
import { fallbackResume } from "@/lib/resume-snapshot";
import { partnerApi, partnerErrorText, type Applicant, type CompanyDrive, type TestSummary, type Whoami } from "@/lib/partner";
import { TestCard, TestCell } from "@/components/company/company-test";
import { IvCard, IvCell, IvReportDrawer } from "@/components/company/company-iv";
import type { IvSummary } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Detail = { drive: { pid: string; role: string; kind: string; ctc: string; deadline: string; rounds: string[]; company: string }; applicants: Applicant[]; test?: TestSummary | null; iv?: IvSummary | null; ivHr?: IvSummary | null };
type Op = "advance" | "select" | "reject" | "link" | "offer";

const stage = (a: Applicant, rounds: string[]) => (a.status === "applied" ? "New" : a.status === "selected" ? (a.offer ? "Offer sent" : "Selected") : a.status === "rejected" ? "Not selected" : rounds[a.round] ?? `Round ${a.round + 1}`);
const key = (a: { cid: string; uid: string }) => `${a.cid}/${a.uid}`;
const cvOf = (a: Applicant) => ({ name: a.name, cv: a.cv ?? fallbackResume(a) });
const scoreTone = (v?: number) => (v == null ? "text-white/35" : v >= 75 ? "text-emerald-300" : v >= 60 ? "text-cyan-200" : "text-amber-300");
/** only scores the server signed count for filters and sorting */
const ivOk = (a: Applicant) => (a.scores?.interviewVerified ? (a.scores.interview ?? -1) : -1);
/* Screening: every score a company can sort and cut by, 0–100 (−1 = none yet). */
type Metric = "mock" | "test" | "ai" | "hr";
const METRIC_LABEL: Record<Metric, string> = { mock: "Mock interview", test: "Online test", ai: "AI technical", hr: "AI HR" };
const ivScore = (r: Applicant["iv"]) => (r && !("started" in r) && r.overall != null ? r.overall : -1);
const scoreOf = (a: Applicant, m: Metric) => {
  if (m === "mock") return ivOk(a);
  if (m === "ai") return ivScore(a.iv);
  if (m === "hr") return ivScore(a.ivHr);
  const t = a.test;
  if (!t || "started" in t) return -1;
  const coding = t.coding ?? [];
  const parts = (t.total ? 1 : 0) + coding.length;
  if (!parts) return -1;
  // MCQ share and each coding problem's share of hidden tests, averaged
  const sum = (t.total ? t.correct / t.total : 0) + coding.reduce((n, c) => n + (c.total ? c.passed / c.total : 0), 0);
  return Math.round((sum / parts) * 100);
};

/** A score with a ✓ when StudentOS verified it; an unverified one is shown greyed and labelled. */
function Score({ v, ok, big }: { v?: number; ok?: boolean; big?: boolean }) {
  if (v == null) return <span className="text-white/35">—</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5" title={ok ? "Verified by StudentOS" : "Not verified: this score couldn’t be checked"}>
      <span className={cn("font-semibold tabular-nums", big && "text-[22px] font-bold", ok ? scoreTone(v) : "text-white/40 line-through decoration-white/25")}>{v}</span>
      {ok ? <span className="rounded bg-emerald-400/12 px-1 text-[10px] font-semibold text-emerald-300">✓ Verified</span> : <span className="text-[10.5px] text-white/40">not verified</span>}
    </span>
  );
}

/** Live interview: when, a Join button around that time, then the recruiter's verdict. */
function LiveCell({ pid, r }: { pid: string; r: Applicant["live"] }) {
  if (!r) return <span className="text-white/35">—</span>;
  const when = new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const soon = Date.now() > r.at - 15 * 60_000 && Date.now() < r.at + (r.minutes + 60) * 60_000;
  return (
    <span className="inline-flex flex-col">
      {r.feedback ? <span className="font-semibold tabular-nums">{r.feedback.score}<span className="text-[11px] font-normal text-white/45">/10</span> <span className="text-[11.5px] font-medium text-cyan-200">{r.feedback.verdict}</span></span> : <span className="text-[12px] text-white/70">{when}</span>}
      <Link href={`/company/live?d=${pid}&r=${r.room}`} className={cn("text-[11.5px]", soon ? "font-semibold text-emerald-300" : "text-accent")}>{soon ? "Join now →" : r.feedback ? "Open" : "Join link"}</Link>
    </span>
  );
}

function Shell({ children, side }: { children: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-ink text-white">
      {side}
      <main className="min-w-0 flex-[999_1_560px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <LogoMark size={24} />
      <Wordmark className="text-[15px]" />
      <span className="ml-auto rounded-md border border-amber-400/45 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider text-amber-200">HIRING</span>
    </div>
  );
}

export function CompanyPortal() {
  const { status, actions, state } = useStore();
  const [who, setWho] = useState<Whoami | null>(null);
  const [err, setErr] = useState("");
  const [drives, setDrives] = useState<CompanyDrive[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  const loadWho = () =>
    partnerApi<Whoami>("whoami")
      .then(setWho)
      .catch((e) => setErr(partnerErrorText(e)));
  useEffect(() => {
    if (status === "ready") void loadWho();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!who?.company) return;
    partnerApi<{ drives: CompanyDrive[] }>("company-drives")
      .then((r) => {
        setDrives(r.drives);
        setOpen((o) => o ?? r.drives[0]?.pid ?? null);
      })
      .catch((e) => actions.toast(partnerErrorText(e)));
  }, [who?.company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") return <div className="min-h-screen bg-ink" />;
  if (status === "signed-out")
    return (
      <Shell>
        <div className="mx-auto mt-[12vh] max-w-[480px] rounded-3xl border border-white/[0.08] bg-[#0d152a] p-8 text-center">
          <div className="flex justify-center"><LogoMark size={40} /></div>
          <h1 className="mt-5 text-[26px] font-semibold">StudentOS for companies</h1>
          <p className="mt-2 text-[14px] text-white/55">Hire freshers and interns from our partner colleges. Every applicant comes with their resume and StudentOS mock-interview scores.</p>
          <div className="mt-6 flex justify-center gap-2">
            <ButtonLink href="/login?next=/company" variant="primary">Log in</ButtonLink>
            <ButtonLink href="/signup?next=/company">Create account</ButtonLink>
          </div>
          <p className="mt-5 text-[12px] text-white/40">Want to hire through StudentOS? Ask us for your company code.</p>
        </div>
      </Shell>
    );
  if (err) return <Shell><p className="mt-20 text-center text-[14px] text-rose-300">{err}</p></Shell>;
  if (!who) return <Shell><div className="mt-20 h-40 animate-pulse rounded-2xl bg-white/[0.04]" /></Shell>;
  if (!who.company) return <Join name={state.profile.name} onJoined={() => void loadWho()} />;

  const side = (
    <aside className="flex w-full flex-col gap-1 border-b border-white/[0.06] bg-[#0b0b0d] px-3 py-4 lg:min-h-screen lg:w-[240px] lg:border-r lg:border-b-0">
      <Brand />
      <div className="mt-4 mb-3 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2.5">
        <CompanyLogo name={who.company.name} website={who.company.website} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" letterClassName="border border-white/10 bg-[#ffffff] text-[15px] font-extrabold text-[#0b0a12]" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{who.company.name}</p>
          <p className="truncate text-[11.5px] text-white/45">Recruiter · {state.profile.name}</p>
        </div>
      </div>
      <p className="px-3 pt-1 pb-1 text-[11px] font-medium tracking-wide text-white/35 uppercase">Your drives</p>
      {drives === null ? (
        <div className="mx-2 h-16 animate-pulse rounded-lg bg-white/[0.04]" />
      ) : drives.length ? (
        drives.map((d) => (
          <button key={d.pid} type="button" onClick={() => setOpen(d.pid)} className={cn("rounded-lg px-3 py-2 text-left text-[13px] transition", open === d.pid ? "bg-[var(--color-plum)] text-white shadow-[inset_2px_0_0_#fbbf24]" : "text-white/65 hover:bg-white/[0.04] hover:text-white")}>
            <span className="block truncate">{d.role}</span>
            <span className="block text-[11px] text-white/40">{d.colleges} college{d.colleges === 1 ? "" : "s"}</span>
          </button>
        ))
      ) : (
        <p className="px-3 text-[12px] text-white/45">No drives yet.</p>
      )}
      <div className="mt-auto space-y-1 pt-6">
        <a href="mailto:?subject=New%20drive%20on%20StudentOS" className="block rounded-lg px-3 py-2 text-[12.5px] text-white/55 hover:text-white">+ Ask StudentOS for a new drive</a>
        <button type="button" onClick={() => void logOut().then(() => (window.location.href = "/"))} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-white/55 hover:text-white"><LogOutIcon size={14} /> Log out</button>
      </div>
    </aside>
  );

  return (
    <Shell side={side}>
      {open ? (
        <Applicants key={open} pid={open} />
      ) : (
        <div className="mt-16 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <BriefcaseIcon size={26} className="mx-auto text-white/35" />
          <p className="mt-3 text-[14px] text-white/70">No drives yet. StudentOS sets up your first drive with you and sends it to partner colleges.</p>
        </div>
      )}
    </Shell>
  );
}

function Join({ name, onJoined }: { name: string; onJoined: () => void }) {
  const { actions } = useStore();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    try {
      const r = await partnerApi<{ company: { name: string } }>("company-join", { code, name });
      actions.toast(`You’re in as a recruiter for ${r.company.name}.`);
      onJoined();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <div className="mx-auto mt-[12vh] max-w-[440px] rounded-3xl border border-white/[0.08] bg-[#0d152a] p-8">
        <Brand />
        <h1 className="mt-6 text-[22px] font-semibold">Join your company</h1>
        <p className="mt-1.5 text-[13px] text-white/55">Enter the company code StudentOS gave you. You’ll see your drives and applicants straight away.</p>
        <div className="mt-5"><Label htmlFor="cc">Company code</Label></div>
        <Input id="cc" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && void join()} placeholder="e.g. 7KQ2M9XA" className="font-mono tracking-[0.2em]" />
        <Button variant="primary" className="mt-4 w-full" loading={busy} disabled={code.trim().length < 6} onClick={() => void join()}>Join</Button>
        <p className="mt-4 text-center text-[12px] text-white/40"><Link href="/" className="hover:text-white">Not a recruiter? Go to StudentOS</Link></p>
      </div>
    </Shell>
  );
}

function Applicants({ pid }: { pid: string }) {
  const { actions } = useStore();
  const [data, setData] = useState<Detail | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [college, setCollege] = useState("all");
  const [tab, setTab] = useState("all");
  const [minIv, setMinIv] = useState(0);
  const [metric, setMetric] = useState<Metric>("mock");
  const [topN, setTopN] = useState(20);
  const [tell, setTell] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | "link" | "offer" | "live">(null);
  const [link, setLink] = useState({ title: "", url: "", when: "" });
  const [offer, setOffer] = useState({ ctc: "", joining: "", url: "", note: "" });
  const [person, setPerson] = useState<Applicant | null>(null);
  const [report, setReport] = useState<{ a: Applicant; kind: "technical" | "hr" } | null>(null);
  const [slot, setSlot] = useState({ start: "", minutes: 30 });
  const resumes = useResumePrint();

  const load = () =>
    partnerApi<Detail>("company-applicants", { pid })
      .then((d) => {
        setData(d);
        setOffer((o) => ({ ...o, ctc: o.ctc || d.drive.ctc }));
      })
      .catch((e) => actions.toast(partnerErrorText(e)));
  useEffect(() => {
    void load();
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps

  const rounds = data?.drive.rounds ?? [];
  const colleges = useMemo(() => [...new Set((data?.applicants ?? []).map((a) => a.college))].sort(), [data]);
  const list = (data?.applicants ?? [])
    .filter((a) => college === "all" || a.college === college)
    .filter((a) => !minIv || scoreOf(a, metric) >= minIv)
    .filter((a) => (tab === "all" ? true : tab === "new" ? a.status === "applied" : tab === "selected" ? a.status === "selected" : tab === "rejected" ? a.status === "rejected" : a.status === "in-process" && a.round === Number(tab.slice(1))))
    .sort((a, b) => scoreOf(b, metric) - scoreOf(a, metric));
  const count = (f: (a: Applicant) => boolean) => (data?.applicants ?? []).filter(f).length;

  const run = async (op: Op, extra: Record<string, unknown> = {}) => {
    if (!picked.size) return;
    setBusy(true);
    try {
      const items = (data?.applicants ?? []).filter((a) => picked.has(key(a))).map((a) => ({ cid: a.cid, uid: a.uid }));
      const r = await partnerApi<{ changed: number; told: { people: number; emailed: number; pushed: number } }>("company-update", { pid, op, items, notify: tell, ...extra });
      actions.toast(`${r.changed} updated${tell && r.told.people ? ` · students told (${[`${r.told.people} in-app`, r.told.emailed ? `${r.told.emailed} email` : "", r.told.pushed ? `${r.told.pushed} phone` : ""].filter(Boolean).join(", ")})` : ""}.`);
      setPicked(new Set());
      setModal(null);
      await load();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const csv = () => {
    if (!data) return;
    const rows = [["Name", "College", "Branch", "CGPA (student-entered)", "Backlogs (student-entered)", "Batch", "Mock interview", "Interview verified", "Coding round", "Coding verified", "Test score", "Test warnings", "AI technical", "AI HR", "Stage", "Offer", "Decision", "Email"], ...data.applicants.map((a) => [a.name, a.college, a.branch, a.cgpa, a.backlogs, a.batch, a.scores?.interview ?? "", a.scores?.interview != null ? (a.scores.interviewVerified ? "Yes" : "No") : "", a.scores?.coding ?? "", a.scores?.coding != null ? (a.scores.codingVerified ? "Yes" : "No") : "", a.test && "correct" in a.test ? `${a.test.correct}/${a.test.total}` : "", a.test && "correct" in a.test ? (a.test.ended ? "ended" : a.test.warnings.length) : "", ivScore(a.iv) >= 0 ? ivScore(a.iv) : "", ivScore(a.ivHr) >= 0 ? ivScore(a.ivHr) : "", stage(a, rounds), a.offer?.ctc ?? "", a.decision, a.email])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: u, download: `${data.drive.company} ${data.drive.role} applicants.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };

  if (!data) return <div className="h-[420px] animate-pulse rounded-2xl bg-white/[0.04]" />;
  const hasLive = data.applicants.some((a) => a.live);
  const schedule = async () => {
    const t0 = new Date(slot.start).getTime();
    if (!slot.start || !Number.isFinite(t0) || t0 < Date.now() - 3600_000) return actions.toast("Pick the date and time of the first interview.");
    const picks = data.applicants.filter((a) => picked.has(key(a)));
    setBusy(true);
    try {
      // back to back: each student gets the next slot
      const items = picks.map((a, i) => ({ cid: a.cid, uid: a.uid, at: t0 + i * slot.minutes * 60_000, minutes: slot.minutes }));
      const r = await partnerApi<{ changed: number; told: { people: number } }>("company-live-schedule", { pid, items });
      actions.toast(`${r.changed} live interview${r.changed === 1 ? "" : "s"} scheduled · students told.`);
      setPicked(new Set());
      setModal(null);
      await load();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const tabs: [string, string, number][] = [
    ["all", "All", data.applicants.length],
    ["new", "New", count((a) => a.status === "applied")],
    ...rounds.map((r, i) => [`r${i}`, r, count((a) => a.status === "in-process" && a.round === i)] as [string, string, number]),
    ["selected", "Selected", count((a) => a.status === "selected")],
    ["rejected", "Not selected", count((a) => a.status === "rejected")],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{data.drive.role}</h1>
          <p className="mt-1 text-[13.5px] text-white/55">
            {data.applicants.length} applicant{data.applicants.length === 1 ? "" : "s"} from {colleges.length} partner college{colleges.length === 1 ? "" : "s"}
            {data.drive.deadline ? ` · apply by ${new Date(data.drive.deadline + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<FileIcon size={13} />} disabled={!list.length} onClick={() => resumes.print(list.map(cvOf))}>Resumes (PDF)</Button>
          <Button size="sm" variant="ghost" icon={<DownloadIcon size={13} />} onClick={csv}>Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Applied", data.applicants.length], ["In rounds", count((a) => a.status === "in-process")], ["Selected", count((a) => a.status === "selected")], ["Offers accepted", count((a) => a.decision === "accepted")]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-4">
            <p className="text-[26px] leading-none font-semibold tabular-nums">{v}</p>
            <p className="mt-1.5 text-[12px] text-white/50">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <TestCard pid={pid} rounds={rounds} summary={data.test ?? null} onSaved={() => void load()} />
        <IvCard pid={pid} kind="technical" rounds={rounds} summary={data.iv ?? null} onSaved={() => void load()} />
        <IvCard pid={pid} kind="hr" rounds={rounds} summary={data.ivHr ?? null} onSaved={() => void load()} />
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(([k, l, n]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-8 rounded-lg border px-3 text-[12.5px] transition", tab === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>
              {l} <span className="text-white/40">{n}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          <label className="flex items-center gap-2 text-white/55">
            College
            <select value={college} onChange={(e) => setCollege(e.target.value)} className="h-8 rounded-lg border border-white/10 bg-field px-2 text-white">
              <option value="all">All</option>
              {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-white/55">
            Screen by
            <select value={metric} onChange={(e) => { setMetric(e.target.value as Metric); setMinIv(0); }} className="h-8 rounded-lg border border-white/10 bg-field px-2 text-white" aria-label="Screen by score">
              {(["mock", "test", "ai", "hr"] as Metric[]).filter((m) => m === "mock" || (m === "test" ? !!data.test : m === "ai" ? !!data.iv : !!data.ivHr)).map((m) => <option key={m} value={m}>{METRIC_LABEL[m]}</option>)}
            </select>
          </label>
          {[0, 50, 60, 70, 80].map((v) => (
            <button key={v} type="button" onClick={() => setMinIv(v)} className={cn("h-8 rounded-lg border px-3 transition", minIv === v ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100" : "border-white/10 text-white/60 hover:text-white")}>
              {v ? `${v}+` : "Any score"}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-white/55">
            Pick top
            <input type="number" min={1} max={500} value={topN} onChange={(e) => setTopN(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} aria-label="How many to pick" className="h-8 w-16 rounded-lg border border-white/10 bg-field px-2 text-white" />
            <Button size="sm" disabled={!list.length} onClick={() => setPicked(new Set(list.filter((a) => scoreOf(a, metric) >= 0).slice(0, topN).map(key)))}>Pick</Button>
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-white/40">Screening: choose a round’s score, set a cut-off, pick the top students, then “Move to next round”. Students with no score yet are listed last and never picked.</p>

        {picked.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-[var(--color-plum)]/50 px-3 py-2.5">
            <span className="mr-1 text-[12.5px]">{picked.size} picked</span>
            <Button size="sm" variant="primary" loading={busy} onClick={() => void run("advance")}>Move to next round</Button>
            <Button size="sm" icon={<SendIcon size={13} />} disabled={busy} onClick={() => setModal("link")}>Send test / interview link</Button>
            <Button size="sm" icon={<VideoIcon size={13} />} disabled={busy} onClick={() => setModal("live")}>Schedule live interview</Button>
            <Button size="sm" icon={<CheckIcon size={13} />} disabled={busy} onClick={() => void run("select")}>Mark selected</Button>
            <Button size="sm" icon={<TrophyIcon size={13} />} disabled={busy} onClick={() => setModal("offer")}>Send offer</Button>
            <Button size="sm" variant="ghost" icon={<XIcon size={13} />} disabled={busy} onClick={() => void run("reject")}>Not selected</Button>
            <Button size="sm" variant="ghost" icon={<FileIcon size={13} />} onClick={() => resumes.print((data?.applicants ?? []).filter((a) => picked.has(key(a))).map(cvOf))}>Resumes</Button>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-white/70">
              <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} className="accent-[#fbbf24]" /> Notify students
            </label>
          </div>
        )}

        {list.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-white/45">
                  <th className="w-8 pb-2"><input type="checkbox" aria-label="Pick all" checked={picked.size > 0 && picked.size === list.length} onChange={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map(key)))} className="accent-[#fbbf24]" /></th>
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">College</th>
                  <th className="pb-2 font-medium" title="Entered by the student. Check it against your own records.">Branch · CGPA*</th>
                  <th className="pb-2 font-medium">Mock interview</th>
                  <th className="pb-2 font-medium">Coding round</th>
                  {data.test && <th className="pb-2 font-medium">Test</th>}
                  {data.iv && <th className="pb-2 font-medium">AI technical</th>}
                  {data.ivHr && <th className="pb-2 font-medium">AI HR</th>}
                  {hasLive && <th className="pb-2 font-medium">Live interview</th>}
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium"><span className="sr-only">Resume</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={key(a)} className="border-t border-white/[0.06]">
                    <td className="py-2.5"><input type="checkbox" aria-label={`Pick ${a.name}`} checked={picked.has(key(a))} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(key(a))) n.delete(key(a)); else n.add(key(a)); return n; })} className="accent-[#fbbf24]" /></td>
                    <td className="py-2.5"><button type="button" onClick={() => setPerson(a)} className="font-medium text-white hover:text-accent">{a.name}</button></td>
                    <td className="py-2.5 text-white/65">{a.college}</td>
                    <td className="py-2.5 text-white/65">{a.branch} · {a.cgpa}{a.backlogs ? ` · ${a.backlogs} backlogs` : ""}</td>
                    <td className="py-2.5"><Score v={a.scores?.interview} ok={a.scores?.interviewVerified} /></td>
                    <td className="py-2.5"><Score v={a.scores?.coding} ok={a.scores?.codingVerified} /></td>
                    {data.test && <td className="py-2.5"><TestCell r={a.test} /></td>}
                    {data.iv && <td className="py-2.5"><IvCell r={a.iv} onOpen={() => setReport({ a, kind: "technical" })} /></td>}
                    {data.ivHr && <td className="py-2.5"><IvCell r={a.ivHr} onOpen={() => setReport({ a, kind: "hr" })} /></td>}
                    {hasLive && <td className="py-2.5"><LiveCell pid={pid} r={a.live} /></td>}
                    <td className="py-2.5"><span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", a.status === "selected" ? "bg-emerald-400/12 text-emerald-300" : a.status === "rejected" ? "bg-white/[0.06] text-white/45" : "bg-white/[0.06] text-white/75")}>{stage(a, rounds)}{a.decision ? ` · ${a.decision}` : ""}</span></td>
                    <td className="py-2.5 text-right"><button type="button" onClick={() => resumes.print([cvOf(a)])} title={`Download ${a.name}’s resume`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12px] text-white/70 hover:border-violet-400/50 hover:text-white"><FileIcon size={13} /> Resume</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 mb-6 text-center text-[13px] text-white/45">{data.applicants.length ? "No one matches these filters." : "No applicants yet. Students apply once their college approves the drive."}</p>
        )}
        <p className="mt-3 text-[11.5px] text-white/35">Scores are the student’s best StudentOS mock interview and coding round when they applied. “✓ Verified” means StudentOS gave that score; filters and sorting use verified scores only. * Branch, CGPA and backlogs are entered by the student; the college can confirm them.</p>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} aria-hidden />
          <div role="dialog" aria-label={modal === "link" ? "Send a link" : "Send an offer"} className="relative w-full max-w-[460px] rounded-2xl border border-white/10 bg-[#121118] p-6">
            <h2 className="text-[17px] font-semibold">{modal === "link" ? `Send a link to ${picked.size}` : modal === "live" ? `Live interviews for ${picked.size}` : `Offer for ${picked.size}`}</h2>
            {modal === "live" ? (
              <div className="mt-4 space-y-3">
                <div><Label htmlFor="ls">First interview at</Label><Input id="ls" type="datetime-local" value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></div>
                <div>
                  <Label htmlFor="lm">Minutes each</Label>
                  <select id="lm" value={slot.minutes} onChange={(e) => setSlot({ ...slot, minutes: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
                    {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </div>
                <p className="text-[12px] text-white/50">Slots go back to back{slot.start ? `, ${new Date(slot.start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} to ${new Date(new Date(slot.start).getTime() + picked.size * slot.minutes * 60_000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}. Each student gets their time and a join link by email and notification. The call runs inside StudentOS: open Join from this list at the time.</p>
              </div>
            ) : modal === "link" ? (
              <div className="mt-4 space-y-3">
                <div><Label htmlFor="lt">Title</Label><Input id="lt" value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="Online assessment" /></div>
                <div><Label htmlFor="lu">Link</Label><Input id="lu" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" /></div>
                <div><Label htmlFor="lw">When (optional)</Label><Input id="lw" value={link.when} onChange={(e) => setLink({ ...link, when: e.target.value })} placeholder="20 Nov, 10:00 AM" /></div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div><Label htmlFor="oc">Package</Label><Input id="oc" value={offer.ctc} onChange={(e) => setOffer({ ...offer, ctc: e.target.value })} placeholder="₹4.5 LPA" /></div>
                <div><Label htmlFor="oj">Joining</Label><Input id="oj" value={offer.joining} onChange={(e) => setOffer({ ...offer, joining: e.target.value })} placeholder="July 2027" /></div>
                <div><Label htmlFor="ou">Offer letter link</Label><Input id="ou" value={offer.url} onChange={(e) => setOffer({ ...offer, url: e.target.value })} placeholder="https://… (Drive / email link)" /></div>
                <div><Label htmlFor="on">Note (optional)</Label><Textarea id="on" value={offer.note} onChange={(e) => setOffer({ ...offer, note: e.target.value })} rows={2} /></div>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => {
                  if (modal === "live") return void schedule();
                  if (modal === "link") {
                    if (!link.title.trim() || !/^https?:\/\//.test(link.url.trim())) return actions.toast("Add a title and a link starting with https://");
                    void run("link", { link });
                  } else {
                    if (!offer.ctc.trim()) return actions.toast("Add the package.");
                    if (offer.url && !/^https?:\/\//.test(offer.url.trim())) return actions.toast("The offer letter link must start with https://");
                    void run("offer", { offer });
                  }
                }}
              >
                {modal === "link" ? "Send link" : modal === "live" ? "Schedule" : "Send offer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {resumes.node}
      {report && <IvReportDrawer pid={pid} a={report.a} kind={report.kind} onClose={() => setReport(null)} />}
      {person && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPerson(null)} aria-hidden />
          <aside role="dialog" aria-label={person.name} className="relative h-full w-full max-w-[440px] overflow-y-auto border-l border-white/10 bg-[#121118] p-6">
            <button type="button" onClick={() => setPerson(null)} className="flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><ArrowLeftIcon size={13} /> Back</button>
            <h2 className="mt-4 text-[22px] font-semibold">{person.name}</h2>
            <p className="mt-1 text-[13px] text-white/55">{person.branch} · CGPA {person.cgpa} · {person.batch} batch · {person.college}</p>
            <button type="button" onClick={() => resumes.print([cvOf(person)])} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-black"><FileIcon size={15} /> Download resume (PDF)</button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.04] p-3"><Score big v={person.scores?.interview} ok={person.scores?.interviewVerified} /><p className="mt-1 text-[11.5px] text-white/45">Mock interview</p></div>
              <div className="rounded-xl bg-white/[0.04] p-3"><Score big v={person.scores?.coding} ok={person.scores?.codingVerified} /><p className="mt-1 text-[11.5px] text-white/45">Coding round</p></div>
            </div>
            <p className="mt-4 text-[12px] text-white/45">Stage</p>
            <p className="text-[14px]">{stage(person, rounds)}{person.decision ? ` · offer ${person.decision}` : ""}</p>
            {person.resume && (
              <div className="mt-4 space-y-2 text-[13px]">
                {person.resume.headline && <p className="text-white/80">{person.resume.headline}</p>}
                {person.resume.skills && <p className="text-white/60"><span className="text-white/40">Skills:</span> {person.resume.skills}</p>}
                {person.resume.projects?.length > 0 && <p className="text-white/60"><span className="text-white/40">Projects:</span> {person.resume.projects.join(", ")}</p>}
                {person.resume.links && <p className="break-all text-white/60"><span className="text-white/40">Links:</span> {person.resume.links}</p>}
              </div>
            )}
            {person.links.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] text-white/45">Links sent</p>
                {person.links.map((l, i) => <p key={i} className="text-[13px] text-white/75">{l.title}{l.when ? ` · ${l.when}` : ""}</p>)}
              </div>
            )}
            {person.offer && <p className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-[13px] text-emerald-200">Offer: {person.offer.ctc}{person.offer.joining ? ` · joining ${person.offer.joining}` : ""}</p>}
            <p className="mt-4 text-[12px] text-white/45">Email</p>
            <p className="text-[13px]">{person.email || "—"}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
