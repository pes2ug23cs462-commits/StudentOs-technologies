"use client";

/* Placement prep: one place to see how ready you are, what to do this week,
   aptitude practice, how the big recruiters hire, and your campus drives. */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Aptitude } from "@/components/placement/aptitude";
import { CampusDrives, JoinForDrives } from "@/components/placement/campus-drives";
import { ArrowRightIcon, BriefcaseIcon, BuildingIcon, CheckIcon, CodeIcon, FileIcon, FolderIcon, MicIcon, OpenBookIcon, TargetIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { TOPIC, type TopicId } from "@/lib/aptitude";
import { PLACEMENT_PARTS, type PlacementPart } from "@/lib/college";
import { COMPANIES, gapCourses, myReadiness, resumeCheck, weekPlan, type Company } from "@/lib/placement-prep";
import { useStore } from "@/lib/store";
import { useOpenTopicCourse } from "@/components/chat/study-card";
import { cn } from "@/lib/utils";

type Tab = "overview" | "aptitude" | "companies" | "drives";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "aptitude", label: "Aptitude" },
  { key: "companies", label: "Companies" },
  { key: "drives", label: "Campus drives" },
];
const PART_LINK: Record<PlacementPart, { href: string; Icon: typeof TargetIcon; hint: string }> = {
  Aptitude: { href: "/placement?tab=aptitude", Icon: TargetIcon, hint: "Accuracy in your last 5 aptitude sets" },
  Interviews: { href: "/interview", Icon: MicIcon, hint: "Average of your last 5 mock interviews" },
  Coding: { href: "/code", Icon: CodeIcon, hint: "Coding problems solved (10 = full marks)" },
  Projects: { href: "/projects", Icon: FolderIcon, hint: "Projects added (3 = full marks)" },
  Resume: { href: "/resume", Icon: FileIcon, hint: "Resume checklist below" },
  Courses: { href: "/learn", Icon: OpenBookIcon, hint: "Course modules finished (10 = full marks)" },
};
const tone = (v: number) => (v >= 70 ? "bg-emerald-400" : v >= 40 ? "bg-amber-300" : "bg-rose-400");

export default function PlacementPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 lg:px-8" />}>
      <Placement />
    </Suspense>
  );
}

function Placement() {
  const qs = useSearchParams();
  const router = useRouter();
  const raw = qs?.get("tab");
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : "overview";
  const go = (t: Tab) => router.replace(t === "overview" ? "/placement" : `/placement?tab=${t}`, { scroll: false });
  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white">Placement prep</h1>
          <p className="mt-1 text-[13.5px] text-white/55">How ready you are, what to do this week, and practice for the tests companies give.</p>
        </div>
        <div role="tablist" aria-label="Placement sections" className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => go(t.key)} className={cn("h-8 rounded-lg px-3.5 text-[13px] font-medium transition", tab === t.key ? "bg-[var(--color-plum)] text-white" : "text-white/60 hover:text-white")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div key={tab} className="page-enter mt-6">
        {tab === "overview" && <Overview go={go} />}
        {tab === "aptitude" && <Aptitude startTopic={(qs?.get("topic") as TopicId) || null} startMock={qs?.get("mock") === "1"} focus={(qs?.get("focus") ?? "").split(",").filter((t: string): t is TopicId => !!TOPIC[t as TopicId])} focusFor={qs?.get("for") || undefined} />}
        {tab === "companies" && <Companies />}
        {tab === "drives" && <Drives />}
      </div>
    </div>
  );
}

/* ---------- overview ---------- */

function Overview({ go }: { go: (t: Tab) => void }) {
  const { state } = useStore();
  const { parts, overall } = useMemo(() => myReadiness(state), [state]);
  const plan = useMemo(() => weekPlan(state), [state]);
  const resume = useMemo(() => resumeCheck(state), [state]);
  const gaps = useMemo(() => gapCourses(state), [state]);
  const openCourse = useOpenTopicCourse();
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card className="p-6">
          <p className="text-[14px] font-semibold text-white">Your placement readiness</p>
          <div className="mt-4 flex flex-wrap items-center gap-7">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle cx="60" cy="60" r={R} fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - overall / 100)} className="transition-[stroke-dashoffset] duration-700" />
                <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-semibold text-white tabular-nums">{overall}</span>
                <span className="text-[11px] text-white/45">out of 100</span>
              </div>
            </div>
            <ul className="min-w-[240px] flex-1 space-y-2.5">
              {PLACEMENT_PARTS.map((p) => {
                const { href, Icon, hint } = PART_LINK[p];
                return (
                  <li key={p}>
                    <Link href={href} title={hint} className="group flex items-center gap-3">
                      <Icon size={14} className="text-white/40" />
                      <span className="w-[78px] text-[13px] text-white/80 group-hover:text-white">{p}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]"><span className={cn("block h-full rounded-full transition-all", tone(parts[p]))} style={{ width: `${Math.max(3, parts[p])}%` }} /></span>
                      <span className="w-9 text-right text-[12.5px] text-white/65 tabular-nums">{parts[p]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-4 text-[12px] text-white/45">{state.college ? "Your college sees this same score if you share progress with them." : "Aptitude 20%, interviews 25%, coding 20%, resume 15%, projects 10%, courses 10%."}</p>
        </Card>

        <Card className="p-6">
          <p className="text-[14px] font-semibold text-white">This week</p>
          <p className="mt-0.5 text-[12.5px] text-white/50">Picked from your weakest areas. It changes as you improve.</p>
          <ol className="mt-4 space-y-2">
            {plan.map((t, k) => (
              <li key={k}>
                <Link href={t.href} className="group flex items-start gap-3 rounded-xl border border-white/[0.07] px-3.5 py-3 transition hover:border-accent/40 hover:bg-white/[0.02]">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">{k + 1}</span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-white/85 group-hover:text-white">{t.text}</span>
                  <ArrowRightIcon size={14} className="mt-0.5 text-white/30 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {gaps.length > 0 && (
        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14px] font-semibold text-white">Courses for your weak areas</p>
            <p className="text-[12px] text-white/45">Finishing course modules also adds to your readiness.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {gaps.map((g) => (
              <div key={g.area} className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[11px] font-semibold tracking-wide text-rose-300 uppercase">Weak · {g.why}</p>
                <p className="mt-1 text-[14px] font-semibold text-white">{g.area}</p>
                {g.course ? (
                  <a
                    href={g.course.href}
                    onClick={(e) => {
                      const m = g.course?.make;
                      if (!m) return;
                      e.preventDefault();
                      openCourse(m);
                    }}
                    {...(g.course.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="mt-3 flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/[0.06] p-3 text-left transition hover:border-accent/50"
                  >
                    <OpenBookIcon size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-semibold tracking-wide text-accent uppercase">{g.course.external ? `Free · ${g.course.by} ↗` : g.course.make ? "Course on StudentOS · made for this topic" : "Course on StudentOS"}</span>
                      <span className="block text-[13px] font-medium text-white">{g.course.title}</span>
                    </span>
                  </a>
                ) : (
                  <Link href="/learn" className="mt-3 rounded-lg border border-white/10 p-3 text-[13px] text-white/75 hover:border-white/25">Find a course in Learning →</Link>
                )}
                <Link href={g.practice.href} className="mt-auto pt-3 text-[12.5px] font-medium text-accent hover:underline">{g.practice.label} →</Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">Resume check</p>
            <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums", resume.score >= 75 ? "bg-emerald-400/15 text-emerald-300" : resume.score >= 50 ? "bg-amber-400/15 text-amber-200" : "bg-rose-500/15 text-rose-300")}>{resume.score}/100</span>
          </div>
          <ul className="mt-4 space-y-2">
            {resume.items.map((it) => (
              <li key={it.text} className="flex items-center gap-2.5 text-[13px]">
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", it.ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/35")}>{it.ok ? <CheckIcon size={11} /> : <XIcon size={10} />}</span>
                <span className={it.ok ? "text-white/60" : "text-white/85"}>{it.text}</span>
              </li>
            ))}
          </ul>
          <Link href="/resume" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">Open Resume Creator <ArrowRightIcon size={13} /></Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">How companies hire</p>
            <button type="button" onClick={() => go("companies")} className="text-[12.5px] text-accent hover:underline">All companies →</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPANIES.map((c) => (
              <button key={c.id} type="button" onClick={() => go("companies")} className="rounded-xl border border-white/[0.07] px-3 py-3 text-left transition hover:border-accent/40">
                <p className="text-[13.5px] font-semibold text-white">{c.name}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-white/45">{c.steps.length} rounds · {c.program}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.07] px-3.5 py-3">
            <BriefcaseIcon size={16} className="text-white/45" />
            <p className="min-w-0 flex-1 text-[12.5px] text-white/65">{state.college ? `Drives from ${state.college.name} and StudentOS partners` : "Join your college to see its placement drives here"}</p>
            <button type="button" onClick={() => go("drives")} className="text-[12.5px] font-medium text-accent hover:underline">Open</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- companies ---------- */

function Companies() {
  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-amber-100/85">
        How these companies usually hire freshers, from public prep guides (checked November 2026). Rounds change between drives and roles, so your official invite is the final word.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {COMPANIES.map((c) => <CompanyCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function CompanyCard({ c }: { c: Company }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70"><BuildingIcon size={18} /></span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-white">{c.name}</p>
          <p className="text-[12.5px] text-white/50">{c.program}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2.5">
        {c.steps.map((s, k) => (
          <li key={s.name} className="flex gap-3">
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-white/70">{k + 1}</span>
            <p className="text-[13px] leading-snug"><span className="font-medium text-white">{s.name}.</span> <span className="text-white/60">{s.what}</span></p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-lg bg-cyan-400/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-cyan-100/85">{c.tip}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {c.practice.map((p) => (
          <Link key={p.label} href={p.href} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[12.5px] text-white/80 transition hover:border-accent/50 hover:text-white">
            Practise: {p.label}
          </Link>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[11.5px] text-white/40">
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Official careers site ↗</a>
        {c.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70 hover:underline">Source: {s.title}</a>
        ))}
      </div>
    </Card>
  );
}

/* ---------- drives ---------- */

function Drives() {
  const { state } = useStore();
  return state.college ? <CampusDrives /> : <JoinForDrives />;
}
