"use client";

/* For institutions (/institutions): what a PU college, school or degree college
   gets on StudentOS: the readiness dashboard (live 3D preview with clearly
   labelled sample data), campus placements, privacy, the free pilot and a demo
   request that opens the visitor's own email app (no server needed). */

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Skyline3D } from "@/components/college/skyline-3d";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { TextRevealFaqs } from "@/components/landing/text-reveal-faqs";
import { Eyebrow, TiltCard, delay as d } from "@/components/site/motion";
import { CONTACT_EMAIL, SiteShell } from "@/components/site/site-shell";
import { ArrowRightIcon, CheckIcon, LockIcon, SendIcon } from "@/components/ui/icons";
import { readinessGrid, sampleMembers } from "@/lib/college";
import { cn } from "@/lib/utils";

const FOR: { title: string; who: string; icon: FancyIconName; tone: FancyTone; points: string[] }[] = [
  {
    title: "PU colleges & schools",
    who: "Class 10, 1st & 2nd PUC, CBSE 11–12",
    icon: "target",
    tone: "violet",
    points: ["Readiness of every section in every subject", "Weak chapters, with the names of students below 50%", "Plan extra classes where the class is really stuck", "Students prepare with chapter videos, notes and tests"],
  },
  {
    title: "Degree & engineering colleges",
    who: "BCom, BCA, BSc, BE / BTech, MBA, MCA",
    icon: "rocket",
    tone: "cyan",
    points: ["Placement readiness: interviews, coding, projects, resume", "Post campus drives with eligibility rules", "Send test and interview links only to shortlisted students", "Track rounds, offers and who is placed"],
  },
];

const FEATURES: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "target", tone: "violet", title: "3D readiness view", text: "Every section and subject at a glance. Turn it, tap a tower, see the number." },
  { icon: "quiz", tone: "pink", title: "Weak chapters", text: "Chapters ranked weakest first, with how many students are below 50%." },
  { icon: "users", tone: "amber", title: "Who needs help", text: "Students sorted by readiness, with inactive students flagged." },
  { icon: "laptop", tone: "cyan", title: "Campus drives", text: "Post a company, set branch, CGPA and backlog rules; only eligible students can apply." },
  { icon: "mail", tone: "sky", title: "Links to the right students", text: "Tests and interview links go only to the students you shortlist." },
  { icon: "certificate", tone: "emerald", title: "Offers & placed report", text: "Add offers, students accept in the app, download the placed list." },
  { icon: "shield", tone: "indigo", title: "Faculty roles", text: "Admin, teacher and viewer access. Viewers see class numbers only." },
  { icon: "resume", tone: "violet", title: "Reports", text: "Download students, sections and chapters as Excel for staff meetings." },
];

const STEPS = [
  { t: "Set up your college", d: "Create your college on StudentOS in two minutes. You get a student code and a faculty code." },
  { t: "Share the code", d: "Students scan the QR or open the link, and agree to share their progress." },
  { t: "See where to help", d: "Readiness, weak chapters and placements update by themselves as students study." },
];

const FAQ = [
  { q: "Which institutions is this for?", a: "PU colleges, schools (Class 10 to 12) and degree colleges, including engineering, commerce, arts and management." },
  { q: "Do students have to pay?", a: "No. Students use StudentOS free. The college pays for the dashboard and placements after the free pilot." },
  { q: "Can the college see students’ chats or notes?", a: "No. Only test scores, activity and placement details are shared, and only by students who agree. They can stop any time." },
  { q: "Do we need to install anything?", a: "No. It works in the browser on any laptop or phone. Faculty log in with a StudentOS account." },
  { q: "What happens after the pilot?", a: "If it helps, you continue on a yearly plan priced by the number of students. If it doesn’t, you stop; nothing to cancel." },
  { q: "Who can post placement drives?", a: "Only the admin and the placement coordinator. Teachers can see placements but can’t change them, and the database enforces this." },
];

function DemoForm() {
  const [f, setF] = useState({ name: "", role: "", college: "", city: "", contact: "", students: "" });
  const [sent, setSent] = useState(false);
  const ok = f.name.trim() && f.college.trim() && f.contact.trim().length >= 6;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const body = [`Name: ${f.name}`, `Role: ${f.role}`, `Institution: ${f.college}`, `City: ${f.city}`, `Phone / email: ${f.contact}`, `Students: ${f.students}`].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Demo request · ${f.college}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  const field = "h-11 w-full rounded-xl border border-white/10 bg-ink/60 px-3.5 text-[14px] text-white placeholder:text-white/35 outline-none transition focus:border-accent";
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input className={field} placeholder="Your name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Your name" />
      <input className={field} placeholder="Your role (Principal, TPO…)" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Your role" />
      <input className={cn(field, "sm:col-span-2")} placeholder="Institution name *" value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} aria-label="Institution name" />
      <input className={field} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} aria-label="City" />
      <input className={field} placeholder="Number of students" value={f.students} onChange={(e) => setF({ ...f, students: e.target.value })} aria-label="Number of students" />
      <input className={cn(field, "sm:col-span-2")} placeholder="Phone or email *" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} aria-label="Phone or email" />
      <button type="submit" disabled={!ok} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 sm:col-span-2">
        <SendIcon size={15} /> Book a free demo
      </button>
      <p className="text-[12px] text-white/45 sm:col-span-2">{sent ? "Your email app opened with the details. Send it and we’ll call you within a day." : "This opens your email app with the details filled in. We reply within a day."}</p>
    </form>
  );
}

export function InstitutionsPage() {
  const [kind, setKind] = useState<"school" | "degree">("school");
  const grid = useMemo(() => readinessGrid(sampleMembers(kind), kind), [kind]);

  return (
    <SiteShell>
      {/* hero with a live 3D preview */}
      <section className="relative overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(124,58,237,0.32),transparent_70%)]" />
          <div className="land-floor absolute inset-x-[-20%] bottom-[-20%] h-[60%] opacity-60" />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-16 pb-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="hero-in text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">For institutions</p>
            <h1 className="hero-in mt-3 text-[40px] leading-[1.06] font-bold tracking-tight sm:text-[54px]" style={d(0.1)}>
              See where every student <span className="land-shine">needs help.</span>
            </h1>
            <p className="hero-in mt-5 max-w-[540px] text-[16px] leading-relaxed text-white/62" style={d(0.2)}>
              One dashboard for your PU college, school or degree college: exam readiness by section and chapter, students who need help, and campus placements from drive to offer.
            </p>
            <div className="hero-in mt-7 flex flex-wrap gap-3" style={d(0.3)}>
              <a href="#demo" className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5">
                Book a free demo <ArrowRightIcon size={15} />
              </a>
              <Link href="/college" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 px-6 text-[14.5px] font-medium text-white transition hover:border-white/30">
                Set up your college
              </Link>
            </div>
            <p className="hero-in mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/50" style={d(0.4)}>
              {["Free 1-month pilot", "Free for students", "Student consent built in"].map((x) => (
                <span key={x} className="inline-flex items-center gap-1.5"><CheckIcon size={13} className="text-emerald-300" /> {x}</span>
              ))}
            </p>
          </div>
          <div className="hero-in" style={d(0.25)}>
            <div className="rounded-3xl border border-white/10 bg-[#0d0c14]/90 p-5 shadow-[0_40px_120px_-40px_rgba(124,58,237,0.7)] backdrop-blur">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-white">{kind === "school" ? "Readiness by section and subject" : "Placement readiness by section"}</p>
                  <p className="text-[11.5px] text-amber-200/80">Sample data · live 3D preview</p>
                </div>
                <div className="flex rounded-lg border border-white/10 p-0.5 text-[12px]">
                  {([["school", "PU / school"], ["degree", "Degree"]] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={cn("h-7 rounded-md px-2.5 whitespace-nowrap", kind === k ? "bg-violet-600/40 text-white" : "text-white/55")}>{l}</button>
                  ))}
                </div>
              </div>
              <Skyline3D key={kind} rows={grid.rows} cols={grid.cols} values={grid.values} height={360} />
            </div>
          </div>
        </div>
      </section>

      {/* who it's for */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="reveal text-center">
          <Eyebrow>Built for</Eyebrow>
          <h2 className="mt-3 text-[32px] font-semibold tracking-tight sm:text-[42px]">Two kinds of institutions, one dashboard</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FOR.map((x, i) => (
            <TiltCard key={x.title} className="reveal rounded-3xl" style={d(0.08 * i)} max={6}>
              <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                <FancyIcon name={x.icon} tone={x.tone} size={48} />
                <h3 className="mt-5 text-[22px] font-semibold text-white">{x.title}</h3>
                <p className="mt-1 text-[13px] text-white/50">{x.who}</p>
                <ul className="mt-5 space-y-2.5">
                  {x.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14px] text-white/75"><CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {p}</li>
                  ))}
                </ul>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="reveal text-center">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mt-3 text-[32px] font-semibold tracking-tight sm:text-[42px]">Everything your teachers and placement cell need</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="reveal rounded-2xl border border-white/10 bg-ink/60 p-5" style={d(0.04 * i)}>
                <FancyIcon name={f.icon} tone={f.tone} size={38} />
                <p className="mt-4 text-[15px] font-semibold text-white">{f.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/58">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="reveal text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-[32px] font-semibold tracking-tight sm:text-[42px]">Live in a day</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="reveal relative rounded-2xl border border-white/10 bg-white/[0.03] p-6" style={d(0.08 * i)}>
              <span className="land-shine text-[40px] font-bold">{i + 1}</span>
              <p className="mt-2 text-[17px] font-semibold text-white">{s.t}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/58">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* privacy */}
      <section className="mx-auto max-w-[1200px] px-5 pb-20">
        <div className="reveal grid gap-8 rounded-3xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(124,58,237,0.06))] p-8 sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Privacy</Eyebrow>
            <h2 className="mt-3 text-[30px] leading-tight font-semibold tracking-tight">Students choose what you see</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/62">Every student agrees on a screen that lists exactly what is shared. Under-18 students confirm a parent knows. Anyone can stop sharing, and their data leaves your dashboard straight away.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-ink/60 p-5">
              <p className="text-[13px] font-semibold text-emerald-300">You see</p>
              {["Chapter test scores", "Activity and last active day", "Interview, coding and project counts", "Placement details for applications"].map((x) => <p key={x} className="mt-2 flex gap-2 text-[13px] text-white/75"><CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-300" />{x}</p>)}
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink/60 p-5">
              <p className="text-[13px] font-semibold text-white/80">You never see</p>
              {["AI chats and questions", "Notes and uploaded files", "Phone, email, address", "Students who didn’t agree"].map((x) => <p key={x} className="mt-2 flex gap-2 text-[13px] text-white/60"><LockIcon size={14} className="mt-0.5 shrink-0 text-white/40" />{x}</p>)}
            </div>
          </div>
        </div>
      </section>

      {/* pilot + demo */}
      <section id="demo" className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(124,58,237,0.3),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div className="reveal">
            <Eyebrow>Free pilot</Eyebrow>
            <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">
              Try it free for <span className="land-shine">one month</span>
            </h2>
            <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/62">We set it up with you, your students join, and you see real numbers within a week. Continue only if it helps; the price depends on your number of students and we share it on the call.</p>
            <ul className="mt-7 space-y-2.5 text-[14px] text-white/75">
              {["We set it up with your team in one visit or call", "Students join with a code or QR in a few minutes", "Students choose what they share with the college", "No payment until you decide to continue"].map((x) => (
                <li key={x} className="flex gap-2.5"><CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="reveal rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8" style={d(0.1)}>
            <p className="text-[20px] font-semibold text-white">Book a free demo</p>
            <p className="mt-1 mb-5 text-[13.5px] text-white/55">15 minutes, at your college or on a call.</p>
            <DemoForm />
          </div>
        </div>
      </section>

      {/* FAQ, with the same blur text reveal as the landing page */}
      <section id="faq" className="reveal mx-auto max-w-[1080px] scroll-mt-20 px-5 py-24">
        <TextRevealFaqs items={FAQ} sub="Everything colleges ask us before a pilot." />
      </section>
    </SiteShell>
  );
}

/** The “For institutions” band on the landing page. */
export function InstitutionsBand() {
  const grid = useMemo(() => readinessGrid(sampleMembers("school"), "school"), []);
  return (
    <section id="institutions" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-24">
      <div className="reveal grid items-center gap-10 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(34,211,238,0.05))] p-8 sm:p-12 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <Eyebrow>For institutions</Eyebrow>
          <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">
            Colleges see where students <span className="land-shine">need help</span>
          </h2>
          <p className="mt-3 max-w-[460px] text-[14.5px] leading-relaxed text-white/62">A dashboard for PU colleges, schools and degree colleges: weak chapters by section, students who need help, and campus placements from drive to offer. Students choose what to share.</p>
          <ul className="mt-5 space-y-2 text-[14px] text-white/75">
            {["Exam readiness in 3D, by section and subject", "Campus drives, shortlists, test links and offers", "Free 1-month pilot"].map((x) => (
              <li key={x} className="flex gap-2"><CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {x}</li>
            ))}
          </ul>
          <Link href="/institutions" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5">
            See it for your college <ArrowRightIcon size={15} />
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d0c14]/90 p-4">
          <p className="mb-1 text-[11.5px] text-amber-200/80">Sample data · live 3D preview</p>
          <Skyline3D rows={grid.rows} cols={grid.cols} values={grid.values} height={320} />
        </div>
      </div>
    </section>
  );
}
