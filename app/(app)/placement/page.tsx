"use client";

/* Premium · Placement opportunities — coming soon.
   Shows what's coming, lets the student ask to be told when it opens, and
   a readiness checklist built from their own StudentOS data. No sample
   companies or jobs are shown, so nothing here can be mistaken for a real listing. */

import Link from "next/link";
import { PageHeader } from "@/components/free/parts";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, BellIcon, CheckIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const COMING: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "target", tone: "violet", title: "Matched opportunities", text: "Internships and jobs picked for your degree, skills, location and goals — not a long list to scroll." },
  { icon: "resume", tone: "emerald", title: "Apply with your StudentOS resume", text: "Your resume, projects and certificates go with every application, tailored to the role by AI." },
  { icon: "plan", tone: "cyan", title: "Application tracker", text: "Applied, test, interview, offer — see every application in one board with dates and reminders." },
  { icon: "mic", tone: "pink", title: "Prep for each role", text: "A mock interview, mock test and coding set made for the exact role before your interview day." },
];

export default function PlacementPage() {
  const { state, actions } = useStore();
  const notified = !!state.placementNotify;
  const r = state.resume;
  const ready = [
    { done: !!r && !!r.summary.trim() && r.entryIds.length > 0, label: "Resume with a summary and at least one project", href: "/resume", cta: "Open Resume Creator" },
    { done: (state.entries ?? []).length >= 2, label: "Two or more projects or experiences", href: "/projects", cta: "Add projects" },
    { done: (state.interviews ?? []).length > 0, label: "At least one mock interview", href: "/interview", cta: "Practise an interview" },
    { done: (state.tests ?? []).length > 0 || Object.keys(state.coding?.solved ?? {}).length > 0, label: "A mock test or a coding problem solved", href: "/tests", cta: "Open Practice Arena" },
    { done: Object.values(state.learning?.courses ?? {}).some((c) => c.certId), label: "A StudentOS certificate", href: "/learn", cta: "Finish a course" },
  ];
  const doneCount = ready.filter((x) => x.done).length;

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        icon="rocket"
        tone="amber"
        title="Placement Opportunities"
        sub="Internships and jobs matched to you, with an application tracker and prep for every role."
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[12px] font-semibold text-amber-300">Coming soon</span>
            <PremiumBadge />
          </div>
        }
      />

      {/* hero */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-violet-400/25 bg-[radial-gradient(120%_140%_at_85%_10%,#6d3fd6,#3b1d7a_45%,#160e2e_80%)] p-7 sm:p-9">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-3 py-1 text-[12px] font-medium text-[#ffffff]">We’re building this now</span>
            <h2 className="mt-4 text-[30px] leading-tight font-bold tracking-tight text-[#ffffff] sm:text-[36px]">From practice to placement, in one place.</h2>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[rgba(255,255,255,0.78)]">StudentOS will find opportunities that fit you, help you apply with a strong resume, and prepare you for each interview. Premium members get it first.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {notified ? (
                <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-[rgba(255,255,255,0.14)] px-5 text-[14px] font-semibold text-[#ffffff]">
                  <CheckIcon size={15} /> We’ll tell you when it opens
                </span>
              ) : (
                <button type="button" onClick={() => { actions.patch({ placementNotify: Date.now() }); actions.toast("Done — we’ll tell you in StudentOS when Placement opens."); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ffffff] px-5 text-[14px] font-semibold text-[#3b1d7a] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-95">
                  <BellIcon size={15} /> Notify me
                </button>
              )}
              {notified && (
                <button type="button" onClick={() => actions.patch({ placementNotify: undefined })} className="text-[12.5px] text-[rgba(255,255,255,0.7)] underline-offset-2 hover:underline">
                  Don’t notify me
                </button>
              )}
            </div>
          </div>
          {/* preview: shapes only, no real or sample companies */}
          <div aria-hidden className="relative hidden lg:block" style={{ perspective: 1000 }}>
            <div className="iv-float space-y-3" style={{ transform: "rotateY(-12deg) rotateX(6deg)" }}>
              {[0, 1, 2].map((k) => (
                <div key={k} className="flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur" style={{ marginLeft: k * 18 }}>
                  <span className="h-10 w-10 rounded-xl bg-[rgba(255,255,255,0.18)]" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-2.5 w-2/3 rounded-full bg-[rgba(255,255,255,0.35)]" />
                    <span className="block h-2 w-1/3 rounded-full bg-[rgba(255,255,255,0.2)]" />
                  </span>
                  <span className="rounded-full bg-[rgba(52,211,153,0.25)] px-2.5 py-1 text-[10.5px] font-semibold text-[#a7f3d0]">{["92% match", "87% match", "81% match"][k]}</span>
                </div>
              ))}
              <p className="pl-2 text-[11px] text-[rgba(255,255,255,0.55)]">Preview of the design — real listings come at launch.</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mt-9 text-[20px] font-bold text-white">What’s coming</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COMING.map((c) => (
          <Card key={c.title} className="p-5">
            <FancyIcon name={c.icon} tone={c.tone} size={46} />
            <p className="mt-4 text-[15px] font-semibold text-white">{c.title}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">{c.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-9 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[18px] font-bold text-white">Get placement-ready now</p>
            <span className="text-[13px] font-semibold text-white/70 tabular-nums">{doneCount}/{ready.length} done</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / ready.length) * 100}%` }} />
          </div>
          <ul className="mt-5 space-y-2.5">
            {ready.map((x) => (
              <li key={x.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", x.done ? "bg-emerald-400 text-[#ffffff]" : "border-2 border-white/20")}>{x.done && <CheckIcon size={12} />}</span>
                <span className={cn("min-w-0 flex-1 text-[13.5px]", x.done ? "text-white/55 line-through" : "text-white/85")}>{x.label}</span>
                {!x.done && (
                  <Link href={x.href} className="flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
                    {x.cta} <ArrowRightIcon size={12} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card glow className="flex flex-col justify-between p-6">
          <div>
            <p className="text-[18px] font-bold text-white">Why wait?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">Recruiters look at your resume, projects and how you do in interviews. Everything you build in StudentOS today will be ready to send the day Placement opens.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/resume" variant="primary">Build my resume</ButtonLink>
            <ButtonLink href="/tests">Practise</ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
