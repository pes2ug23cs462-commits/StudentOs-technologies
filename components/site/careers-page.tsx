"use client";

/* Careers (/careers). A PREVIEW: hiring hasn’t opened yet, and the page says so
   clearly. Edit the roles and wording below when hiring starts, then set
   HIRING_OPEN to true so the Apply buttons open an email. */

import Image from "next/image";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { Glass, TiltCard, delay as d, usePointerVars } from "@/components/site/motion";
import { CONTACT_EMAIL, SiteShell } from "@/components/site/site-shell";
import { ArrowRightIcon, MailIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** Flip to true when applications open. */
const HIRING_OPEN = false;

const PERKS: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "rocket", tone: "violet", title: "High Impact", text: "Work on a product that helps students study better every day." },
  { icon: "users", tone: "cyan", title: "Grow Together", text: "Learn, build and level up with a small, driven team." },
  { icon: "laptop", tone: "indigo", title: "Flexible Work", text: "Remote-friendly and planned around your college." },
  { icon: "diamond", tone: "pink", title: "Real Ownership", text: "Take initiative, own your work and see real results." },
];

const VALUES: { icon: FancyIconName; tone: FancyTone; label: string }[] = [
  { icon: "target", tone: "violet", label: "Collaborative" },
  { icon: "bolt", tone: "amber", label: "Fast-Paced" },
  { icon: "heart", tone: "pink", label: "Inclusive" },
  { icon: "sprout", tone: "emerald", label: "Learning-Driven" },
];

const ROLES: { icon: FancyIconName; tone: FancyTone; title: string; meta: string[]; tags: string[] }[] = [
  { icon: "bot", tone: "cyan", title: "AI/ML Intern", meta: ["Remote", "Unpaid (3 Months)"], tags: ["AI", "ML", "Python"] },
  { icon: "palette", tone: "pink", title: "UI/UX Design Intern", meta: ["Remote", "Unpaid (3 Months)"], tags: ["Figma", "UX", "Design"] },
  { icon: "megaphone", tone: "amber", title: "Marketing Intern", meta: ["Remote", "Unpaid (3 Months)"], tags: ["Content", "Growth", "Social"] },
  { icon: "quiz", tone: "violet", title: "Content & Graphics Intern", meta: ["Remote", "Unpaid (3 Months)"], tags: ["Content", "Design", "Branding"] },
];

const mailto = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Hi StudentOS team,\n\nName:\nCollege, course and year:\nRole:\nLinks (resume / portfolio / GitHub):\nWhy I want to join:\n")}`;

function SoonBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
      </span>
      Launching soon
    </span>
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
          <div key={c.t} className={cn("absolute", c.pos, i % 2 && "hidden sm:block")} style={layer(c.depth)}>
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

export function CareersPage() {
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
              <SoonBadge />
            </div>
            <h1 className="hero-in mt-5 text-[44px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[62px]" style={d(0.1)}>
              Build the Future <br className="hidden sm:block" />
              of <span className="land-shine">Student Success</span>
            </h1>
            <p className="hero-in mt-5 max-w-[520px] text-[16.5px] leading-relaxed text-white/62" style={d(0.25)}>
              Join a passionate team of builders, designers and problem-solvers creating an all-in-one platform for students.
            </p>
            <div className="hero-in mt-7 flex flex-wrap gap-3" style={d(0.4)}>
              <a href="#roles" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-[14.5px] font-semibold text-[#ffffff] shadow-[0_12px_40px_rgba(139,92,246,0.45)] transition hover:-translate-y-0.5">
                View Open Positions <ArrowRightIcon size={15} className="transition group-hover:translate-x-1" />
              </a>
              <a href="#culture" className="inline-flex h-12 items-center rounded-xl border border-violet-400/40 bg-white/[0.03] px-6 text-[14.5px] font-medium text-white/90 transition hover:border-violet-300">
                Our Culture
              </a>
            </div>
            {/* preview notice */}
            <div className="hero-in mt-7 flex max-w-[520px] items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] p-4" style={d(0.55)}>
              <FancyIcon name="bolt" tone="amber" size={36} />
              <p className="text-[13px] leading-relaxed text-white/75">
                <b className="text-white">Careers at StudentOS are launching soon.</b> This page is a preview, so the roles below are examples and applications aren’t open yet. Check back soon!
              </p>
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

      {/* ---------- culture ---------- */}
      <section id="culture" className="mx-auto grid max-w-[1200px] scroll-mt-20 items-center gap-12 px-5 py-20 lg:grid-cols-2">
        <div className="reveal">
          <CultureVisual />
        </div>
        <div className="reveal" style={d(0.1)}>
          <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">Our Culture</span>
          <h2 className="mt-4 text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">A Student-First, Builder-First Team</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/62">We’re a young, ambitious, student-driven team that values curiosity, collaboration and real impact.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {VALUES.map((v, i) => (
              <span key={v.label} className="reveal group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pr-4 pl-1.5 text-[13.5px] font-medium text-white/85 transition hover:border-violet-400/50" style={d(0.08 * i)}>
                <FancyIcon name={v.icon} tone={v.tone} size={30} /> {v.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- roles ---------- */}
      <section id="roles" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[12px] font-medium text-violet-200">Open Positions</span>
              <h2 className="mt-4 text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">Current Opportunities</h2>
              <p className="mt-2 text-[14.5px] text-white/55">Explore roles and be a part of StudentOS.</p>
            </div>
            <SoonBadge className="text-[12px]" />
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r, i) => (
              <div key={r.title} className="reveal" style={d(0.08 * i)}>
                <TiltCard className="flex h-full flex-col rounded-3xl border border-white/10 bg-ink p-6 hover:border-violet-400/50">
                  <div className="relative flex items-start justify-between">
                    <FancyIcon name={r.icon} tone={r.tone} size={50} />
                    <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-200">Opening soon</span>
                  </div>
                  <h3 className="relative mt-4 text-[17px] font-semibold text-white">{r.title}</h3>
                  <p className="relative mt-1 text-[12.5px] text-white/55">{r.meta.join(" • ")}</p>
                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11.5px] text-white/65">{t}</span>
                    ))}
                  </div>
                  <div className="relative mt-auto pt-5">
                    {HIRING_OPEN ? (
                      <a href={mailto(`Application: ${r.title} · StudentOS`)} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-violet-300 hover:text-violet-200">
                        Apply Now <ArrowRightIcon size={13} />
                      </a>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-[13.5px] font-semibold text-white/40" title="Applications open soon">
                        Applications open soon
                      </span>
                    )}
                  </div>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="reveal land-ring rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-[linear-gradient(120deg,rgba(124,58,237,0.45),rgba(124,58,237,0.12)_55%,rgba(34,211,238,0.08))] p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <FancyIcon name="mail" tone="violet" size={56} float />
              <div>
                <h2 className="text-[26px] font-bold tracking-tight sm:text-[32px]">{HIRING_OPEN ? "Don’t see a role for you?" : "Want to hear when we launch?"}</h2>
                <p className="mt-2 max-w-[520px] text-[14.5px] text-white/70">
                  {HIRING_OPEN ? "We’re always looking for passionate people. Send us your profile and let’s talk!" : "Careers at StudentOS are launching soon. Email us and we’ll let you know as soon as applications open."}
                </p>
              </div>
            </div>
            <a
              href={HIRING_OPEN ? mailto("Application · StudentOS") : `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Notify me: StudentOS careers")}`}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#ffffff] px-6 text-[14.5px] font-semibold text-[#3b0764] shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
            >
              <MailIcon size={16} /> {HIRING_OPEN ? "Send Your Application" : "Notify Me"}
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
