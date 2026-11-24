"use client";

import { InstitutionsBand } from "@/components/site/institutions-page";
/* Public landing page (/).
   Motion: a 3D stage in the hero (logo, orbits and a turning ring of feature
   cards that tilts with the pointer), a scroll story where a 3D screen changes
   as you read, a bento grid with live mini-visuals, and scroll reveals.
   All of it turns off with the OS “reduce motion” setting.
   Claims here must stay true to the app: no invented numbers or reviews. */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CertificateView } from "@/components/learn/certificate-view";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { ReviewsStrip } from "@/components/site/reviews";
import { Eyebrow, Glass, TiltCard, Typing, delay as d, reducedMotion, usePointerVars, useScrollProgress } from "@/components/site/motion";
import { SiteShell, usePrimaryCta } from "@/components/site/site-shell";
import { TextRevealFaqs, type FaqItem } from "@/components/landing/text-reveal-faqs";
import {
  ArrowRightIcon,
  CheckIcon,
  MicIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";


const RING: { icon: FancyIconName; label: string; tone: FancyTone }[] = [
  { icon: "target", label: "Aptitude practice", tone: "violet" },
  { icon: "mic", label: "Mock interviews", tone: "cyan" },
  { icon: "resume", label: "Resume check", tone: "indigo" },
  { icon: "rocket", label: "Campus drives", tone: "emerald" },
  { icon: "plan", label: "AI study plan", tone: "amber" },
  { icon: "assistant", label: "AI assistant", tone: "pink" },
];


const FREE: { text: string; icon: FancyIconName; tone: FancyTone }[] = [
  { text: "AI study plan and smart schedule", icon: "plan", tone: "violet" },
  { text: "Personalised video courses and popular videos", icon: "video", tone: "cyan" },
  { text: "AI assistant with voice and file upload", icon: "assistant", tone: "emerald" },
  { text: "2 StudentOS certificates", icon: "certificate", tone: "amber" },
  { text: "Study materials with revision quizzes", icon: "quiz", tone: "pink" },
  { text: "Resume creator, projects and college timeline", icon: "resume", tone: "indigo" },
];

const FAQ: FaqItem[] = [
  { q: "Can my college run placement drives on StudentOS?", a: "Yes. The placement cell posts the companies visiting campus, students apply in the app, and shortlists, test links and results reach students there instead of over email. Colleges can start with a pilot." },
  { q: "Is StudentOS free?", a: "Yes. The Free plan includes the study planner, personalised courses, the AI assistant (with a daily limit), 2 certificates and more. Premium features will be optional." },
  { q: "Is it only for engineering students?", a: "No. Courses and plans are made from your own degree, interests and assessment, so a B.Com, BBA, B.Sc or B.A. student gets courses for their field, not programming." },
  { q: "Where do the videos come from?", a: "From YouTube. For every topic we pick the most viewed and liked long-form lessons, and they play inside StudentOS with YouTube’s official player." },
  { q: "Are the certificates official?", a: "They are StudentOS certificates of completion. Each has an ID and QR code so a college or recruiter can check it is real. They are not university degrees." },
  {
    q: "What happens to my data?",
    a: "Only you can see your account. You can download or delete your data at any time.",
    extra: (
      <>
        Read the{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
];

/* ================= hero ================= */

function HeroStage() {
  const layer = (depth: number): CSSProperties => ({
    transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`,
    transition: "transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)",
  });
  const radius = 255;
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[600px] [perspective:1400px] sm:h-[540px]" aria-hidden>
      <div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{ transform: "rotateX(calc(var(--my, 0) * -8deg)) rotateY(calc(var(--mx, 0) * 12deg))", transition: "transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        {/* glow + pedestal */}
        <div className="absolute top-1/2 left-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,119,6,0.5),rgba(34,211,238,0.12)_60%,transparent)] blur-2xl" />
        <div className="absolute top-[74%] left-1/2 h-[90px] w-[380px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(34,211,238,0.35),transparent)] blur-md" />

        {/* turning ring of feature cards */}
        <div className="absolute top-1/2 left-1/2 h-0 w-0 [transform-style:preserve-3d]">
          <div className="[transform-style:preserve-3d] [animation:land-carousel_26s_linear_infinite]">
            {RING.map(({ icon, label, tone }, i) => (
              <div
                key={label}
                className="absolute -top-[26px] -left-[78px] [transform-style:preserve-3d]"
                style={{ transform: `rotateY(${i * (360 / RING.length)}deg) translateZ(${radius}px)` }}
              >
                <div className="land-glass flex h-[58px] w-[170px] items-center gap-2.5 rounded-2xl px-3 [backface-visibility:hidden]">
                  <FancyIcon name={icon} tone={tone} size={38} />
                  <span className="text-[12px] font-semibold whitespace-nowrap text-white">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* logo, orbits */}
        <div className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]" style={layer(10)}>
          <div className="-translate-x-1/2 -translate-y-1/2">
            <div className="hero-pop relative flex h-[250px] w-[250px] items-center justify-center sm:h-[300px] sm:w-[300px]" style={d(0.15)}>
              <div className="absolute inset-0 rounded-full border border-violet-400/30 [transform:rotateX(74deg)]">
                <div className="absolute inset-0 [animation:hero-orbit_8s_linear_infinite]">
                  <span className="absolute top-1/2 -left-[6px] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_#22d3ee,0_0_34px_#22d3ee]" />
                </div>
              </div>
              <div className="absolute inset-[38px] rounded-full border border-dashed border-white/15 [animation:hero-orbit_40s_linear_infinite]" />
              <div className="relative h-[150px] w-[150px] [animation:land-float-3d_7s_ease-in-out_infinite] sm:h-[175px] sm:w-[175px]">
                <Image src="/studentos-mark.png" alt="" width={360} height={360} priority className="h-full w-full object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>

        {/* floating status chips */}
        <div className="absolute top-[6%] left-[2%] hidden sm:block" style={layer(36)}>
          <div className="hero-pop" style={d(1.2)}>
            <Glass className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] text-white/85 [animation:hero-bob_6s_ease-in-out_infinite]">
              <FancyIcon name="target" tone="emerald" size={22} /> Readiness 72 / 100 · up 8 this week
            </Glass>
          </div>
        </div>
        <div className="absolute right-[2%] bottom-[8%] hidden sm:block" style={layer(44)}>
          <div className="hero-pop" style={d(1.5)}>
            <Glass className="w-[230px] p-3.5 [animation:hero-bob_7s_ease-in-out_1s_infinite]">
              <p className="text-[9.5px] font-semibold tracking-wider text-accent uppercase">Next campus drive</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-white">Software Engineer</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10.5px] text-white/50">Aptitude round · Fri 10 AM</p>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-black [animation:hero-pulse_1.8s_ease-out_infinite]">
                  <PlayIcon size={7} /> Prepare
                </span>
              </div>
            </Glass>
          </div>
        </div>
        <div className="absolute top-[10%] right-[0%] hidden lg:block" style={layer(30)}>
          <div className="hero-pop" style={d(1.8)}>
            <Glass className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] text-white/85 [animation:hero-bob_8s_ease-in-out_0.5s_infinite]">
              <FancyIcon name="check" tone="amber" size={22} /> Shortlisted for round 2
            </Glass>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const cta = usePrimaryCta();
  const ref = usePointerVars<HTMLElement>();
  const words = ["Prepare smart.", "Get placed."];
  return (
    <section ref={ref} className="relative overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(50%_60%_at_65%_15%,rgba(217,119,6,0.34),transparent_70%)]" />
        <div className="absolute top-32 -left-48 h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="land-floor absolute inset-x-[-20%] bottom-[-12%] h-[50%]" />
      </div>
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-4 px-5 pt-10 pb-16 lg:grid-cols-[1fr_1.1fr] lg:pt-14">
        <div>
          <Link href="#free" className="hero-in group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-1 text-[12px] text-white/70 backdrop-blur transition hover:border-accent/40" style={d(0)}>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-black">Free</span>
            For students · Colleges run their drives here
            <ArrowRightIcon size={12} className="transition group-hover:translate-x-0.5" />
          </Link>
          <h1 className="mt-6 text-[52px] leading-[1] font-bold tracking-[-0.03em] sm:text-[74px]">
            {words.map((w, i) => (
              <span key={w}>
                <span className="hero-in mr-3 inline-block" style={d(0.1 + i * 0.12)}>
                  <span className={i === 1 ? "land-shine" : ""}>{w}</span>
                </span>
                {i === 0 && <br />}
              </span>
            ))}
          </h1>
          <p className="hero-in mt-6 max-w-[520px] text-[17px] leading-relaxed text-white/62" style={d(0.6)}>
            StudentOS is a free placement-prep app for college students. Practise aptitude, take AI mock interviews, build your resume and follow a study plan, and see how ready you are for each campus drive.
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={d(0.75)}>
            <Link href={cta.href} className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5">
              <span className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/45 [animation:hero-scan_3.5s_ease-in-out_infinite]" />
              <span className="relative">{cta.label}</span>
              <ArrowRightIcon size={15} className="relative transition group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 text-[14.5px] font-medium text-white/85 backdrop-blur transition hover:border-white/30 hover:text-white">
              <PlayIcon size={10} /> See it in action
            </a>
          </div>
          <div className="hero-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-white/55" style={d(0.9)}>
            <span className="inline-flex items-center gap-2"><FancyIcon name="check" tone="cyan" size={24} /> No card needed</span>
            <span className="inline-flex items-center gap-2"><FancyIcon name="shield" tone="emerald" size={24} /> Your data stays yours</span>
            <span className="inline-flex items-center gap-2"><FancyIcon name="globe" tone="violet" size={24} /> English, हिन्दी, ಕನ್ನಡ</span>
          </div>
        </div>
        <HeroStage />
      </div>
    </section>
  );
}

/* ================= bento grid with live mini-visuals ================= */

function Bento() {
  const [ref, p] = useScrollProgress<HTMLDivElement>(0.6);
  const on = p > 0.35;
  return (
    <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-24">
      <div className="reveal max-w-[680px]">
        <Eyebrow>Features</Eyebrow>
        <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">Built for how students actually study</h2>
      </div>
      <div ref={ref} className="mt-12 grid auto-rows-[minmax(230px,auto)] gap-4 md:grid-cols-3">
        <div className="reveal md:col-span-2" style={d(0)}>
          <TiltCard max={6} className="h-full rounded-3xl border border-white/10 bg-white/[0.025] p-7">
            <div className="relative grid h-full gap-6 sm:grid-cols-[1fr_1.1fr]">
              <div>
                <FancyIcon name="plan" tone="violet" size={52} />
                <h3 className="mt-4 text-[19px] font-semibold text-white">Plans that adapt</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">Miss a session? Move it in a tap. Your progress and goal date update as you go, so you always know if you’re on track.</p>
              </div>
              <div className="relative rounded-2xl border border-white/10 bg-ink/50 p-4">
                <p className="text-[11px] text-white/50">Progress to goal</p>
                <svg viewBox="0 0 220 100" className="mt-2 h-[120px] w-full">
                  <defs>
                    <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 90 L30 80 L60 82 L90 62 L120 58 L150 40 L180 34 L220 14 L220 100 L0 100Z" fill="url(#lg)" className={cn("transition-opacity duration-1000", on ? "opacity-100" : "opacity-0")} />
                  <path d="M0 90 L30 80 L60 82 L90 62 L120 58 L150 40 L180 34 L220 14" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="400" style={{ strokeDashoffset: on ? 0 : 400, transition: "stroke-dashoffset 1.8s cubic-bezier(0.2,0.8,0.2,1)" }} />
                  <circle cx="220" cy="14" r="4" fill="#22d3ee" className={cn("transition-opacity delay-1000 duration-500", on ? "opacity-100" : "opacity-0")} />
                </svg>
                <span className="absolute top-4 right-4 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-300">On track</span>
              </div>
            </div>
          </TiltCard>
        </div>

        <div className="reveal" style={d(0.1)}>
          <TiltCard className="h-full rounded-3xl border border-white/10 bg-white/[0.025] p-7">
            <FancyIcon name="mic" tone="emerald" size={52} />
            <h3 className="relative mt-4 text-[19px] font-semibold text-white">Speak your doubt</h3>
            <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/60">Voice input in three languages.</p>
            <div className="relative mt-5 flex h-12 items-center gap-1">
              {Array.from({ length: 26 }, (_, i) => (
                <span key={i} className="w-1 flex-1 rounded-full bg-gradient-to-t from-emerald-400 to-cyan-300" style={{ height: `${20 + ((i * 37) % 70)}%`, animation: `land-blink ${0.8 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite` }} />
              ))}
            </div>
            <div className="relative mt-3 flex gap-1.5 text-[11px]">
              {["English", "हिन्दी", "ಕನ್ನಡ"].map((l) => (
                <span key={l} className="rounded-full border border-white/10 px-2 py-0.5 text-white/65">{l}</span>
              ))}
            </div>
          </TiltCard>
        </div>

        <div className="reveal" style={d(0)}>
          <TiltCard className="h-full rounded-3xl border border-white/10 bg-white/[0.025] p-7">
            <FancyIcon name="quiz" tone="pink" size={52} />
            <h3 className="relative mt-4 text-[19px] font-semibold text-white">Notes to quiz</h3>
            <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/60">Upload a PDF or a photo of notes and practise from it.</p>
            <div className="relative mt-4 rounded-xl border border-white/10 bg-ink/50 p-3 text-[11.5px]">
              <p className="text-white/80">Within a state, GST is charged as…</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {["IGST", "CGST + SGST", "Customs", "None"].map((o, i) => (
                  <span key={o} className={cn("rounded-md border px-2 py-1 transition-colors delay-700 duration-500", on && i === 1 ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200" : "border-white/10 text-white/55")}>{o}</span>
                ))}
              </div>
            </div>
          </TiltCard>
        </div>

        <div className="reveal" style={d(0.1)}>
          <TiltCard className="h-full rounded-3xl border border-white/10 bg-white/[0.025] p-7">
            <FancyIcon name="video" tone="cyan" size={52} />
            <h3 className="relative mt-4 text-[19px] font-semibold text-white">Short lessons</h3>
            <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/60">Long videos split into ~25-minute lessons. Skipping doesn’t count.</p>
            <div className="relative mt-4 space-y-1.5">
              {[100, 100, 45, 0].map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", v === 100 ? "bg-accent text-black" : "border border-white/25")}>{v === 100 && <CheckIcon size={9} />}</span>
                  Lesson {i + 1}
                  <span className="ml-auto h-1 w-20 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-accent transition-all duration-1000" style={{ width: on ? `${v}%` : "0%", transitionDelay: `${0.2 + i * 0.15}s` }} />
                  </span>
                </div>
              ))}
            </div>
          </TiltCard>
        </div>

        <div className="reveal" style={d(0.2)}>
          <TiltCard className="h-full rounded-3xl border border-white/10 bg-white/[0.025] p-7">
            <FancyIcon name="resume" tone="indigo" size={52} />
            <h3 className="relative mt-4 text-[19px] font-semibold text-white">Resume, ready</h3>
            <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/60">Projects, experience and your certificates in a professional resume.</p>
            <div className="relative mt-4 flex gap-3 rounded-xl border border-white/10 bg-ink/50 p-3">
              <span className="w-12 shrink-0 rounded-md bg-gradient-to-b from-indigo-700 to-violet-800" />
              <div className="flex-1 space-y-1.5">
                {[80, 60, 90, 50, 70].map((w, i) => (
                  <span key={i} className="block h-1.5 rounded-full bg-white/15 transition-all duration-700" style={{ width: on ? `${w}%` : "10%", transitionDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}

/* ================= page ================= */

type Chip = { text: string; at: string; tone: "emerald" | "blue" | "amber" };
const CHIP_TONE = { emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200", blue: "border-violet-400/40 bg-violet-500/15 text-violet-100", amber: "border-amber-400/40 bg-amber-500/15 text-amber-100" };

/* A real screen from the app, in a simple browser frame. As it scrolls in, the
   screen settles from a slight zoom and small labels pop in to point at what matters. */
function Screen({ src, alt, note, chips = [], ask }: { src: string; alt: string; note: string; chips?: Chip[]; ask?: string }) {
  const [ref, p] = useScrollProgress<HTMLDivElement>(0.75);
  const on = p > 0.45;
  return (
    <div ref={ref} className="relative">
      {ask && (
        <div className={cn("absolute -top-5 right-6 z-20 max-w-[78%] rounded-2xl rounded-br-md border border-violet-400/30 bg-violet-600/90 px-4 py-2.5 text-[13px] font-medium text-[#ffffff] shadow-[0_18px_40px_-12px_rgba(217,119,6,0.7)] transition-all duration-500", on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}>
          {on ? <Typing text={ask} start={0.2} speed={22} /> : ask}
        </div>
      )}
      {chips.map((c, i) => (
        <span
          key={c.text}
          className={cn("absolute z-20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold backdrop-blur-md shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-500", CHIP_TONE[c.tone], c.at, on ? "scale-100 opacity-100" : "scale-75 opacity-0")}
          style={{ transitionDelay: on ? `${0.9 + i * 0.35}s` : "0s" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {c.text}
        </span>
      ))}
    <TiltCard max={4} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1122] shadow-[0_40px_120px_-30px_rgba(217,119,6,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 rounded-md bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-white/40">student-os.in</span>
        <span className="ml-auto text-[10.5px] text-white/35">{note}</span>
      </div>
      <div className="overflow-hidden">
        <Image src={src} alt={alt} width={1200} height={750} className="block h-auto w-full origin-top will-change-transform" style={{ transform: `scale(${1 + (1 - p) * 0.06}) translateY(${(1 - p) * 14}px)`, transition: "transform 120ms linear" }} />
      </div>
    </TiltCard>
    </div>
  );
}

const PREP: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "mic", tone: "violet", title: "Mock interviews that talk back", text: "Disha asks, listens, and asks a follow-up when your answer is vague, like a real panel. Then you get a score and what to fix." },
  { icon: "code", tone: "cyan", title: "Coding rounds", text: "Solve in Python or JavaScript while Disha asks you to explain your approach, the way interviewers do." },
  { icon: "target", tone: "amber", title: "Aptitude practice", text: "Quant, logical and verbal, timed like the real test, with your weak topics called out." },
  { icon: "rocket", tone: "emerald", title: "Your college’s drives", text: "When your college runs drives on StudentOS, you apply and take the company’s rounds in the same place." },
];

const READY_STEPS = [
  { n: "1", title: "Measure", text: "One readiness score shows where each student stands." },
  { n: "2", title: "Learn", text: "A weekly plan from the gaps, and Disha to explain." },
  { n: "3", title: "Practise", text: "AI mock interviews and tests in strict mode." },
  { n: "4", title: "Prove", text: "The college sees who is ready before the drive." },
];

/* A one-minute walk through the product: how a student gets placement-ready. */
function ReadyVideo() {
  return (
    <section id="how" className="mx-auto max-w-[1100px] scroll-mt-20 px-5 pt-24">
      <div className="reveal mx-auto max-w-[720px] text-center">
        <Eyebrow>See it in a minute</Eyebrow>
        <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">How StudentOS gets a student placement-ready</h2>
      </div>
      <ol className="reveal mt-10 grid gap-3 sm:grid-cols-4">
        {READY_STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <span className="text-[12px] font-semibold tracking-[0.18em] text-amber-300 uppercase">Step {s.n}</span>
            <h3 className="mt-1 text-[16px] font-semibold text-white">{s.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="reveal mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-40px_rgba(251,191,36,0.35)]">
        <video className="block aspect-[16/10] w-full" src="/landing/how-it-works.mp4" poster="/landing/how-it-works.jpg" controls muted playsInline preload="none" aria-label="One-minute walk through StudentOS: measure, learn, practise, prove" />
      </div>
      <p className="mt-3 text-center text-[12px] text-white/40">Screens from the app with sample data.</p>
    </section>
  );
}

function PlacementPrep() {
  return (
    <section id="placement" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-24">
      <div className="reveal mx-auto max-w-[720px] text-center">
        <Eyebrow>Placement prep</Eyebrow>
        <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">Practise the real thing before the real thing</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">Interviews, coding and aptitude with an AI interviewer that behaves like a person, not a quiz.</p>
      </div>
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="reveal" style={d(0.05)}>
          <Screen
            src="/landing/mock-interview.jpg"
            alt="A StudentOS mock interview: Disha asks a follow-up question about the student's project"
            note="Mock interview · sample"
            chips={[
              { text: "Disha asked a follow-up", at: "top-[38%] -left-3 sm:-left-6", tone: "blue" },
              { text: "Talks back, by voice", at: "-bottom-4 right-6", tone: "emerald" },
            ]}
          />
        </div>
        <ul className="grid gap-3">
          {PREP.map((p, i) => (
            <li key={p.title} className="reveal group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/[0.045] hover:shadow-[0_20px_50px_-24px_rgba(217,119,6,0.6)]" style={d(0.08 * i)}>
              <FancyIcon name={p.icon} tone={p.tone} size={44} />
              <div>
                <h3 className="text-[15.5px] font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const ASHA: string[] = [
  "Answers anything, in English, Hindi, Hinglish or Kannada",
  "Knows your own record: tests, interviews, coding and upcoming exams",
  "Does the work: adds your exam to the timeline, plans study time, opens the right page",
  "Turns any explanation into a PDF or Word file you can print",
];

function MeetDisha() {
  const cta = usePrimaryCta();
  return (
    <section id="asha" className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015]">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" aria-hidden />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-24 lg:grid-cols-[1fr_1.25fr]">
        <div className="reveal">
          <Eyebrow>Meet Disha</Eyebrow>
          <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">
            She doesn’t just answer.{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">She does it.</span>
          </h2>
          <ul className="mt-7 space-y-3.5">
            {ASHA.map((t) => (
              <li key={t} className="flex gap-3 text-[14.5px] leading-relaxed text-white/75">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><CheckIcon size={12} /></span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12.5px] text-white/45">Nothing in your account changes until you press Apply.</p>
          <Link href={cta.signedIn ? "/assistant" : cta.href} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5">
            {cta.signedIn ? "Ask Disha" : "Try Disha free"} <ArrowRightIcon size={15} />
          </Link>
        </div>
        <div className="reveal" style={d(0.1)}>
          <Screen
            src="/landing/asha.jpg"
            alt="Disha adds a DBMS exam to the student's timeline and offers notes on normalization as a PDF"
            note="AI assistant · sample"
            ask="Mera DBMS internal 23 Nov ko hai, timeline mein daal de aur PDF bana de"
            chips={[
              { text: "Added to timeline", at: "top-[52%] -left-3 sm:-left-6", tone: "emerald" },
              { text: "PDF ready", at: "-bottom-4 left-[38%]", tone: "amber" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* A thin bar at the top that fills as you read the page. */
function ScrollBar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    let f = 0;
    const on = () => {
      cancelAnimationFrame(f);
      f = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        setW(max > 0 ? scrollY / max : 0);
      });
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return <div aria-hidden className="pointer-events-none fixed top-0 left-0 z-[80] h-[2px] origin-left bg-gradient-to-r from-cyan-300 via-violet-500 to-fuchsia-400" style={{ width: "100%", transform: `scaleX(${w})` }} />;
}

export function Landing() {
  const cta = usePrimaryCta();
  const [still, setStill] = useState(false);
  useEffect(() => setStill(reducedMotion()), []);
  // coming from another page with /#features etc.: scroll to that section once the page has drawn
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const jump = () => document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      setTimeout(jump, 60);
      setTimeout(jump, 400);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  return (
    <SiteShell>
      <ScrollBar />
      <Hero />

      <ReadyVideo />
      <PlacementPrep />
      <MeetDisha />
      <Bento />
      <ReviewsStrip hideEmpty />

      {/* free plan */}
      <section id="free" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-24">
        <div className="reveal land-ring rounded-3xl">
          <div className="grid items-center gap-10 rounded-3xl bg-[linear-gradient(135deg,rgba(217,119,6,0.18),rgba(34,211,238,0.06))] p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>Free plan</Eyebrow>
              <h2 className="mt-3 text-[36px] leading-tight font-semibold tracking-tight sm:text-[46px]">
                <span className="land-shine">₹0.</span> Everything to get started.
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/62">No card, no trial that runs out. Premium features like unlimited certificates are coming later and will always be optional.</p>
              <Link href={cta.href} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5">
                {cta.label} <ArrowRightIcon size={15} />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FREE.map((f, i) => (
                <li key={f.text} className="reveal flex items-start gap-2.5 rounded-xl border border-white/10 bg-ink/60 p-3.5 text-[13.5px] text-white/80 backdrop-blur" style={d(0.06 * i)}>
                  <FancyIcon name={f.icon} tone={f.tone} size={30} /> <span className="pt-1">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* for institutions */}
      <InstitutionsBand />

      {/* FAQ */}
      <section id="faq" className="reveal mx-auto max-w-[1080px] scroll-mt-20 px-5 pb-24">
        <TextRevealFaqs items={FAQ} />
      </section>

      {/* final call */}
      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(217,119,6,0.32),transparent_70%)]" />
        <div className="land-floor pointer-events-none absolute inset-x-[-20%] bottom-[-30%] h-[70%] opacity-60" />
        <div className="reveal relative mx-auto max-w-[1200px] px-5 py-24 text-center">
          <div className="mx-auto h-[96px] w-[96px] [animation:land-float-3d_7s_ease-in-out_infinite]">
            <Image src="/studentos-mark.png" alt="" width={192} height={192} className="h-full w-full object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
          </div>
          <h2 className="mt-6 text-[36px] font-semibold tracking-tight sm:text-[48px]">
            Start preparing for <span className="land-shine">placements</span> today
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-white/60">Create your free account, answer a few questions, and see how placement-ready you are in minutes.</p>
          <Link href={cta.href} className="group relative mt-8 inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-accent px-7 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5">
            <span className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/45 [animation:hero-scan_3.5s_ease-in-out_infinite]" />
            <span className="relative">{cta.label}</span> <ArrowRightIcon size={15} className="relative" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
