"use client";

/* The college dashboard (/college) for principals and teachers.
   Sign in with a StudentOS account → set up the college (or join it as faculty
   with the codes the admin shares) → see the students who chose to share:
   readiness in 3D, weak chapters, students who need help, sections, faculty,
   privacy and downloadable reports. */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, ArrowLeftIcon, BarChartIcon, BookIcon, BriefcaseIcon, BuildingIcon, CheckIcon, DownloadIcon, FileIcon, GridIcon, HomeIcon, LayersIcon, LockIcon, LogOutIcon, MenuIcon, SearchIcon, ShieldIcon, SparkleIcon, UsersIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, LogoMark, Wordmark } from "@/components/ui/primitives";
import { Toaster } from "@/components/ui/toaster";
import { logOut } from "@/lib/auth";
import {
  ago,
  avg,
  chapterStats,
  createCollege,
  examReadiness,
  getCollege,
  getStaffCode,
  isActive,
  joinAsStaff,
  loadMembers,
  loadStaff,
  needHelp,
  placementParts,
  placementReadiness,
  readinessGrid,
  readinessOf,
  removeStaff,
  sampleMembers,
  sectionsOf,
  setRole,
  subjectsIn,
  weakChaptersOf,
  type College,
  type CollegeType,
  type MemberSummary,
  type Staff,
  type StaffRole,
} from "@/lib/college";
import { qrPath } from "@/lib/qr";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Placements } from "./placements";
import { Skyline3D, Tilt } from "./skyline-3d";

type Tab = "overview" | "sections" | "chapters" | "placements" | "students" | "faculty" | "privacy" | "reports";

/* ---------------- small parts ---------------- */

function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[14.5px] font-semibold text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
const toneText = (v: number | null) => (v == null ? "text-white/40" : v < 50 ? "text-rose-300" : v < 65 ? "text-amber-300" : "text-emerald-300");
const toneBar = (v: number | null) => (v == null ? "bg-white/15" : v < 50 ? "bg-rose-400" : v < 65 ? "bg-amber-400" : "bg-violet-400");
function Bar({ v, w = "w-28" }: { v: number | null; w?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-block h-1.5 overflow-hidden rounded-full bg-white/[0.07] align-middle", w)}>
        <span className={cn("block h-full rounded-full", toneBar(v))} style={{ width: `${v ?? 0}%` }} />
      </span>
      <span className={cn("tabular-nums text-[12.5px]", toneText(v))}>{v == null ? "—" : `${v}%`}</span>
    </span>
  );
}
function Status({ v }: { v: number | null }) {
  if (v == null) return <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">No tests</span>;
  return v < 50 ? <span className="rounded-md bg-rose-500/12 px-2 py-0.5 text-[11px] font-medium text-rose-300">Needs help</span> : v < 65 ? <span className="rounded-md bg-amber-400/12 px-2 py-0.5 text-[11px] font-medium text-amber-200">Watch</span> : <span className="rounded-md bg-emerald-400/12 px-2 py-0.5 text-[11px] font-medium text-emerald-300">On track</span>;
}
function Qr({ text, size = 132 }: { text: string; size?: number }) {
  const { d, size: n } = qrPath(text);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} className="rounded-lg bg-white" role="img" aria-label="QR code to join">
      <path d={d} fill="#0b0a14" />
    </svg>
  );
}
function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- sign in / set up ---------------- */

function Gate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-10">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(800px 400px at 50% -10%, rgba(124,58,237,0.25), transparent)" }} />
      <div className="relative w-full max-w-[880px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark size={28} />
          <Wordmark className="text-[18px]" />
          <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white/60">COLLEGE</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function SignedOut() {
  const roles = [
    { as: "admin", Icon: BuildingIcon, title: "Principal / college admin", text: "Set up your college, invite students and faculty, and see the whole college.", first: "Create account" },
    { as: "faculty", Icon: UsersIcon, title: "Faculty / placement officer", text: "Join your college with the two codes your admin shares, then see your classes and drives.", first: "Log in" },
  ] as const;
  return (
    <Gate>
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">College dashboard</h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] text-white/60">See where students are weak, who needs help, and run campus placements. Only students who agree to share are shown.</p>
      </div>
      <div className="mx-auto mt-8 grid max-w-[760px] gap-4 md:grid-cols-2">
        {roles.map((r) => {
          const next = encodeURIComponent(`/college?as=${r.as}`);
          const login = <Link href={`/login?next=${next}`} className={cn("inline-flex h-10 items-center rounded-xl px-5 text-[13.5px] font-semibold", r.first === "Log in" ? "bg-accent text-[#120826]" : "border border-white/15 font-medium text-white")}>Log in</Link>;
          const signup = <Link href={`/signup?next=${next}`} className={cn("inline-flex h-10 items-center rounded-xl px-5 text-[13.5px] font-semibold", r.first === "Create account" ? "bg-accent text-[#120826]" : "border border-white/15 font-medium text-white")}>Create account</Link>;
          return (
            <div key={r.as} className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-6 transition hover:border-accent/40">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-plum)] text-accent"><r.Icon size={22} /></span>
              <p className="mt-4 text-[17px] font-semibold text-white">{r.title}</p>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-white/55">{r.text}</p>
              <div className="mt-5 flex flex-wrap gap-2">{r.first === "Log in" ? <>{login}{signup}</> : <>{signup}{login}</>}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-[13px] text-white/50">
        Student? <Link href="/login" className="text-accent hover:underline">Open StudentOS</Link> · New to StudentOS for colleges? <Link href="/institutions" className="text-accent hover:underline">See what’s included</Link>
      </p>
    </Gate>
  );
}

function Setup() {
  const { state, actions, uid } = useStore();
  const faculty = useSearchParams().get("as") === "faculty";
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<CollegeType>("school");
  const [code, setCode] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [busy, setBusy] = useState<"" | "create" | "join">("");
  const [err, setErr] = useState("");
  const me = { name: state.profile.name || "Admin", email: state.profile.email || "" };

  const create = async () => {
    if (!uid) return;
    if (name.trim().length < 3) return setErr("Write the college name.");
    setBusy("create");
    setErr("");
    try {
      const c = await createCollege({ name, type, city, uid, staffName: me.name, email: me.email });
      actions.patch({ staffOf: { cid: c.id, name: c.name, role: "admin" } });
    } catch {
      setErr("Couldn’t create the college. Check your internet and try again.");
    } finally {
      setBusy("");
    }
  };
  const join = async () => {
    if (!uid) return;
    setBusy("join");
    setErr("");
    try {
      const c = await joinAsStaff({ code, staffCode, uid, name: me.name, email: me.email });
      if (!c) setErr("Those codes don’t match. Ask your college admin for the student code and the faculty code.");
      else actions.patch({ staffOf: { cid: c.id, name: c.name, role: "teacher" } });
    } catch {
      setErr("Couldn’t join. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Gate>
      <h1 className="text-center text-[26px] font-semibold text-white">{faculty ? "Join your college" : "Set up your college"}</h1>
      <p className="mt-2 text-center text-[13.5px] text-white/55">Signed in as {me.name}{me.email ? ` · ${me.email}` : ""}</p>
      <div className={cn("mt-8 grid gap-4", faculty ? "md:grid-cols-[1fr_1.2fr] [&>*:first-child]:md:order-2" : "md:grid-cols-[1.2fr_1fr]")}>
        <div className="rounded-2xl border border-accent/30 bg-[#0f0f11] p-6 shadow-[0_0_50px_-20px_rgba(167,139,250,0.6)]">
          <p className="text-[15px] font-semibold text-white">New college</p>
          <p className="mt-1 text-[12.5px] text-white/50">You become the admin. You get a code for students and one for faculty.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="cn">College name</Label>
              <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. St Joseph’s PU College" />
            </div>
            <div>
              <Label htmlFor="cc">City</Label>
              <Input id="cc" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Vijayapura" />
            </div>
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {([["school", "PU / school", "Exam readiness by chapter"], ["degree", "Degree / engineering", "Placement readiness"]] as const).map(([k, t, sub]) => (
                  <button key={k} type="button" onClick={() => setType(k)} className={cn("rounded-xl border p-3 text-left transition", type === k ? "border-accent/60 bg-[var(--color-plum)]" : "border-white/10 hover:border-white/25")}>
                    <span className="block text-[13px] font-semibold text-white">{t}</span>
                    <span className="mt-0.5 block text-[11.5px] text-white/50">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" onClick={create} loading={busy === "create"} disabled={!!busy} className="w-full">Create college</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-6">
          <p className="text-[15px] font-semibold text-white">I’m faculty</p>
          <p className="mt-1 text-[12.5px] text-white/50">Your college admin shares two codes with you.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="sc">Student code</Label>
              <Input id="sc" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6 letters" className="font-mono tracking-[0.2em]" />
            </div>
            <div>
              <Label htmlFor="fc">Faculty code</Label>
              <Input id="fc" value={staffCode} onChange={(e) => setStaffCode(e.target.value.toUpperCase())} placeholder="8 letters" className="font-mono tracking-[0.2em]" />
            </div>
            <Button onClick={join} loading={busy === "join"} disabled={!!busy || !code || !staffCode} className="w-full">Join as faculty</Button>
          </div>
        </div>
      </div>
      {err && <p className="mx-auto mt-5 max-w-lg rounded-lg bg-rose-500/10 px-3 py-2 text-center text-[12.5px] text-rose-300">{err}</p>}
      <p className="mt-6 text-center text-[12.5px] text-white/40">
        <Link href="/dashboard" className="hover:text-white">← Back to StudentOS</Link>
      </p>
    </Gate>
  );
}

/* ---------------- console ---------------- */

const NAV: { key: Tab; label: string; Icon: typeof HomeIcon; school?: string; degree?: string; only?: CollegeType }[] = [
  { key: "overview", label: "Overview", Icon: HomeIcon },
  { key: "sections", label: "Classes & sections", Icon: GridIcon },
  { key: "chapters", label: "Weak chapters", Icon: BookIcon, degree: "Placement readiness" },
  { key: "placements", label: "Placements", Icon: BriefcaseIcon, only: "degree" },
  { key: "students", label: "Students", Icon: UsersIcon },
  { key: "faculty", label: "Faculty", Icon: ShieldIcon },
  { key: "privacy", label: "Consent & privacy", Icon: LockIcon },
  { key: "reports", label: "Reports", Icon: FileIcon },
];

export function CollegeConsole() {
  const { state, status, uid, actions } = useStore();
  const link = state.staffOf;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (NAV.find((n) => n.key === params.get("tab"))?.key ?? "overview") as Tab;
  const go = (t: Tab) => router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`);

  const [college, setCollege] = useState<College | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [real, setReal] = useState<MemberSummary[]>([]);
  const [staffCode, setStaffCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sample, setSample] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);

  const load = async () => {
    if (!link) return;
    setLoading(true);
    setErr("");
    try {
      const [c, s, m] = await Promise.all([getCollege(link.cid), loadStaff(link.cid), loadMembers(link.cid)]);
      if (!c) throw new Error("missing");
      setCollege(c);
      setStaff(s);
      setReal(m);
      const mine = s.find((x) => x.uid === uid);
      if (mine?.role === "admin") setStaffCode(await getStaffCode(link.cid));
      if (mine && mine.role !== link.role) actions.patch({ staffOf: { ...link, role: mine.role } });
    } catch {
      setErr("Couldn’t load your college. Check your internet, then try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (status === "ready" && link) void load();
  }, [status, link?.cid]); // eslint-disable-line react-hooks/exhaustive-deps

  const type: CollegeType = college?.type ?? "school";
  const members = useMemo(() => (sample ? sampleMembers(type) : real), [sample, real, type]);
  const role: StaffRole = staff.find((x) => x.uid === uid)?.role ?? link?.role ?? "teacher";

  if (status === "loading") return <div className="min-h-screen bg-ink" />;
  if (status === "signed-out") return <SignedOut />;
  if (!link) return <Setup />;

  const joinUrl = college && typeof window !== "undefined" ? `${window.location.origin}/join?code=${college.code}` : "";
  const visibleNav = NAV.filter((n) => !(role === "viewer" && (n.key === "students" || n.key === "placements")) && (!n.only || n.only === type));

  const Side = (
    <aside className="flex h-full w-[236px] flex-col border-r border-white/[0.06] bg-[#0b0b0d] px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <LogoMark size={24} />
        <Wordmark className="text-[15px]" />
        <span className="ml-auto rounded-md border border-white/15 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider text-white/60">COLLEGE</span>
      </div>
      <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-white">{college?.name ?? link.name}</p>
        <p className="mt-0.5 text-[11.5px] text-white/45">{type === "school" ? "PU / school" : "Degree college"} · {role}</p>
      </div>
      <nav className="mt-4 space-y-0.5">
        {visibleNav.map(({ key, label, Icon, degree }) => (
          <button key={key} type="button" onClick={() => { go(key); setMenu(false); }} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] transition", tab === key ? "bg-[var(--color-plum)] text-white shadow-[inset_2px_0_0_#a78bfa]" : "text-white/65 hover:bg-white/[0.04] hover:text-white")}>
            <Icon size={16} /> {type === "degree" && degree ? degree : label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-1">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-white/55 hover:bg-white/[0.04] hover:text-white"><ArrowLeftIcon size={14} /> StudentOS app</Link>
        <button type="button" onClick={() => void logOut().then(() => router.replace("/login?next=/college"))} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-white/55 hover:bg-white/[0.04] hover:text-white"><LogOutIcon size={14} /> Log out</button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-ink">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{Side}</div>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenu(false)} aria-hidden />
          <div className="relative h-full w-[236px]">{Side}</div>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#0b0b0d]/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="rounded-lg p-2 text-white/80"><MenuIcon size={18} /></button>
        <span className="truncate text-[14px] font-semibold text-white">{college?.name ?? link.name}</span>
      </header>

      <main className="lg:pl-[236px]">
        <div className="pointer-events-none fixed inset-0 lg:left-[236px]" style={{ background: "radial-gradient(900px 340px at 35% -60px, rgba(124,58,237,0.2), transparent)" }} />
        <div className="relative px-5 py-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
              <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
              <div className="h-[380px] animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
          ) : err || !college ? (
            <div className="mx-auto max-w-md rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-6 text-center">
              <AlertCircleIcon size={24} className="mx-auto text-rose-300" />
              <p className="mt-3 text-[14px] text-white">{err || "College not found."}</p>
              <Button className="mt-4" onClick={() => void load()}>Try again</Button>
            </div>
          ) : (
            <>
              <Header college={college} tab={tab} type={type} sample={sample} setSample={setSample} realCount={real.length} />
              <div key={tab} className="page-enter mt-5">
                {tab === "overview" && <Overview college={college} members={members} joinUrl={joinUrl} go={go} />}
                {tab === "sections" && <Sections members={members} type={type} />}
                {tab === "chapters" && (type === "school" ? <Chapters members={members} /> : <Placement members={members} />)}
                {tab === "placements" && type === "degree" && role !== "viewer" && <Placements college={college} uid={uid} sample={sample} />}
                {tab === "students" && role !== "viewer" && <Students members={members} type={type} />}
                {tab === "faculty" && <Faculty college={college} staff={staff} role={role} staffCode={staffCode} reload={load} uid={uid} />}
                {tab === "privacy" && <Privacy members={members} sample={sample} />}
                {tab === "reports" && <Reports college={college} members={members} type={type} />}
              </div>
            </>
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Header({ college, tab, type, sample, setSample, realCount }: { college: College; tab: Tab; type: CollegeType; sample: boolean; setSample: (v: boolean) => void; realCount: number }) {
  const title = { overview: college.name, sections: "Classes & sections", chapters: type === "school" ? "Weak chapters" : "Placement readiness", placements: "Placements", students: "Students", faculty: "Faculty", privacy: "Consent & privacy", reports: "Reports" }[tab];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-[13px] text-white/55">
          {college.city ? `${college.city} · ` : ""}
          {type === "school" ? "PU / school" : "Degree college"} · {realCount} student{realCount === 1 ? "" : "s"} sharing
          {sample && <span className="ml-2 rounded-md bg-amber-400/15 px-2 py-0.5 text-[11.5px] font-medium text-amber-200">Showing sample data</span>}
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[12.5px] text-white/70">
        <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="h-3.5 w-3.5 accent-[#a78bfa]" />
        Preview with sample data
      </label>
    </div>
  );
}

/* ---------------- overview ---------------- */

function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub: ReactNode; tone?: string }) {
  return (
    <Tilt>
      <div className="p-5">
        <p className="text-[12px] text-white/50">{label}</p>
        <p className="mt-2 text-[30px] leading-none font-semibold text-white tabular-nums">{value}</p>
        <p className={cn("mt-2 text-[12px]", tone ?? "text-white/50")}>{sub}</p>
      </div>
    </Tilt>
  );
}

function Overview({ college, members, joinUrl, go }: { college: College; members: MemberSummary[]; joinUrl: string; go: (t: Tab) => void }) {
  const type = college.type;
  const active = members.filter((m) => isActive(m)).length;
  const readyAll = avg(members.map((m) => readinessOf(m, type)).filter((x): x is number => x != null));
  const help = needHelp(members, type);
  const grid = readinessGrid(members, type);

  if (!members.length) return <Invite college={college} joinUrl={joinUrl} big />;

  const weak = type === "school" ? chapterStats(members).filter((c) => c.tested >= 2).sort((a, b) => a.avg - b.avg).slice(0, 6) : [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Students sharing" value={members.length} sub="agreed to share progress" />
        <Kpi label="Active this week" value={active} sub={`${Math.round((active / members.length) * 100)}% of students`} tone="text-emerald-300" />
        <Kpi label={type === "school" ? "Average exam readiness" : "Average placement readiness"} value={readyAll == null ? "—" : `${readyAll}%`} sub={type === "school" ? "from chapter tests" : "interviews, coding, projects, resume"} />
        <Kpi label="Need help" value={help.length} sub="below 50% readiness" tone="text-rose-300" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel title={type === "school" ? "Readiness by section and subject" : "Placement readiness by section"} action={<span className="text-[11.5px] text-white/40">3D · each tower is one section</span>}>
          {grid.rows.length && grid.cols.length ? <Skyline3D rows={grid.rows} cols={grid.cols} values={grid.values} /> : <p className="py-16 text-center text-[13px] text-white/50">Towers appear once students take chapter tests.</p>}
        </Panel>
        <div className="space-y-5">
          {type === "school" ? (
            <Panel title="Where the class is struggling" action={<button type="button" onClick={() => go("chapters")} className="text-[12px] text-accent hover:underline">All chapters →</button>}>
              {weak.length ? (
                <ul className="space-y-2.5">
                  {weak.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-white">{c.chapter}</p>
                        <p className="text-[11.5px] text-white/45">{c.subject} · Class {c.grade} · {c.weak} of {c.tested} weak</p>
                      </div>
                      <Bar v={c.avg} w="w-16" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-white/50">Needs at least 2 students to test a chapter.</p>
              )}
            </Panel>
          ) : (
            <Panel title="What’s holding students back">
              {(["Interviews", "Coding", "Projects", "Resume"] as const).map((p) => {
                const v = avg(members.map((m) => placementParts(m)[p]));
                return (
                  <div key={p} className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-white/80">{p}</span>
                    <Bar v={v} />
                  </div>
                );
              })}
            </Panel>
          )}
          <Panel title="Students who need help first" action={<button type="button" onClick={() => go("students")} className="text-[12px] text-accent hover:underline">All students →</button>}>
            {help.length ? (
              <ul className="space-y-2">
                {help.slice(0, 5).map(({ m, r }) => (
                  <li key={m.uid} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-plum)] text-[11px] font-semibold text-violet-200">{m.name.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-white">{m.name}</p>
                      <p className="truncate text-[11.5px] text-white/45">{m.section} · {type === "school" ? weakChaptersOf(m, 2).join(", ") || "few tests" : `last active ${ago(m.lastActive).toLowerCase()}`}</p>
                    </div>
                    <span className={cn("text-[13px] font-semibold tabular-nums", toneText(r))}>{r}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-white/50">No one is below 50%. 🎉</p>
            )}
          </Panel>
        </div>
      </div>
      <Invite college={college} joinUrl={joinUrl} />
    </div>
  );
}

function Invite({ college, joinUrl, big }: { college: College; joinUrl: string; big?: boolean }) {
  const { actions } = useStore();
  const copy = (t: string, what: string) => void navigator.clipboard?.writeText(t).then(() => actions.toast(`${what} copied`));
  const msg = `Join ${college.name} on StudentOS so our teachers can see where we need help: ${joinUrl} (code ${college.code})`;
  return (
    <section className={cn("relative overflow-hidden rounded-2xl border border-accent/25 bg-[#0f0f11] p-6", big && "py-10")}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-8">
        <div className="min-w-[260px] flex-1">
          {big && <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-plum)] px-3 py-1 text-[11.5px] text-violet-200"><SparkleIcon size={12} /> Step 1</span>}
          <h2 className={cn("font-semibold text-white", big ? "text-[22px]" : "text-[15px]")}>{big ? "Invite your students" : "Invite more students"}</h2>
          <p className="mt-1.5 max-w-lg text-[13px] text-white/60">Students open the link or scan the QR, log in to StudentOS and agree to share. Their progress shows up here by itself.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 font-mono text-[20px] tracking-[0.3em] text-white">{college.code}</span>
            <Button size="sm" onClick={() => copy(joinUrl, "Link")}>Copy link</Button>
            <Button size="sm" variant="ghost" onClick={() => copy(msg, "Message")}>Copy WhatsApp message</Button>
          </div>
          {big && <p className="mt-4 text-[12px] text-white/45">Want to see how it looks first? Turn on “Preview with sample data” at the top.</p>}
        </div>
        {joinUrl && <Qr text={joinUrl} size={big ? 156 : 120} />}
      </div>
    </section>
  );
}

/* ---------------- sections ---------------- */

function Sections({ members, type }: { members: MemberSummary[]; type: CollegeType }) {
  if (!members.length) return <Empty />;
  const secs = sectionsOf(members);
  const subjects = subjectsIn(members);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {secs.map((s) => {
        const ms = members.filter((m) => m.section === s);
        const r = avg(ms.map((m) => readinessOf(m, type)).filter((x): x is number => x != null));
        const act = ms.filter((m) => isActive(m)).length;
        const rows =
          type === "school"
            ? subjects.slice(0, 5).map((sub) => [sub, avg(ms.flatMap((m) => Object.entries(m.chapters).filter(([k]) => k.replace(/^1[01]:/, "").startsWith(sub + "/")).map(([, [v]]) => v)))] as const)
            : (["Interviews", "Coding", "Projects", "Resume"] as const).map((p) => [p, avg(ms.map((m) => placementParts(m)[p]))] as const);
        const weakest = type === "school" ? chapterStats(ms).filter((c) => c.tested >= 2).sort((a, b) => a.avg - b.avg)[0] : null;
        return (
          <Tilt key={s}>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[16px] font-semibold text-white">{s}</p>
                  <p className="mt-0.5 text-[12px] text-white/50">{ms.length} students · {act} active this week</p>
                </div>
                <span className={cn("text-[24px] font-semibold tabular-nums", toneText(r))}>{r == null ? "—" : `${r}%`}</span>
              </div>
              <div className="mt-4 space-y-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[12.5px] text-white/70">{k}</span>
                    <Bar v={v} w="w-24" />
                  </div>
                ))}
              </div>
              {weakest && <p className="mt-4 rounded-lg bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-200">Weakest: {weakest.chapter} ({weakest.avg}%)</p>}
            </div>
          </Tilt>
        );
      })}
    </div>
  );
}

/* ---------------- chapters (school) ---------------- */

function Chapters({ members }: { members: MemberSummary[] }) {
  const subjects = subjectsIn(members);
  const [sub, setSub] = useState(subjects[0] ?? "");
  const [open, setOpen] = useState<string | null>(null);
  if (!members.length || !subjects.length) return <Empty text="Chapters show up once students take chapter tests in Exam Prep." />;
  const list = chapterStats(members).filter((c) => c.subject === sub).sort((a, b) => a.avg - b.avg);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <button key={s} type="button" onClick={() => setSub(s)} className={cn("h-8 rounded-lg border px-3 text-[12.5px] transition", sub === s ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>{s}</button>
        ))}
      </div>
      <Panel>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-white/45">
              <th className="pb-2 font-medium">Chapter</th>
              <th className="pb-2 font-medium">Class</th>
              <th className="pb-2 font-medium">Students tested</th>
              <th className="pb-2 font-medium">Weak (below 50%)</th>
              <th className="pb-2 font-medium">Average</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const weakOnes = members.filter((m) => (m.chapters[c.key]?.[0] ?? 100) < 50);
              return [
                <tr key={c.key} onClick={() => setOpen(open === c.key ? null : c.key)} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-3 text-white">{c.chapter}</td>
                  <td className="py-2.5 text-white/60">{c.grade}</td>
                  <td className="py-2.5 text-white/60 tabular-nums">{c.tested}</td>
                  <td className="py-2.5 tabular-nums"><span className={c.weak / c.tested >= 0.4 ? "text-rose-300" : "text-white/60"}>{c.weak} ({Math.round((c.weak / c.tested) * 100)}%)</span></td>
                  <td className="py-2.5"><Bar v={c.avg} w="w-24" /></td>
                  <td className="py-2.5 text-right">{c.avg < 50 ? <span className="rounded-md bg-rose-500/12 px-2 py-0.5 text-[11px] text-rose-300">Plan extra class</span> : c.avg < 65 ? <span className="rounded-md bg-amber-400/12 px-2 py-0.5 text-[11px] text-amber-200">Revise</span> : null}</td>
                </tr>,
                open === c.key && (
                  <tr key={c.key + "-o"}>
                    <td colSpan={6} className="pb-3">
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <p className="text-[12px] text-white/55">{weakOnes.length ? `Students below 50% (${weakOnes.length}) — invite them to an extra class:` : "No one is below 50% here."}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{weakOnes.map((m) => <span key={m.uid} className="rounded-md bg-white/[0.06] px-2 py-1 text-[12px] text-white/80">{m.name} · {m.section}</span>)}</div>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- placement (degree) ---------------- */

function Placement({ members }: { members: MemberSummary[] }) {
  if (!members.length) return <Empty />;
  const parts = ["Interviews", "Coding", "Projects", "Resume"] as const;
  const ready = members.filter((m) => placementReadiness(m) >= 65).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Placement-ready (65%+)" value={ready} sub={`${Math.round((ready / members.length) * 100)}% of students`} tone="text-emerald-300" />
        <Kpi label="Took a mock interview" value={members.filter((m) => m.interviews > 0).length} sub="at least one" />
        <Kpi label="Resume ready" value={members.filter((m) => m.resumeDone).length} sub="summary and skills filled" />
        <Kpi label="Have a project" value={members.filter((m) => m.projects > 0).length} sub="added in Projects" />
      </div>
      <Panel title="By section">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-white/45">
              <th className="pb-2 font-medium">Section</th>
              <th className="pb-2 font-medium">Students</th>
              {parts.map((p) => <th key={p} className="pb-2 font-medium">{p}</th>)}
              <th className="pb-2 font-medium">Overall</th>
            </tr>
          </thead>
          <tbody>
            {sectionsOf(members).map((s) => {
              const ms = members.filter((m) => m.section === s);
              return (
                <tr key={s} className="border-t border-white/[0.06]">
                  <td className="py-2.5 text-white">{s}</td>
                  <td className="py-2.5 text-white/60">{ms.length}</td>
                  {parts.map((p) => <td key={p} className="py-2.5"><Bar v={avg(ms.map((m) => placementParts(m)[p]))} w="w-14" /></td>)}
                  <td className="py-2.5"><Bar v={avg(ms.map((m) => placementReadiness(m)))} w="w-14" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- students ---------------- */

function Students({ members, type }: { members: MemberSummary[]; type: CollegeType }) {
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [only, setOnly] = useState<"all" | "help" | "inactive">("all");
  const [open, setOpen] = useState<string | null>(null);
  if (!members.length) return <Empty />;
  const list = members
    .map((m) => ({ m, r: readinessOf(m, type) }))
    .filter(({ m }) => (sec === "all" || m.section === sec) && m.name.toLowerCase().includes(q.toLowerCase()))
    .filter(({ m, r }) => (only === "help" ? r != null && r < 50 : only === "inactive" ? !isActive(m) : true))
    .sort((a, b) => (a.r ?? 101) - (b.r ?? 101));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" className="h-9 w-52 rounded-lg border border-white/10 bg-white/[0.03] pr-3 pl-8 text-[13px] text-white outline-none focus:border-accent" />
        </div>
        <select value={sec} onChange={(e) => setSec(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-[#121216] px-2 text-[13px] text-white/80 outline-none" aria-label="Section">
          <option value="all">All sections</option>
          {sectionsOf(members).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {([["all", "Everyone"], ["help", "Needs help"], ["inactive", "Inactive 7+ days"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setOnly(k)} className={cn("h-9 rounded-lg border px-3 text-[12.5px]", only === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60")}>{l}</button>
        ))}
        <span className="ml-auto text-[12px] text-white/45">{list.length} students</span>
      </div>
      <Panel>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] text-white/45">
              <th className="pb-2 font-medium">Student</th>
              <th className="pb-2 font-medium">Section</th>
              <th className="pb-2 font-medium">Readiness</th>
              <th className="hidden pb-2 font-medium md:table-cell">{type === "school" ? "Weak chapters" : "Interviews · Coding · Projects"}</th>
              <th className="pb-2 font-medium">Last active</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 200).map(({ m, r }) => [
              <tr key={m.uid} onClick={() => setOpen(open === m.uid ? null : m.uid)} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.02]">
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-plum)] text-[10.5px] font-semibold text-violet-200">{m.name.slice(0, 2).toUpperCase()}</span>
                    <span className="text-white">{m.name}</span>
                  </span>
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-white/60">{m.section}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap"><Bar v={r} w="w-20" /></td>
                <td className="hidden py-2.5 pr-4 text-[12.5px] text-white/60 md:table-cell">{type === "school" ? weakChaptersOf(m, 3).join(", ") || "—" : `${m.interviews} · ${m.codingSolved} · ${m.projects}`}</td>
                <td className={cn("py-2.5 pr-3 text-[12.5px] whitespace-nowrap", isActive(m) ? "text-white/60" : "text-amber-200")}>{ago(m.lastActive)}</td>
                <td className="py-2.5 text-right"><Status v={r} /></td>
              </tr>,
              open === m.uid && (
                <tr key={m.uid + "-o"}>
                  <td colSpan={6} className="pb-3">
                    <StudentDetail m={m} type={type} />
                  </td>
                </tr>
              ),
            ])}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function StudentDetail({ m, type }: { m: MemberSummary; type: CollegeType }) {
  const bySubject = subjectsIn([m]).map((s) => [s, avg(Object.entries(m.chapters).filter(([k]) => k.replace(/^1[01]:/, "").startsWith(s + "/")).map(([, [v]]) => v))] as const);
  const parts = placementParts(m);
  return (
    <div className="grid gap-4 rounded-xl bg-white/[0.03] p-4 md:grid-cols-3">
      <div>
        <p className="text-[11.5px] text-white/45">Course</p>
        <p className="text-[13px] text-white">{m.course || m.section}</p>
        <p className="mt-2 text-[11.5px] text-white/45">Activity</p>
        <p className="text-[13px] text-white/80">{m.testsTaken} chapter tests · {m.videosDone} videos · {m.modulesDone} lessons</p>
      </div>
      <div className="space-y-1.5">
        {(type === "school" ? bySubject : Object.entries(parts)).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-white/70">{k}</span>
            <Bar v={v as number | null} w="w-20" />
          </div>
        ))}
        {type === "school" && !bySubject.length && <p className="text-[12.5px] text-white/50">No chapter tests yet.</p>}
      </div>
      <div>
        <p className="text-[11.5px] text-white/45">{type === "school" ? "Weakest chapters" : "Mock interviews"}</p>
        <p className="text-[13px] text-white/80">{type === "school" ? weakChaptersOf(m, 5).join(", ") || "None below 50%" : m.interviews ? `${m.interviews} done, average ${m.interviewAvg}%` : "None yet"}</p>
        {type === "school" && <p className="mt-2 text-[11.5px] text-white/45">Exam readiness: <span className={toneText(examReadiness(m))}>{examReadiness(m) ?? "—"}%</span></p>}
      </div>
    </div>
  );
}

/* ---------------- faculty ---------------- */

function Faculty({ college, staff, role, staffCode, reload, uid }: { college: College; staff: Staff[]; role: StaffRole; staffCode: string | null; reload: () => void; uid: string | null }) {
  const { actions } = useStore();
  const admin = role === "admin";
  const change = async (s: Staff, r: StaffRole) => {
    await setRole(college.id, s, r).catch(() => actions.toast("Couldn’t change the role."));
    reload();
  };
  const remove = async (s: Staff) => {
    if (!window.confirm(`Remove ${s.name} from ${college.name}?`)) return;
    await removeStaff(college.id, s.uid).catch(() => actions.toast("Couldn’t remove."));
    reload();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title={`People with access · ${staff.length}`}>
        <ul className="divide-y divide-white/[0.06]">
          {staff.map((s) => (
            <li key={s.uid} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-plum)] text-[11.5px] font-semibold text-violet-200">{s.name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-white">{s.name}{s.uid === uid ? " (you)" : ""}</p>
                <p className="truncate text-[12px] text-white/45">{s.email}</p>
              </div>
              {admin && s.uid !== uid ? (
                <>
                  <select value={s.role} onChange={(e) => void change(s, e.target.value as StaffRole)} className="h-8 rounded-lg border border-white/10 bg-[#121216] px-2 text-[12.5px] text-white/80" aria-label="Role">
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button type="button" onClick={() => void remove(s)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-rose-300" aria-label="Remove"><XIcon size={14} /></button>
                </>
              ) : (
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11.5px] text-white/65 capitalize">{s.role}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <div className="space-y-5">
        <Panel title="Add faculty">
          {admin ? (
            <>
              <p className="text-[12.5px] text-white/60">Ask them to open <b className="text-white">/college</b> on StudentOS, choose “I’m faculty” and enter both codes:</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 p-3"><p className="text-[11px] text-white/45">Student code</p><p className="mt-1 font-mono text-[17px] tracking-[0.2em] text-white">{college.code}</p></div>
                <div className="rounded-xl border border-accent/30 bg-[var(--color-plum)]/40 p-3"><p className="text-[11px] text-white/45">Faculty code</p><p className="mt-1 font-mono text-[17px] tracking-[0.15em] text-white">{staffCode ?? "—"}</p></div>
              </div>
              <p className="mt-3 text-[11.5px] text-white/45">Keep the faculty code private. New faculty join as Teacher; you can change it here.</p>
            </>
          ) : (
            <p className="text-[12.5px] text-white/60">Only an admin can add faculty.</p>
          )}
        </Panel>
        <Panel title="Roles">
          {([["Admin", "Everything: all students, faculty, settings and reports."], ["Teacher", "All students and chapters; can plan extra classes."], ["Viewer", "Class-level numbers only. No student names."]] as const).map(([r, t]) => (
            <div key={r} className="flex gap-3 py-1.5">
              <CheckIcon size={14} className="mt-0.5 shrink-0 text-accent" />
              <p className="text-[12.5px] text-white/70"><b className="text-white">{r}</b> · {t}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- privacy ---------------- */

function Privacy({ members, sample }: { members: MemberSummary[]; sample: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="What you can see">
        {["Name and the class / section the student wrote", "Chapter test scores (average of recent tests)", "Videos, tests and lessons done, last active day", "Mock interview, coding, project and resume counts"].map((x) => (
          <p key={x} className="flex gap-2 py-1.5 text-[13px] text-white/75"><CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-300" />{x}</p>
        ))}
      </Panel>
      <Panel title="What you never see">
        {["AI chats and the questions students ask", "Notes and uploaded files", "Phone number, email, address", "Students who didn’t agree to share"].map((x) => (
          <p key={x} className="flex gap-2 py-1.5 text-[13px] text-white/65"><LockIcon size={14} className="mt-0.5 shrink-0 text-white/40" />{x}</p>
        ))}
      </Panel>
      <Panel title="How consent works" className="lg:col-span-2">
        <ol className="grid gap-3 md:grid-cols-3">
          {[["Student chooses", "Each student enters the college code and agrees on a screen that lists exactly what is shared. Under-18 students confirm a parent or guardian knows."], ["Updates by itself", "Their summary updates as they study. Nothing else is copied."], ["Stop any time", "A student can stop sharing in Settings → My college. Their data disappears from this dashboard straight away."]].map(([t, d], i) => (
            <li key={t} className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-[12px] font-semibold text-accent">{i + 1}. {t}</p>
              <p className="mt-1.5 text-[12.5px] text-white/65">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12px] text-white/45">{sample ? "Sample data is on, so these numbers are not real." : `${members.length} students have agreed to share right now.`}</p>
      </Panel>
    </div>
  );
}

/* ---------------- reports ---------------- */

function Reports({ college, members, type }: { college: College; members: MemberSummary[]; type: CollegeType }) {
  const day = new Date().toISOString().slice(0, 10);
  const students = () =>
    download(`${college.name} students ${day}.csv`, [
      ["Name", "Section", "Readiness %", "Last active", "Chapter tests", "Videos", "Mock interviews", "Interview avg %", "Coding solved", "Projects", "Resume ready", "Weak chapters"],
      ...members.map((m) => [m.name, m.section, readinessOf(m, type) ?? "", new Date(m.lastActive).toLocaleDateString("en-IN"), m.testsTaken, m.videosDone, m.interviews, m.interviewAvg, m.codingSolved, m.projects, m.resumeDone ? "Yes" : "No", weakChaptersOf(m, 5).join("; ")]),
    ]);
  const chapters = () =>
    download(`${college.name} chapters ${day}.csv`, [["Subject", "Class", "Chapter", "Students tested", "Weak (below 50%)", "Average %"], ...chapterStats(members).sort((a, b) => a.avg - b.avg).map((c) => [c.subject, c.grade, c.chapter, c.tested, c.weak, c.avg])]);
  const sections = () =>
    download(`${college.name} sections ${day}.csv`, [["Section", "Students", "Active this week", "Readiness %"], ...sectionsOf(members).map((s) => { const ms = members.filter((m) => m.section === s); return [s, ms.length, ms.filter((m) => isActive(m)).length, avg(ms.map((m) => readinessOf(m, type)).filter((x): x is number => x != null)) ?? ""]; })]);
  const items: [string, string, () => void, typeof BarChartIcon][] = [
    ["Students", "Every student: readiness, activity, weak chapters", students, UsersIcon],
    ["Sections", "Each class / section: students, active, readiness", sections, LayersIcon],
    ...(type === "school" ? ([["Chapters", "Every tested chapter, weakest first", chapters, BookIcon]] as [string, string, () => void, typeof BarChartIcon][]) : []),
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(([t, d, fn, Icon]) => (
          <Tilt key={t}>
            <div className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-plum)] text-accent"><Icon size={18} /></span>
              <p className="mt-4 text-[15px] font-semibold text-white">{t}</p>
              <p className="mt-1 text-[12.5px] text-white/55">{d}</p>
              <Button size="sm" className="mt-4" icon={<DownloadIcon size={13} />} onClick={fn} disabled={!members.length}>Download Excel (CSV)</Button>
            </div>
          </Tilt>
        ))}
      </div>
      <Panel title="Print a report for a staff meeting">
        <p className="text-[12.5px] text-white/60">Open the Overview, then press Print and choose “Save as PDF”.</p>
        <Button size="sm" className="mt-3" onClick={() => window.print()}>Print this page</Button>
      </Panel>
    </div>
  );
}

function Empty({ text = "No students have joined yet. Share your college code from the Overview, or turn on sample data to preview." }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
      <UsersIcon size={26} className="mx-auto text-white/35" />
      <p className="mx-auto mt-3 max-w-md text-[13.5px] text-white/60">{text}</p>
    </div>
  );
}
