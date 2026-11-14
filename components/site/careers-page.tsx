"use client";

/* Careers (/careers). Roles, how hiring works and an application form.
   Roles come from lib/careers (the team posts them in /partner → Careers).
   Applying saves the application on StudentOS and gives the AI interview link. */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { Glass, TiltCard, delay as d, usePointerVars } from "@/components/site/motion";
import { SiteShell } from "@/components/site/site-shell";
import { ArrowRightIcon, CheckIcon, MailIcon, XIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { CAREER_TEAMS, DEFAULT_CAREERS, careersApi, careersErrorText, fmtWhen, loadCareers, type CareerRole, type CareerTeam, type CareersDoc } from "@/lib/careers";
import { cn } from "@/lib/utils";


const PERKS: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "rocket", tone: "violet", title: "Real product, real users", text: "What you build goes live for students, not into a drawer." },
  { icon: "users", tone: "cyan", title: "Work with the founders", text: "Small team, direct feedback, no layers in between." },
  { icon: "laptop", tone: "indigo", title: "Remote and flexible", text: "Planned around your college timetable and exams." },
  { icon: "diamond", tone: "pink", title: "Own your work", text: "Pick a problem, ship it, and put it in your portfolio." },
];

const VALUES: { icon: FancyIconName; tone: FancyTone; label: string }[] = [
  { icon: "target", tone: "violet", label: "Student-first" },
  { icon: "bolt", tone: "amber", label: "Ship fast" },
  { icon: "heart", tone: "pink", label: "Kind and honest" },
  { icon: "sprout", tone: "emerald", label: "Always learning" },
];

const TEAM: { name: string; role: string; tone: string }[] = [
  { name: "Rahul Rathod", role: "Founder & CEO", tone: "from-violet-500 to-fuchsia-500" },
  { name: "Mahesh Ajjer", role: "Co-founder · Marketing", tone: "from-amber-400 to-pink-500" },
  { name: "Manmohan Gowda", role: "Co-founder · Technical", tone: "from-cyan-400 to-indigo-500" },
];

const LOOK: Record<CareerTeam, { icon: FancyIconName; tone: FancyTone }> = {
  Engineering: { icon: "code", tone: "indigo" },
  Design: { icon: "palette", tone: "pink" },
  Marketing: { icon: "megaphone", tone: "amber" },
  Content: { icon: "quiz", tone: "violet" },
  Operations: { icon: "target", tone: "emerald" },
};
const look = (r: CareerRole) => (/\b(ai|ml)\b/i.test(r.title) ? { icon: "bot" as const, tone: "cyan" as const } : LOOK[r.team] ?? LOOK.Engineering);

const STEPS: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "mail", tone: "violet", title: "Apply", text: "Fill the short form. It takes 2 minutes." },
  { icon: "bot", tone: "cyan", title: "AI interview", text: "A short interview with our AI, in the time window you get. Type or speak." },
  { icon: "chat", tone: "emerald", title: "Team review", text: "Our team reads your answers and the AI’s notes, and calls if it’s a fit." },
  { icon: "rocket", tone: "amber", title: "Offer", text: "We send your offer letter, you meet the team and start." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Who can apply?", a: "College students from any year and any branch. What you’ve built matters more than marks." },
  { q: "Is it paid?", a: "These internships are unpaid right now. Each role card says so; we’ll update it when that changes." },
  { q: "Is it remote?", a: "Yes. Work is planned around your classes and exams." },
  { q: "How long does it last?", a: "Three months to start with." },
  { q: "How does the AI interview work?", a: "After you apply you get a link. Open it within your time window, then answer 5–8 questions by typing or speaking. It takes about 15 minutes. People on our team make the final decision, not the AI." },
  { q: "I don’t see my role.", a: "Apply anyway with “Other” and tell us what you’d like to work on." },
];


function HiringBadge({ open, className }: { open: boolean; className?: string }) {
  return open ? (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      We’re hiring
    </span>
  ) : (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200", className)}>Applications paused</span>
  );
}

/* ---------- hero 3D scene: glowing logo tile with orbiting role cards ---------- */
function HeroScene() {
  const ref = usePointerVars<HTMLDivElement>();
  const layer = (depth: number) => ({ transform: `translate3d(calc(var(--mx,0) * ${depth}px), calc(var(--my,0) * ${depth}px), 0)`, transition: "transform 0.8s cubic-bezier(0.2,0.8,0.2,1)" });
  return (
    <div ref={ref} className="relative mx-auto h-[420px] w-full max-w-[560px] [perspective:1300px] sm:h-[480px]" aria-hidden>
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(var(--my,0) * -8deg)) rotateY(calc(var(--mx,0) * 12deg))", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}>
        {/* glow + sweeping light ribbons */}
        <div className="absolute top-1/2 left-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.55),rgba(34,211,238,0.1)_65%,transparent)] blur-2xl" />
        <div className="absolute top-[18%] -right-10 h-[300px] w-[160px] rotate-[28deg] rounded-[60px] bg-gradient-to-b from-violet-500/40 to-transparent blur-sm" />
        <div className="absolute bottom-[8%] -left-6 h-[220px] w-[120px] -rotate-[30deg] rounded-[60px] bg-gradient-to-b from-fuchsia-500/30 to-transparent blur-sm" />

        {/* big glass logo tile */}
        <div className="absolute top-1/2 left-1/2" style={layer(10)}>
          <div className="-translate-x-1/2 -translate-y-1/2">
            <div className="hero-pop" style={d(0.1)}>
              <div className="relative flex h-[210px] w-[210px] items-center justify-center rounded-[48px] border border-violet-300/30 bg-[linear-gradient(150deg,rgba(139,92,246,0.45),rgba(30,20,70,0.85))] shadow-[0_40px_90px_-20px_rgba(124,58,237,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] [animation:land-float-3d_7s_ease-in-out_infinite] sm:h-[240px] sm:w-[240px]">
                <span className="absolute inset-0 overflow-hidden rounded-[48px]">
                  <span className="absolute inset-y-0 left-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent [animation:land-sweep_4s_ease-in-out_infinite]" />
                </span>
                <Image src="/studentos-mark.png" alt="" width={300} height={300} priority className="relative h-[62%] w-[62%] object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>

        {/* orbit ring */}
        <div className="absolute top-1/2 left-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/25 [transform:translate(-50%,-50%)_rotateX(74deg)]">
          <div className="absolute inset-0 [animation:hero-orbit_9s_linear_infinite]">
            <span className="absolute top-1/2 -left-[6px] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_#22d3ee,0_0_34px_#22d3ee]" />
          </div>
        </div>

        {/* floating role cards */}
        {[
          { pos: "top-[4%] left-[0%]", depth: 34, delay: 0.4, icon: "bot" as const, tone: "cyan" as const, t: "AI/ML", s: "Build smarter study tools" },
          { pos: "top-[10%] right-[0%]", depth: 42, delay: 0.6, icon: "palette" as const, tone: "pink" as const, t: "Design", s: "Craft every screen" },
          { pos: "bottom-[10%] left-[2%]", depth: 38, delay: 0.8, icon: "megaphone" as const, tone: "amber" as const, t: "Marketing", s: "Reach every campus" },
          { pos: "bottom-[2%] right-[4%]", depth: 46, delay: 1, icon: "quiz" as const, tone: "violet" as const, t: "Content", s: "Tell our story" },
        ].map((c, i) => (
          <div key={c.t} className={cn("absolute", c.pos, i % 2 === 1 && "hidden sm:block")} style={layer(c.depth)}>
            <div className="hero-in" style={d(c.delay)}>
              <Glass className="flex items-center gap-3 p-3 pr-4" style={{ animation: `hero-bob ${6 + i}s ease-in-out ${i * 0.4}s infinite` }}>
                <FancyIcon name={c.icon} tone={c.tone} size={40} />
                <span>
                  <span className="block text-[13px] font-semibold text-white">{c.t}</span>
                  <span className="block text-[11px] text-white/55">{c.s}</span>
                </span>
              </Glass>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- culture visual: stacked 3D “workspace” screens ---------- */
function CultureVisual() {
  const ref = usePointerVars<HTMLDivElement>();
  return (
    <div ref={ref} className="relative h-[330px] [perspective:1200px]" aria-hidden>
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(10deg + var(--my,0) * -6deg)) rotateY(calc(-14deg + var(--mx,0) * 10deg))", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}>
        <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.4),transparent)] blur-2xl" />
        {/* main screen: a team board */}
        <div className="land-glass absolute top-0 left-0 w-[88%] overflow-hidden rounded-[22px] border-violet-300/40! [transform:translateZ(0px)]">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-rose-400/80" />
            <span className="h-2 w-2 rounded-full bg-amber-300/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <span className="ml-3 flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
              <LogoMark size={14} /> StudentOS · Team board
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {[
              { h: "Ideas", c: "bg-violet-500/70", items: ["Exam mode", "Group study"] },
              { h: "Building", c: "bg-cyan-400/70", items: ["Course quiz", "Landing 3D"] },
              { h: "Shipped", c: "bg-emerald-400/70", items: ["Voice input", "Reviews"] },
            ].map((col, i) => (
              <div key={col.h}>
                <p className="text-[10.5px] font-semibold tracking-wide text-white/50 uppercase">{col.h}</p>
                <div className="mt-2 space-y-2">
                  {col.items.map((t, k) => (
                    <div key={t} className="reveal rounded-lg border border-white/10 bg-white/[0.05] p-2" style={d(0.1 + (i + k) * 0.08)}>
                      <span className={cn("mb-1.5 block h-1 w-8 rounded-full", col.c)} />
                      <span className="text-[11px] text-white/80">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
            {["violet", "cyan", "pink", "amber"].map((t, i) => (
              <span key={t} className={cn("-ml-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#151126] text-[10px] font-bold text-[#ffffff] first:ml-0", ["bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-amber-500"][i])}>
                {["R", "A", "S", "K"][i]}
              </span>
            ))}
            <span className="text-[11px] text-white/50">+ you?</span>
          </div>
        </div>
        {/* front card */}
        <div className="absolute right-0 bottom-0 w-[44%] [transform:translateZ(90px)]">
          <Glass className="overflow-hidden rounded-[18px] border-violet-300/40! p-4 [animation:hero-bob_6s_ease-in-out_infinite]">
            <div className="flex items-center gap-2">
              <FancyIcon name="rocket" tone="violet" size={34} />
              <span className="text-[12px] font-semibold text-white">Shipped this week</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {[90, 70, 50].map((w, i) => (
                <span key={i} className="block h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${w}%` }} />
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

/* ---------- application form: saved on StudentOS, then the AI interview link ---------- */
function ApplyDialog({ roleId, roles, onClose }: { roleId: string; roles: CareerRole[]; onClose: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", college: "", roleId, resume: "", links: "", why: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ token: string; start: number; end: number; ai: boolean; again?: boolean } | null>(null);
  const missing = f.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(f.email.trim()) || f.phone.replace(/\D/g, "").length < 10 || f.college.trim().length < 2 || !/^https?:\/\/\S+\.\S+/.test(f.resume.trim());
  const field = "mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-violet-400/60";
  const role = roles.find((r) => r.id === f.roleId);
  const submit = async () => {
    setTried(true);
    setErr("");
    if (missing) return;
    setBusy(true);
    try {
      setDone(await careersApi<{ token: string; start: number; end: number; ai: boolean; again?: boolean }>("apply", f));
    } catch (e) {
      setErr(careersErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const link = done ? `${typeof window !== "undefined" ? window.location.origin : ""}/careers/interview/${done.token}` : "";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Apply to StudentOS" className="relative max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#121118] p-6 sm:rounded-3xl sm:p-7">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
        {done ? (
          <div className="py-2 text-center">
            <div className="mx-auto w-fit"><FancyIcon name="check" tone="emerald" size={64} /></div>
            <h3 className="mt-4 text-[22px] font-semibold text-white">{done.again ? "You’ve already applied" : "Application sent!"}</h3>
            {done.ai ? (
              <>
                <p className="mx-auto mt-2 max-w-[380px] text-[14px] leading-relaxed text-white/65">Next is a short <b className="text-white">AI interview</b> (about 15 minutes). Type or speak your answers.</p>
                <div className="mt-5 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-left">
                  <p className="text-[12px] font-semibold tracking-wide text-violet-200 uppercase">Finish it between</p>
                  <p className="mt-1 text-[15px] font-semibold text-white">{fmtWhen(done.start)} – {fmtWhen(done.end)} <span className="text-[12px] font-normal text-white/50">IST</span></p>
                  <p className="mt-2 text-[12px] text-white/55">We also emailed you this link. Keep it private.</p>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <a href={link} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[14.5px] font-semibold text-[#ffffff]">{Date.now() >= done.start ? "Start interview now" : "Open my interview page"} <ArrowRightIcon size={15} /></a>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(link)} className="h-12 rounded-xl border border-white/15 px-4 text-[13.5px] font-medium text-white/80 hover:text-white">Copy link</button>
                </div>
              </>
            ) : (
              <p className="mx-auto mt-2 max-w-[380px] text-[14px] leading-relaxed text-white/65">Our team will read it and get back to you by email or phone.</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <FancyIcon name="mail" tone="violet" size={42} />
              <div>
                <h3 className="text-[19px] font-semibold text-white">Apply to StudentOS</h3>
                <p className="text-[12.5px] text-white/55">{role?.ai !== false && role ? "Takes 2 minutes. Then a short AI interview." : "Takes 2 minutes."}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3.5">
              <label className="block text-[13px] font-medium text-white/80">Full name<input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" /></label>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block text-[13px] font-medium text-white/80">Email<input className={field} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@college.edu" /></label>
                <label className="block text-[13px] font-medium text-white/80">Phone (WhatsApp)<input className={field} type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98765 43210" /></label>
              </div>
              <label className="block text-[13px] font-medium text-white/80">College, course and year<input className={field} value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} placeholder="e.g. B.Tech CSE, 3rd year, Mysuru" /></label>
              <label className="block text-[13px] font-medium text-white/80">
                Role
                <select className={field} value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-[13px] font-medium text-white/80">Resume link<input className={field} value={f.resume} onChange={(e) => setF({ ...f, resume: e.target.value })} placeholder="https://drive.google.com/… (set to “Anyone with the link”)" /></label>
              <label className="block text-[13px] font-medium text-white/80">Portfolio, GitHub, LinkedIn <span className="font-normal text-white/40">(optional)</span><input className={field} value={f.links} onChange={(e) => setF({ ...f, links: e.target.value })} placeholder="https://…" /></label>
              <label className="block text-[13px] font-medium text-white/80">Why StudentOS? <span className="font-normal text-white/40">(optional)</span><textarea className={cn(field, "h-24 resize-none py-2.5")} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="A few lines about you and what you’d like to build" /></label>
            </div>
            {tried && missing && <p className="mt-3 text-[12.5px] text-rose-300">Add your name, a valid email, a 10-digit phone, your college and a resume link starting with https://</p>}
            {err && <p className="mt-3 text-[12.5px] text-rose-300">{err}</p>}
            <button type="button" disabled={busy} onClick={() => void submit()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[14.5px] font-semibold text-[#ffffff] shadow-[0_12px_40px_rgba(139,92,246,0.4)] transition hover:-translate-y-0.5 disabled:opacity-60">
              {busy ? "Sending…" : "Submit application"} {!busy && <ArrowRightIcon size={15} />}
            </button>
            <p className="mt-3 text-center text-[11.5px] text-white/40">We use these details only for hiring.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function CareersPage() {
  const [data, setData] = useState<CareersDoc>(DEFAULT_CAREERS);
  useEffect(() => {
    void loadCareers().then(setData);
  }, []);
  const live = data.roles.filter((r) => !r.paused);
  const HIRING_OPEN = data.open && live.length > 0;
  const TEAMS = ["All", ...CAREER_TEAMS.filter((t) => live.some((r) => r.team === t))] as ("All" | CareerTeam)[];
  const [team, setTeam] = useState<"All" | CareerTeam>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [apply, setApply] = useState<string | null>(null);
  const [faq, setFaq] = useState<number | null>(0);
  const roles = useMemo(() => live.filter((r) => team === "All" || r.team === team), [team, live]);
  return (
    <SiteShell>
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_60%_at_70%_20%,rgba(139,92,246,0.38),transparent_70%)]" />
          <div className="land-floor absolute inset-x-[-20%] bottom-[-14%] h-[50%] opacity-70" />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-8 px-5 pt-12 pb-16 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <div className="hero-in flex flex-wrap items-center gap-2" style={d(0)}>
              <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">Careers at StudentOS</span>
              <HiringBadge open={HIRING_OPEN} />
            </div>
            <h1 className="hero-in mt-5 text-[42px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[60px]" style={d(0.1)}>
              Build the future <br className="hidden sm:block" />
              of <span className="land-shine">student success</span>
            </h1>
            <p className="hero-in mt-5 max-w-[520px] text-[16.5px] leading-relaxed text-white/62" style={d(0.25)}>
              StudentOS helps students plan, learn, practise interviews and get placed. Join the team building it, while you’re still a student yourself.
            </p>
            <div className="hero-in mt-7 flex flex-wrap gap-3" style={d(0.4)}>
              <a href="#roles" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-[14.5px] font-semibold text-[#ffffff] shadow-[0_12px_40px_rgba(139,92,246,0.45)] transition hover:-translate-y-0.5">
                See open roles <ArrowRightIcon size={15} className="transition group-hover:translate-x-1" />
              </a>
              <a href="#process" className="inline-flex h-12 items-center rounded-xl border border-violet-400/40 bg-white/[0.03] px-6 text-[14.5px] font-medium text-white/90 transition hover:border-violet-300">
                How hiring works
              </a>
            </div>
            <div className="hero-in mt-8 flex flex-wrap gap-6" style={d(0.55)}>
              {[[String(live.length), live.length === 1 ? "open role" : "open roles"], ["Remote", "around your classes"], ["3 founders", "+ PM + 10 interns"]].map(([v, l]) => (
                <div key={l}>
                  <p className="text-[22px] font-bold text-white">{v}</p>
                  <p className="text-[12px] text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <HeroScene />
        </div>

        {/* perks strip */}
        <div className="relative mx-auto max-w-[1200px] px-5 pb-16">
          <div className="reveal land-glass grid gap-6 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <div key={p.title} className="group flex items-start gap-3.5">
                <FancyIcon name={p.icon} tone={p.tone} size={48} />
                <span>
                  <span className="block text-[15px] font-semibold text-white">{p.title}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-white/55">{p.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- roles ---------- */}
      <section id="roles" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">Open roles</span>
              <h2 className="mt-4 text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">Find your place</h2>
              <p className="mt-2 text-[14.5px] text-white/55">Tap a role to see what you’ll do and what we look for.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEAMS.map((t) => (
                <button key={t} type="button" onClick={() => setTeam(t)} className={cn("h-9 rounded-full border px-4 text-[13px] font-medium transition", team === t ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-white/60 hover:text-white")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {!HIRING_OPEN && (
            <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <p className="text-[15px] font-semibold text-white">No open roles right now</p>
              <p className="mt-1 text-[13.5px] text-white/55">You can still send us your profile. We’ll write when something opens.</p>
            </div>
          )}
          <div className="mt-10 space-y-3">
            {(HIRING_OPEN ? roles : []).map((r, i) => {
              const isOpen = open === r.id;
              return (
                <div key={r.id} className="reveal" style={d(0.06 * i)}>
                  <div className={cn("rounded-3xl border bg-ink transition", isOpen ? "border-violet-400/50" : "border-white/10 hover:border-violet-400/35")}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-4 p-5 text-left sm:p-6">
                      <FancyIcon name={look(r).icon} tone={look(r).tone} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold text-white">{r.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-white/55">{[r.team, r.where, r.pay, r.length].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="hidden flex-wrap gap-1.5 md:flex">
                        {r.tags.map((t) => <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11.5px] text-white/65">{t}</span>)}
                      </span>
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition", isOpen && "rotate-90 text-white")}><ArrowRightIcon size={14} /></span>
                    </button>
                    {isOpen && (
                      <div className="grid gap-6 border-t border-white/[0.07] p-5 sm:p-6 md:grid-cols-[1fr_1fr_auto]">
                        {[["What you’ll do", r.does], ["What we look for", r.wants]].map(([h, list]) => (
                          <div key={h as string}>
                            <p className="text-[12px] font-semibold tracking-wide text-white/45 uppercase">{h as string}</p>
                            <ul className="mt-3 space-y-2">
                              {(list as string[]).map((x) => <li key={x} className="flex gap-2 text-[13.5px] text-white/75"><CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {x}</li>)}
                            </ul>
                          </div>
                        ))}
                        <div className="flex items-end">
                          {HIRING_OPEN ? (
                            <button type="button" onClick={() => setApply(r.id)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-[14px] font-semibold text-[#ffffff] shadow-[0_10px_30px_rgba(139,92,246,0.4)] transition hover:-translate-y-0.5">
                              Apply <ArrowRightIcon size={14} />
                            </button>
                          ) : (
                            <span className="text-[13px] text-white/45">Applications paused</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- culture + team ---------- */}
      <section id="culture" className="mx-auto grid max-w-[1200px] scroll-mt-20 items-center gap-12 px-5 py-20 lg:grid-cols-2">
        <div className="reveal">
          <CultureVisual />
        </div>
        <div className="reveal" style={d(0.1)}>
          <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">Our culture</span>
          <h2 className="mt-4 text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">Student-first, builder-first</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/62">A small team of founders, a product manager and student interns. We use StudentOS ourselves, so every fix is personal.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {VALUES.map((v, i) => (
              <span key={v.label} className="reveal inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pr-4 pl-1.5 text-[13.5px] font-medium text-white/85" style={d(0.08 * i)}>
                <FancyIcon name={v.icon} tone={v.tone} size={30} /> {v.label}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {TEAM.map((m) => (
              <TiltCard key={m.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-[14px] font-bold text-[#ffffff]", m.tone)}>{m.name.split(" ").map((x) => x[0]).join("")}</span>
                <p className="mt-3 text-[14px] font-semibold text-white">{m.name}</p>
                <p className="text-[12px] text-white/55">{m.role}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- process ---------- */}
      <section id="process" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="reveal text-center">
            <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">How hiring works</span>
            <h2 className="mt-4 text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">Four simple steps</h2>
          </div>
          <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute top-[34px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-violet-500/0 via-violet-400/50 to-cyan-400/0 lg:block" />
            {STEPS.map((s, i) => (
              <div key={s.title} className="reveal relative text-center" style={d(0.1 * i)}>
                <div className="mx-auto flex w-fit flex-col items-center">
                  <FancyIcon name={s.icon} tone={s.tone} size={68} />
                  <span className="-mt-3 rounded-full border border-white/10 bg-ink px-2 py-0.5 text-[11px] font-semibold text-white/70">Step {i + 1}</span>
                </div>
                <p className="mt-3 text-[16px] font-semibold text-white">{s.title}</p>
                <p className="mx-auto mt-1 max-w-[230px] text-[13px] leading-relaxed text-white/55">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mx-auto max-w-[860px] px-5 py-20">
        <h2 className="reveal text-center text-[30px] font-bold tracking-tight sm:text-[38px]">Questions</h2>
        <div className="mt-8 space-y-2.5">
          {FAQ.map((f, i) => (
            <div key={f.q} className="reveal rounded-2xl border border-white/10 bg-white/[0.03]" style={d(0.05 * i)}>
              <button type="button" onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-white">
                {f.q}
                <span className={cn("text-[20px] leading-none text-white/50 transition", faq === i && "rotate-45 text-violet-300")}>+</span>
              </button>
              {faq === i && <p className="px-5 pb-4 text-[14px] leading-relaxed text-white/62">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-[1200px] px-5 pb-20">
        <div className="reveal land-ring rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-[linear-gradient(120deg,rgba(124,58,237,0.45),rgba(124,58,237,0.12)_55%,rgba(34,211,238,0.08))] p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <FancyIcon name="mail" tone="violet" size={56} float />
              <div>
                <h2 className="text-[26px] font-bold tracking-tight sm:text-[32px]">Don’t see a role for you?</h2>
                <p className="mt-2 max-w-[520px] text-[14.5px] text-white/70">Tell us what you’d like to build. Good people get a place even without a listed role.</p>
              </div>
            </div>
            <button type="button" onClick={() => setApply("other")} className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#ffffff] px-6 text-[14.5px] font-semibold text-[#3b0764] shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5">
              <MailIcon size={16} /> Send your profile
            </button>
          </div>
        </div>
      </section>

      {apply && <ApplyDialog roleId={apply} roles={live} onClose={() => setApply(null)} />}
    </SiteShell>
  );
}
