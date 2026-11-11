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
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
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

const DEGREES = ["B.Tech", "B.Com", "BBA", "B.Sc", "B.A.", "BCA", "MBA", "M.Com", "M.Tech", "MCA", "Diploma", "School"];

const RING: { icon: FancyIconName; label: string; tone: FancyTone }[] = [
  { icon: "plan", label: "AI study plan", tone: "violet" },
  { icon: "video", label: "Video courses", tone: "cyan" },
  { icon: "assistant", label: "AI assistant", tone: "emerald" },
  { icon: "certificate", label: "Certificates", tone: "amber" },
  { icon: "quiz", label: "Notes to quiz", tone: "pink" },
  { icon: "resume", label: "Resume", tone: "indigo" },
];

const STEPS: { n: string; icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { n: "1", icon: "resume", tone: "indigo", title: "Tell us about you", text: "Your course, year, interests and goals, plus a 5-minute skill check." },
  { n: "2", icon: "plan", tone: "violet", title: "Get your plan and courses", text: "A study plan around your timetable and courses that match your background." },
  { n: "3", icon: "certificate", tone: "amber", title: "Learn, track, get certified", text: "Watch lessons inside StudentOS, see real progress and earn certificates." },
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
        <div className="absolute top-1/2 left-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.5),rgba(34,211,238,0.12)_60%,transparent)] blur-2xl" />
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
              <FancyIcon name="check" tone="emerald" size={22} /> Plan saved · 40 sessions
            </Glass>
          </div>
        </div>
        <div className="absolute right-[2%] bottom-[8%] hidden sm:block" style={layer(44)}>
          <div className="hero-pop" style={d(1.5)}>
            <Glass className="w-[210px] p-3.5 [animation:hero-bob_7s_ease-in-out_1s_infinite]">
              <p className="text-[9.5px] font-semibold tracking-wider text-accent uppercase">Next session</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-white">Tally Prime · GST</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10.5px] text-white/50">Today · 7:00 PM</p>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-black [animation:hero-pulse_1.8s_ease-out_infinite]">
                  <PlayIcon size={7} /> Start
                </span>
              </div>
            </Glass>
          </div>
        </div>
        <div className="absolute top-[10%] right-[0%] hidden lg:block" style={layer(30)}>
          <div className="hero-pop" style={d(1.8)}>
            <Glass className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] text-white/85 [animation:hero-bob_8s_ease-in-out_0.5s_infinite]">
              <FancyIcon name="certificate" tone="amber" size={22} /> Certificate unlocked
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
  const words = ["Learn.", "Plan.", "Build.", "Grow."];
  return (
    <section ref={ref} className="relative overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(50%_60%_at_65%_15%,rgba(124,58,237,0.34),transparent_70%)]" />
        <div className="absolute top-32 -left-48 h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="land-floor absolute inset-x-[-20%] bottom-[-12%] h-[50%]" />
      </div>
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-4 px-5 pt-10 pb-16 lg:grid-cols-[1fr_1.1fr] lg:pt-14">
        <div>
          <Link href="#free" className="hero-in group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-1 text-[12px] text-white/70 backdrop-blur transition hover:border-accent/40" style={d(0)}>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-black">Free</span>
            For every degree, every student
            <ArrowRightIcon size={12} className="transition group-hover:translate-x-0.5" />
          </Link>
          <h1 className="mt-6 text-[52px] leading-[1] font-bold tracking-[-0.03em] sm:text-[74px]">
            {words.map((w, i) => (
              <span key={w}>
                <span className="hero-in mr-3 inline-block" style={d(0.1 + i * 0.12)}>
                  <span className={i === 1 ? "land-shine" : ""}>{w}</span>
                </span>
                {i === 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="hero-in mt-6 max-w-[520px] text-[17px] leading-relaxed text-white/62" style={d(0.6)}>
            The AI study companion that turns your goals and free time into a plan you can keep, with courses made for your degree and certificates you can prove.
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={d(0.75)}>
            <Link href={cta.href} className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5">
              <span className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/45 [animation:hero-scan_3.5s_ease-in-out_infinite]" />
              <span className="relative">{cta.label}</span>
              <ArrowRightIcon size={15} className="relative transition group-hover:translate-x-1" />
            </Link>
            <a href="#story" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 text-[14.5px] font-medium text-white/85 backdrop-blur transition hover:border-white/30 hover:text-white">
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

/* ================= scroll story: one 3D screen, four scenes ================= */

function PlanScreen() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const blocks = [
    { day: 0, top: 58, h: 22, c: "bg-cyan-400/80", t: "Accounting", s: "Accts" },
    { day: 1, top: 30, h: 18, c: "bg-white/15", t: "College" },
    { day: 1, top: 62, h: 18, c: "bg-violet-500/80", t: "GST" },
    { day: 3, top: 60, h: 22, c: "bg-cyan-400/80", t: "Tally" },
    { day: 4, top: 30, h: 18, c: "bg-white/15", t: "College" },
    { day: 5, top: 14, h: 26, c: "bg-violet-500/80", t: "Practice" },
  ];
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-white">Your week</p>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-300">Fits around college</span>
      </div>
      <div className="mt-4 grid flex-1 grid-cols-6 gap-1 sm:gap-2">
        {days.map((day, i) => (
          <div key={day} className="flex flex-col">
            <p className="text-center text-[10.5px] text-white/45">{day}</p>
            <div className="relative mt-1.5 flex-1 rounded-lg bg-white/[0.04]">
              {blocks
                .filter((b) => b.day === i)
                .map((b, k) => (
                  <div
                    key={k}
                    title={b.t}
                    className={cn("land-screen-in absolute right-0.5 left-0.5 overflow-hidden rounded-md px-1 py-1 text-[8px] leading-tight font-semibold text-white min-[420px]:text-[9.5px] sm:right-1 sm:left-1 sm:px-1.5", b.c)}
                    style={{ top: `${b.top}%`, height: `${b.h}%`, ...d(0.15 + (i + k) * 0.08) }}
                  >
                    <span className={cn("sm:inline", "s" in b && b.s ? "hidden" : "")}>{b.t}</span>
                    {"s" in b && b.s && <span className="sm:hidden">{b.s}</span>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <p className="land-screen-in mt-3 text-[11px] text-white/50" style={d(0.8)}>
        Sunday is your rest day · 4 sessions · ~4 h
      </p>
    </div>
  );
}

function CoursesScreen() {
  const courses = [
    { t: "Accounting, Tally & GST", w: "Core for your B.Com", p: 64 },
    { t: "Income Tax Basics", w: "Part of your 3rd-year syllabus", p: 20 },
    { t: "Digital Marketing", w: "You picked Business", p: 0 },
  ];
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-[14px] font-semibold text-white">For you</p>
      <p className="text-[11px] text-white/45">Made from your degree, interests and skill check</p>
      <div className="mt-4 space-y-2.5">
        {courses.map((c, i) => (
          <div key={c.t} className="land-screen-in flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3" style={d(0.1 + i * 0.12)}>
            <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/60 to-cyan-500/40">
              <PlayIcon size={12} className="text-[#ffffff]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-white">{c.t}</p>
              <p className="text-[10.5px] text-accent">Why for you: {c.w}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-all duration-1000" style={{ width: `${c.p}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantScreen() {
  const cta = usePrimaryCta();
  const router = useRouter();
  const [ask, setAsk] = useState("");
  return (
    <div className="flex h-full flex-col p-5">
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
        <LogoMark size={16} /> StudentOS Assistant
      </p>
      <div className="mt-4 flex-1 space-y-2.5">
        <p className="land-screen-in ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent/25 px-3.5 py-2 text-[12px] text-white/90" style={d(0.1)}>
          GST kya hota hai? Simple mein samjhao 🙏
        </p>
        <div className="land-screen-in w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/80" style={d(0.3)}>
          <Typing text="GST ek hi tax hai jo goods aur services ki sale pe lagta hai. State ke andar CGST + SGST lagta hai, dusre state mein bechne pe IGST. Chaho to iska 5-question quiz bana doon?" start={0.6} speed={18} />
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = ask.trim();
          // signed in: open the real assistant with the question; otherwise sign up first
          router.push(cta.signedIn ? (q ? `/assistant?ask=${encodeURIComponent(q.slice(0, 500))}` : "/assistant") : "/signup");
        }}
        className="land-screen-in flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 focus-within:border-accent/60"
        style={d(0.5)}
      >
        <input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder={cta.signedIn ? "Ask anything…" : "Ask anything — sign up free to get an answer"}
          aria-label="Ask the StudentOS assistant"
          className="min-w-0 flex-1 bg-transparent py-1 text-[12.5px] text-white outline-none placeholder:text-white/40"
        />
        <button type="submit" aria-label={cta.signedIn ? "Ask" : "Sign up to ask"} className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-black transition hover:brightness-110">
          {!ask && <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />}
          {ask ? <ArrowRightIcon size={14} className="relative" /> : <MicIcon size={13} className="relative" />}
        </button>
      </form>
    </div>
  );
}

function CertificateScreen() {
  return (
    <div className="flex h-full items-center justify-center p-4 [container-type:size]">
      {/* as big as fits both ways, so the whole certificate always shows */}
      <div className="land-screen-in relative aspect-[297/210] w-[min(100cqw,141.4cqh)] overflow-hidden rounded-lg shadow-2xl" style={d(0.1)}>
        <CertificateView cert={{ id: "2026-SAMPLE", name: "Your Name", course: "Accounting, Tally & GST", duration: "9 h 40 min", level: "Beginner", date: "Sample certificate", score: "5/5", modules: 3 }} />
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/35 to-transparent [animation:land-sweep_3.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

const SCENES: { icon: FancyIconName; tone: FancyTone; title: string; text: string; Screen: ComponentType }[] = [
  { icon: "plan", tone: "violet", title: "A plan that fits your real week", text: "Add your classes and commitments once. The AI writes a week-by-week plan for your goal and places every session only in your free time, never on your rest day.", Screen: PlanScreen },
  { icon: "video", tone: "cyan", title: "Courses made for your degree", text: "A B.Com student gets accounting and tax, a B.Tech student gets code. Courses come from your profile and skill check, with the most viewed lessons split into short parts.", Screen: CoursesScreen },
  { icon: "assistant", tone: "emerald", title: "Ask in your own language", text: "Type or speak in English, Hindi or Kannada. Attach a PDF, slides or a photo of your notes and ask about them. The assistant knows your plan too.", Screen: AssistantScreen },
  { icon: "certificate", tone: "amber", title: "Certificates people can trust", text: "A lesson only counts when you really watch it. Pass the timed quiz and get a certificate with a QR code any college or recruiter can verify.", Screen: CertificateScreen },
];

function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const frame = usePointerVars<HTMLDivElement>();
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const Screen = SCENES[active].Screen;

  return (
    <section id="story" className="relative mx-auto max-w-[1200px] scroll-mt-16 px-5 py-24">
      <div className="reveal mx-auto max-w-[680px] text-center">
        <Eyebrow>See it in action</Eyebrow>
        <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">One app for everything you study</h2>
      </div>
      <div className="mt-16 grid gap-12 lg:grid-cols-[1.15fr_1fr]">
        {/* sticky 3D screen */}
        <div className="hidden lg:block">
          <div ref={frame} className="sticky top-32 [perspective:1500px]">
            <div
              className="relative [transform-style:preserve-3d]"
              style={{ transform: "rotateX(calc(8deg + var(--my, 0) * -4deg)) rotateY(calc(-14deg + var(--mx, 0) * 6deg))", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}
            >
              <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[radial-gradient(closest-side,rgba(124,58,237,0.4),transparent)] blur-2xl" />
              <div className="land-glass relative overflow-hidden rounded-[22px]">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="mx-auto rounded-md bg-white/[0.06] px-8 py-1 text-[10.5px] text-white/40">studentos</span>
                </div>
                <div key={active} className="h-[380px]">
                  <Screen />
                </div>
              </div>
              {/* depth chips around the screen */}
              <div className="absolute -top-5 -right-6 [transform:translateZ(80px)]">
                <span className="land-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-white/85">
                  <FancyIcon name="sparkle" tone="violet" size={22} /> Made by AI for you
                </span>
              </div>
              <div className="absolute -bottom-5 -left-6 [transform:translateZ(110px)]">
                <span className="land-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-white/85">
                  {SCENES.map((_, i) => (
                    <span key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "w-6 bg-accent" : "w-1.5 bg-white/30")} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* scenes */}
        <div>
          {SCENES.map(({ icon, tone, title, text, Screen: S }, i) => (
            <div key={title} ref={(el) => void (refs.current[i] = el)} data-i={i} className="flex min-h-[60vh] flex-col justify-center py-8 lg:min-h-[75vh]">
              <div className={cn("transition-all duration-500", i === active ? "opacity-100" : "lg:opacity-35")}>
                <span className={cn("inline-flex transition-all duration-500", i === active ? "scale-110" : "scale-95 grayscale-[0.6]")}>
                  <FancyIcon name={icon} tone={tone} size={56} float={i === active} />
                </span>
                <h3 className="mt-5 text-[26px] leading-tight font-semibold tracking-tight text-white sm:text-[30px]">{title}</h3>
                <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-white/60">{text}</p>
              </div>
              <div className="land-glass mt-6 h-[340px] overflow-hidden rounded-2xl lg:hidden">
                <S />
              </div>
            </div>
          ))}
        </div>
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
      <Hero />

      {/* degree marquee */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-6">
        <p className="text-center text-[11.5px] font-semibold tracking-[0.16em] text-white/45 uppercase">Made for every student</p>
        <div className="mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className={cn("flex w-max gap-3", !still && "[animation:land-marquee_30s_linear_infinite]")}>
            {[...DEGREES, ...DEGREES].map((dg, i) => (
              <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[13px] whitespace-nowrap text-white/70">
                {dg}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Story />
      <Bento />
      <ReviewsStrip />

      {/* how it works */}
      <section id="how" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <div className="reveal text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">Set up in about 5 minutes</h2>
          </div>
          <div className="relative mt-14">
            <div className="absolute top-[26px] right-[16%] left-[16%] hidden h-px overflow-hidden bg-white/10 md:block">
              <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-300 to-transparent [animation:land-beam_3.5s_ease-in-out_infinite]" />
            </div>
            <ol className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.n} className="reveal relative text-center" style={d(0.15 * i)}>
                  <span className="relative mx-auto inline-flex">
                    <FancyIcon name={s.icon} tone={s.tone} size={60} float />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-accent/60 bg-ink text-[11.5px] font-semibold text-accent">{s.n}</span>
                  </span>
                  <h3 className="mt-6 text-[17px] font-semibold text-white">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-white/60">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* free plan */}
      <section id="free" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-24">
        <div className="reveal land-ring rounded-3xl">
          <div className="grid items-center gap-10 rounded-3xl bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,211,238,0.06))] p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(124,58,237,0.32),transparent_70%)]" />
        <div className="land-floor pointer-events-none absolute inset-x-[-20%] bottom-[-30%] h-[70%] opacity-60" />
        <div className="reveal relative mx-auto max-w-[1200px] px-5 py-24 text-center">
          <div className="mx-auto h-[96px] w-[96px] [animation:land-float-3d_7s_ease-in-out_infinite]">
            <Image src="/studentos-mark.png" alt="" width={192} height={192} className="h-full w-full object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
          </div>
          <h2 className="mt-6 text-[36px] font-semibold tracking-tight sm:text-[48px]">
            Start studying with a <span className="land-shine">plan</span> today
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-white/60">Create your free account, answer a few questions, and get your plan and courses in minutes.</p>
          <Link href={cta.href} className="group relative mt-8 inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-accent px-7 text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5">
            <span className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/45 [animation:hero-scan_3.5s_ease-in-out_infinite]" />
            <span className="relative">{cta.label}</span> <ArrowRightIcon size={15} className="relative" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
