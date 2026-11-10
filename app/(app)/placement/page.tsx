"use client";

/* Premium · Placement opportunities — launching soon.
   Early-access sign-up, an illustration of how matching will work (built from
   the student's own profile), a preview of the application board, what's
   included, and a readiness checklist from their StudentOS data. No sample
   companies, jobs or match scores are shown, so nothing can be mistaken for a
   real listing. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, BellIcon, CheckIcon, FileIcon, MicIcon, PlanIcon, TargetIcon } from "@/components/ui/icons";
import { Card, LogoMark } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Cat = "apply" | "prep";
const FEATURES: { cat: Cat; Icon: typeof TargetIcon; title: string; text: string }[] = [
  { cat: "apply", Icon: TargetIcon, title: "Matched opportunities", text: "Internships and jobs picked for your degree, skills and location, without a long list to scroll." },
  { cat: "apply", Icon: FileIcon, title: "Apply with your StudentOS resume", text: "Your resume, projects and certificates go with every application, tailored to the role." },
  { cat: "apply", Icon: PlanIcon, title: "Application tracker", text: "Applied, test, interview, offer. See every step on one board, with dates and reminders." },
  { cat: "prep", Icon: MicIcon, title: "Prep for each role", text: "A mock interview, mock test and coding set built for the exact role before your interview day." },
];
const FILTERS: { key: "all" | Cat; label: string }[] = [
  { key: "all", label: "All" },
  { key: "apply", label: "Apply" },
  { key: "prep", label: "Prep" },
];

export default function PlacementPage() {
  const { state, actions } = useStore();
  const notified = !!state.placementNotify;
  const [filter, setFilter] = useState<"all" | Cat>("all");
  const [msg, setMsg] = useState("");

  // what matching will use: the student's own details (nothing invented)
  const you = useMemo(() => {
    const a = state.setup?.academic;
    const skills = [...(state.resume?.skills ?? []), ...(state.setup?.skills.familiar ?? [])];
    const list = [a?.course, a?.specialization || a?.field, ...skills].map((x) => (x ?? "").trim()).filter((x) => x && x !== "Not chosen yet");
    const fill = ["Your projects", "Your resume", "Your location", "Your goals"];
    return [...new Set([...list, ...fill])].slice(0, 4);
  }, [state.setup, state.resume]);

  const r = state.resume;
  const ready = [
    { done: !!r && !!r.summary.trim() && r.entryIds.length > 0, label: "Resume with a summary and at least one project", href: "/resume", cta: "Open Resume Creator" },
    { done: (state.entries ?? []).length >= 2, label: "Two or more projects or experiences", href: "/projects", cta: "Add projects" },
    { done: (state.interviews ?? []).length > 0, label: "At least one mock interview", href: "/interview", cta: "Practise an interview" },
    { done: (state.tests ?? []).length > 0 || Object.keys(state.coding?.solved ?? {}).length > 0, label: "A mock test or a coding problem solved", href: "/tests", cta: "Open Practice Arena" },
    { done: Object.values(state.learning?.courses ?? {}).some((c) => c.certId), label: "A StudentOS certificate", href: "/learn", cta: "Finish a course" },
  ];
  const doneCount = ready.filter((x) => x.done).length;
  const shown = FEATURES.filter((f) => filter === "all" || f.cat === filter);

  const join = () => {
    actions.patch({ placementNotify: Date.now() });
    setMsg("You’re on the early-access list. We’ll tell you here in StudentOS when listings open.");
  };

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* ---------- hero ---------- */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-white/75">
              <span className="ui-live" aria-hidden /> Launching soon
            </p>
            <PremiumBadge />
          </div>
          <h1 className="mt-5 max-w-[560px] text-[32px] leading-[1.12] font-semibold tracking-[-0.025em] text-white sm:text-[40px]">
            Find your first role, <span className="text-white/45">without the endless scroll.</span>
          </h1>
          <p className="mt-4 max-w-[520px] text-[14.5px] leading-relaxed text-white/60">
            StudentOS matches internships and jobs to your degree and skills, helps you apply with a tailored resume, and prepares you for every interview.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {notified ? (
              <>
                <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 text-[13.5px] font-semibold text-emerald-300">
                  <CheckIcon size={14} /> You’re on the early-access list
                </span>
                <button type="button" onClick={() => { actions.patch({ placementNotify: undefined }); setMsg(""); }} className="text-[12.5px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
                  Leave the list
                </button>
              </>
            ) : (
              <button type="button" onClick={join} className="bg-accent inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-black hover:bg-accent-hover">
                <BellIcon size={15} /> Get early access
              </button>
            )}
          </div>
          <p role="status" aria-live="polite" className="mt-2 min-h-[18px] text-[12.5px] text-emerald-300">{msg}</p>
          <p className="text-[12px] text-white/40">Early-access members get the first look at listings. No spam.</p>
        </div>

        <MatchGraphic you={you} />
      </section>

      {/* ---------- board preview ---------- */}
      <section className="mt-16">
        <p className="text-[11.5px] font-semibold tracking-[0.08em] text-[var(--cyan)] uppercase">Preview</p>
        <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-white">One board for every application</h2>
        <p className="mt-1 text-[13.5px] text-white/55">Track each application from applied to offer, with dates and reminders in one place.</p>
        <Board />
        <p className="mt-2 text-[11.5px] text-white/40">Illustrative preview. Real listings open at launch.</p>
      </section>

      {/* ---------- what's included ---------- */}
      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.08em] text-[var(--cyan)] uppercase">What’s included</p>
            <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-white">Everything from search to offer</h2>
          </div>
          <div role="group" aria-label="Filter features" className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn("h-8 rounded-lg px-3.5 text-[12.5px] font-medium transition-colors", filter === f.key ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div key={filter} className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-2">
          {shown.map((f, i) => (
            <article key={f.title} className="pl-feature group bg-ink p-6 transition-colors hover:bg-white/[0.02]" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[var(--cyan)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <f.Icon size={16} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 max-w-[420px] text-[13px] leading-relaxed text-white/55">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- readiness ---------- */}
      <section className="mt-16 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[17px] font-semibold text-white">Get placement-ready now</p>
            <span className="text-[13px] font-semibold text-white/70 tabular-nums">{doneCount}/{ready.length} done</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(doneCount / ready.length) * 100}%` }} />
          </div>
          <ul className="mt-5 space-y-2">
            {ready.map((x) => (
              <li key={x.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", x.done ? "bg-emerald-400 text-[#ffffff]" : "border-[1.5px] border-white/25")}>{x.done && <CheckIcon size={11} />}</span>
                <span className={cn("min-w-0 flex-1 basis-[calc(100%-2.5rem)] text-[13.5px] sm:basis-auto", x.done ? "text-white/50 line-through" : "text-white/85")}>{x.label}</span>
                {!x.done && (
                  <Link href={x.href} className="group/cta ml-8 flex items-center gap-1 text-[12.5px] font-semibold text-accent sm:ml-0">
                    {x.cta} <ArrowRightIcon size={12} className="transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col justify-between p-6">
          <div>
            <p className="text-[17px] font-semibold text-white">Why start now?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">Recruiters look at your resume, projects and how you do in interviews. Everything you build in StudentOS today is ready to send the day Placement opens.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/resume" variant="primary">Build my resume</ButtonLink>
            <ButtonLink href="/tests">Practise</ButtonLink>
          </div>
        </Card>
      </section>
    </div>
  );
}

const LY = [41, 124, 206, 289];
const RY = [55, 165, 275];

/* How matching will work: the student's own details flow into StudentOS,
   which lights up role slots one by one. Shapes only on the right. */
function MatchGraphic({ you }: { you: string[] }) {
  return (
    <div aria-hidden className="relative hidden h-[330px] select-none md:block">
      <svg viewBox="0 0 520 330" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {LY.map((y, i) => (
          <path key={`l${i}`} d={`M150 ${y} C 210 ${y}, 210 165, 260 165`} className="pl-wire" />
        ))}
        {RY.map((y, i) => (
          <path key={`r${i}`} d={`M260 165 C 310 165, 310 ${y}, 360 ${y}`} className="pl-wire" />
        ))}
        {LY.map((y, i) => (
          <circle key={`d${i}`} r="2.6" className="pl-dot" style={{ offsetPath: `path("M150 ${y} C 210 ${y}, 210 165, 260 165")`, animationDelay: `${i * 0.55}s` }} />
        ))}
        {RY.map((y, i) => (
          <circle key={`e${i}`} r="2.6" className="pl-dot pl-dot-out" style={{ offsetPath: `path("M260 165 C 310 165, 310 ${y}, 360 ${y}")`, animationDelay: `${1.1 + i * 1.2}s` }} />
        ))}
      </svg>

      {/* you */}
      <div className="absolute top-0 left-0 flex h-full w-[29%] flex-col justify-around">
        {you.map((t, i) => (
          <span key={t + i} className="pl-chip truncate rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/75" style={{ animationDelay: `${i * 90}ms` }}>
            {t}
          </span>
        ))}
      </div>

      {/* StudentOS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="pl-pulse absolute inset-0 rounded-2xl" />
        <span className="relative flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-violet-400/30 bg-panel">
          <LogoMark size={32} />
        </span>
      </div>

      {/* role slots (shapes only) */}
      <div className="absolute top-0 right-0 flex h-full w-[31%] flex-col justify-around">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pl-slot rounded-xl border border-white/[0.08] bg-white/[0.02] p-3" style={{ animationDelay: `${1.6 + i * 1.2}s` }}>
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 shrink-0 rounded-md bg-white/[0.08]" />
              <span className="flex-1 space-y-1.5">
                <span className="block h-1.5 w-4/5 rounded-full bg-white/20" />
                <span className="block h-1.5 w-1/2 rounded-full bg-white/10" />
              </span>
            </span>
            <span className="pl-slot-tag mt-2 inline-block rounded-full bg-[rgb(34_211_238/0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cyan)]">Matched to you</span>
          </div>
        ))}
      </div>
      <p className="absolute right-0 -bottom-6 text-[11px] text-white/35">Illustration of how matching will work</p>
    </div>
  );
}

/* Application board: a card moves from Applied to Interview on a loop. */
function Board() {
  const Item = ({ meta, active, className }: { meta: string; active?: boolean; className?: string }) => (
    <div className={cn("rounded-xl border px-3.5 py-3", active ? "border-violet-400/40 bg-[var(--color-plum)]" : "border-white/[0.08] bg-white/[0.03]", className)}>
      <p className="text-[13px] font-medium text-white">Role title</p>
      <p className="mt-0.5 text-[11.5px] text-white/50">{meta}</p>
    </div>
  );
  const Col = ({ title, count, children }: { title: string; count: number | string; children: React.ReactNode }) => (
    <div className="min-w-0 rounded-xl bg-white/[0.02] p-3">
      <p className="mb-3 flex items-center gap-2 px-1 text-[12.5px] font-semibold text-white/80">
        {title} <span className="rounded-md bg-white/[0.07] px-1.5 py-px text-[11px] text-white/60 tabular-nums">{count}</span>
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
  return (
    <div role="img" aria-label="Illustrative application tracker with three columns: Applied, Interview and Offer" className="relative mt-5 grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.015] p-3 sm:grid-cols-3">
      <Col title="Applied" count={3}>
        <Item meta="Company · Mon" />
        <Item meta="Company · Thu" />
        <Item meta="Company · Fri" className="pl-mover" />
      </Col>
      <Col title="Interview" count={1}>
        <Item meta="Tomorrow, 11:00" active />
        <div className="pl-landing overflow-hidden">
          <Item meta="Company · Fri" className="border-violet-400/30" />
        </div>
      </Col>
      <Col title="Offer" count={0}>
        <div className="rounded-xl border border-dashed border-white/[0.1] px-3.5 py-5 text-center text-[12px] text-white/40">Offers you receive appear here</div>
      </Col>
    </div>
  );
}
