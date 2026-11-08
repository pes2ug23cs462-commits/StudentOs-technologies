"use client";

/* Landing hero in the “Learn. Plan. Build. Grow.” design: headline and calls to action
   on the left, a 3D laptop showing the StudentOS dashboard on a dark rock on the right,
   a facts bar, and the five “Complete OS” cards. Facts only (no made-up user counts).
   The laptop screen keeps fixed dark colours so it looks the same in both themes. */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePointerVars } from "@/components/site/motion";
import { usePrimaryCta } from "@/components/site/site-shell";
import { ArrowRightIcon, PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

/* simple line icons */
const I = {
  book: <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z M12 6v13.5" />,
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 13.5h1M11.5 13.5h1M15 13.5h1M8 16.5h1M11.5 16.5h1" />
    </>
  ),
  bag: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M12 11v3" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  crown: <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z" />,
  cap: <path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6" />,
  gift: <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1s5 1 5 1 M12 7c1.5-3 5-3.5 5-1s-5 1-5 1" />,
  globe: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  users: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .7 3.2 2.5 3.5 5" />,
};
function Ico({ d: path, size = 22, className }: { d: ReactNode; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {path}
    </svg>
  );
}

const PILLARS = [
  { icon: I.book, label: ["Learn", "& Upskill"] },
  { icon: I.code, label: ["Build", "Projects"] },
  { icon: I.cal, label: ["Manage", "College Life"] },
  { icon: I.bag, label: ["Get", "Placement Ready"] },
];

/* true statements about StudentOS today */
const FACTS = [
  { icon: I.gift, big: "Free", small: "to start, no card needed" },
  { icon: I.globe, big: "3 languages", small: "English · हिन्दी · ಕನ್ನಡ" },
  { icon: I.cap, big: "Any degree", small: "B.Tech to B.Com to B.A." },
  { icon: I.spark, big: "AI built in", small: "Plans, notes, interviews" },
];

const CARDS = [
  { icon: I.book, title: "Learn & Grow", text: "Courses, resources and personalised learning paths.", href: "#features" },
  { icon: I.code, title: "Practice & Improve", text: "Coding, mock tests and AI mock interviews.", href: "#features" },
  { icon: I.layers, title: "Build Projects", text: "Add projects and experience, and turn them into a resume.", href: "#features" },
  { icon: I.cal, title: "Manage College Life", text: "Plan classes, study sessions and your college timeline.", href: "#story" },
  { icon: I.crown, title: "Get Placed", text: "Placement opportunities, preparation and career support.", href: "/placement", badge: "Soon" },
];

/* ---------- the laptop ---------- */
const DESIGN = 400; // px: the laptop is drawn at this width, then scaled to fit

function Laptop() {
  const side = ["Dashboard", "Learn", "Practice", "Projects", "College Life", "Resume", "Placement"];
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale((e.contentRect.width * 0.98) / DESIGN));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative mx-auto aspect-[16/11] w-full max-w-[640px] [perspective:1600px] lg:max-w-none lg:w-[132%] lg:-ml-[6%]" aria-hidden>
      {/* planet glow */}
      <div className="absolute top-[-16%] right-[-14%] h-[100%] w-[100%] rounded-full bg-[radial-gradient(circle_at_40%_40%,#3b2a7a,#1b1240_55%,transparent_72%)] opacity-90" />
      <div className="absolute top-[-16%] right-[-14%] h-[100%] w-[100%] rounded-full shadow-[inset_8px_10px_40px_rgba(167,139,250,0.55)]" />
      {/* rock */}
      <svg viewBox="0 0 600 260" preserveAspectRatio="none" className="absolute right-[-42%] bottom-[-52%] h-[90%] w-[130%] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
        <defs>
          <linearGradient id="rock" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#4a4560" />
            <stop offset="0.35" stopColor="#24212f" />
            <stop offset="1" stopColor="#0c0b12" />
          </linearGradient>
          <linearGradient id="rockEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="0.5" stopColor="#c4b5fd" stopOpacity="0.55" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M0 260 L18 214 L46 196 L70 168 L112 150 L150 122 L196 108 L232 86 L280 78 L318 60 L362 54 L404 38 L446 46 L482 30 L520 44 L556 70 L584 104 L600 130 L600 260 Z" fill="url(#rock)" />
        <path d="M18 214 L46 196 L70 168 L112 150 L150 122 L196 108 L232 86 L280 78 L318 60 L362 54 L404 38 L446 46 L482 30 L520 44 L556 70 L584 104" fill="none" stroke="url(#rockEdge)" strokeWidth="2" />
        <path d="M140 260 L190 170 L232 150 M300 260 L330 140 L372 112 M430 260 L452 150 L500 110 M520 260 L540 170 L580 140" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="3" />
      </svg>

      {/* the laptop, turned in 3D and following the pointer a little */}
      <div className="absolute top-[5%] left-0 origin-top-left" style={{ width: DESIGN, transform: `scale(${scale})` }}>
      <div
        className="[transform-style:preserve-3d]"
        style={{ transform: "rotateX(calc(8deg + var(--my, 0) * -3deg)) rotateY(calc(-18deg + var(--mx, 0) * 5deg)) rotateZ(2deg)", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        {/* lid */}
        <div className="relative rounded-[18px] border-[3px] border-[#3d3a4a] bg-[#0b0a12] p-[2.2%] shadow-[0_40px_80px_rgba(30,10,80,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <span className="absolute top-[1.1%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#2a2833]" />
          {/* screen */}
          <div className="relative grid aspect-[16/10] grid-cols-[23%_1fr] overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,#17142a,#1d1838_60%,#2a1f55)] text-[#ffffff]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            {/* sidebar */}
            <div className="border-r border-[#ffffff]/[0.06] px-[7%] pt-[9%]">
              <div className="flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/studentos-mark.png" alt="" className="h-[14px] w-[14px]" />
                <span className="text-[8.5px] font-bold">
                  Student<span className="text-[#a78bfa]">OS</span>
                </span>
              </div>
              <ul className="mt-[18%] space-y-[9%]">
                {side.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-1 rounded-[5px] px-[8%] py-[5%] text-[7px]", i === 0 ? "bg-[#7c3aed] font-semibold shadow-[0_4px_12px_rgba(124,58,237,0.5)]" : "text-[#ffffff]/75")}>
                    <span className={cn("h-[6px] w-[6px] rounded-[2px] border", i === 0 ? "border-[#ffffff]" : "border-[#ffffff]/50")} />
                    {s}
                    {s === "Placement" && <span className="text-[#fbbf24]">♛</span>}
                  </li>
                ))}
              </ul>
            </div>
            {/* main */}
            <div className="px-[5%] pt-[6%]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold italic">Good evening, Priya 👋</p>
                  <p className="text-[6.5px] text-[#ffffff]/55">Here’s your learning progress for this week.</p>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="h-[9px] w-[9px] rounded-full border border-[#ffffff]/50" />
                  <span className="h-[14px] w-[14px] rounded-full bg-[linear-gradient(135deg,#a78bfa,#22d3ee)]" />
                </span>
              </div>
              <div className="mt-[5%] grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-[3%]">
                <div className="flex items-center gap-[8%] rounded-[7px] bg-[#ffffff]/[0.06] p-[7%]">
                  <svg viewBox="0 0 36 36" className="h-[26px] w-[26px] shrink-0 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#ffffff22" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="68 94.2" className="[animation:hero-ring_1.6s_ease-out_both]" />
                    <defs>
                      <linearGradient id="lg">
                        <stop stopColor="#22d3ee" />
                        <stop offset="1" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="text-[6.5px] leading-tight text-[#ffffff]/85">
                    <b className="block text-[8px]">72%</b>Learning progress
                  </span>
                </div>
                {[
                  ["4", "Projects"],
                  ["2", "Tests"],
                  ["6", "Tasks"],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-[7px] bg-[#ffffff]/[0.06] p-[9%] text-center">
                    <b className="block text-[12px] leading-none">{n}</b>
                    <span className="text-[6px] text-[#ffffff]/60">{l}</span>
                  </div>
                ))}
              </div>
              <div className="mt-[5%] rounded-[8px] bg-[#ffffff]/[0.05] p-[4%]">
                <p className="text-[8px] font-semibold">Continue learning</p>
                <div className="mt-[4%] flex items-center gap-[4%]">
                  <span className="flex h-[24px] w-[40px] items-center justify-center rounded-[4px] bg-[linear-gradient(135deg,#2563eb,#7c3aed)]">
                    <span className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-[#ffffff]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[7.5px]">Accounting, Tally & GST</b>
                    <span className="text-[6px] text-[#ffffff]/55">Module 3 · 40 min</span>
                  </span>
                  <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#7c3aed]">
                    <span className="ml-[1px] h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-[#ffffff]" />
                  </span>
                </div>
                <div className="mt-[4%] h-[3px] overflow-hidden rounded-full bg-[#ffffff]/10">
                  <div className="h-full w-[58%] rounded-full bg-[linear-gradient(90deg,#22d3ee,#a78bfa)]" />
                </div>
              </div>
            </div>
            {/* screen glare */}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10),transparent_35%)]" />
          </div>
        </div>
        {/* base: keyboard deck seen from the front */}
        <div className="relative mx-[-6%] -mt-[2px] h-[30px]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#6b6878,#3a3845_30%,#1e1d26)]" style={{ clipPath: "polygon(5% 0, 95% 0, 100% 78%, 99% 100%, 1% 100%, 0 78%)" }} />
          <div className="absolute top-[3px] right-[9%] left-[9%] h-[12px] opacity-50" style={{ background: "repeating-linear-gradient(90deg, #0d0c12 0 9px, transparent 9px 11px), repeating-linear-gradient(0deg, transparent 0 3px, #2a2833 3px 4px)", clipPath: "polygon(1% 0, 99% 0, 100% 100%, 0 100%)" }} />
          <span className="absolute top-[17px] left-1/2 h-[6px] w-[18%] -translate-x-1/2 rounded-[2px] bg-[#2a2833]" />
          <span className="absolute -bottom-6 left-[4%] right-[4%] h-6 rounded-[50%] bg-[#000000]/45 blur-md" />
        </div>
      </div>
      </div>
    </div>
  );
}

export function HeroOS() {
  const cta = usePrimaryCta();
  const ref = usePointerVars<HTMLElement>();
  return (
    <section ref={ref} className="relative overflow-hidden pt-[72px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_80%_20%,rgba(124,58,237,0.38),transparent_70%)]" />
        <div className="absolute top-40 -left-40 h-[420px] w-[420px] rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-5 pt-10 lg:grid-cols-[1.08fr_1fr] lg:pt-14">
        <div>
          <span className="hero-in inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3.5 py-1.5 text-[13px] font-semibold text-white" style={d(0)}>
            <Ico d={I.cap} size={16} className="text-violet-400" /> The All-in-One Student Platform
          </span>
          <h1 className="hero-in mt-6 text-[46px] leading-[1.02] font-extrabold tracking-[-0.035em] text-white sm:text-[60px] xl:text-[66px] xl:whitespace-nowrap" style={d(0.1)}>
            Learn. Plan. Build. <span className="bg-[linear-gradient(90deg,#2563eb,#7c3aed_45%,#a855f7)] bg-clip-text text-transparent">Grow.</span>
          </h1>
          <p className="hero-in mt-5 max-w-[560px] text-[17px] leading-relaxed text-white/65 sm:text-[18.5px]" style={d(0.25)}>
            A complete platform for students to learn new skills, work on real projects, manage college life, and get ready for placements.
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={d(0.4)}>
            <Link href={cta.href} className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-[linear-gradient(90deg,#7c3aed,#8b5cf6)] px-8 text-[16px] font-semibold text-[#ffffff] shadow-[0_14px_40px_rgba(124,58,237,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(124,58,237,0.55)]">
              {cta.label} <ArrowRightIcon size={16} className="transition group-hover:translate-x-1" />
            </Link>
            <a href="#story" className="inline-flex h-[52px] items-center gap-2.5 rounded-full border-2 border-violet-500/70 px-7 text-[16px] font-semibold text-white transition hover:bg-violet-500/10">
              <PlayIcon size={12} className="text-violet-500" /> See how it works
            </a>
          </div>
          <div className="hero-in mt-9 grid grid-cols-4 sm:flex" style={d(0.55)}>
            {PILLARS.map((p, i) => (
              <div key={p.label[0]} className={cn("flex flex-col items-center gap-2 px-1.5 text-center sm:px-5 sm:first:pl-0", i > 0 && "border-l border-white/10")}>
                <Ico d={p.icon} size={28} className="text-violet-500" />
                <span className="text-[11.5px] leading-tight font-medium text-white/85 sm:text-[14px]">
                  {p.label[0]}
                  <br />
                  {p.label[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-in relative z-0" style={d(0.3)}>
          <Laptop />
        </div>
      </div>

      {/* facts bar */}
      <div className="relative z-10 mx-auto mt-10 max-w-[1240px] px-5">
        <div className="hero-in grid grid-cols-2 gap-y-4 rounded-[22px] border border-[#ffffff]/10 bg-[linear-gradient(90deg,#2b2840,#34304a_50%,#2b2840)] px-4 py-5 shadow-[0_20px_50px_rgba(30,20,70,0.35)] md:grid-cols-4" style={d(0.7)}>
          {FACTS.map((f, i) => (
            <div key={f.big} className={cn("flex items-center gap-2.5 px-2 sm:justify-center sm:gap-3 sm:px-3", i > 0 && "md:border-l md:border-[#ffffff]/12")}>
              <Ico d={f.icon} size={26} className="shrink-0 text-[#c4b5fd]" />
              <span>
                <b className="block text-[15px] leading-tight text-[#ffffff] sm:text-[18px]">{f.big}</b>
                <span className="text-[11.5px] text-[#ffffff]/70 sm:text-[12.5px]">{f.small}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* complete OS */}
      <div className="relative mx-auto max-w-[1240px] px-5 pt-14 pb-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1 text-[12.5px] font-semibold text-white">
            <Ico d={I.spark} size={13} className="text-violet-500" /> Everything You Need
          </span>
          <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[40px]">
            A Complete <span className="text-violet-500">OS</span> for Your College Life
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CARDS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="lift-3d relative rounded-[18px] border border-[#ffffff]/10 bg-[linear-gradient(160deg,#34304a,#25222f)] p-5 shadow-[0_16px_40px_rgba(20,10,50,0.35)] transition hover:border-[#a78bfa]/50"
            >
              {c.badge && <span className="absolute top-3 right-3 rounded-full bg-[#7c3aed] px-2.5 py-0.5 text-[11px] font-semibold text-[#ffffff]">{c.badge}</span>}
              <div className="flex items-center gap-3">
                <Ico d={c.icon} size={28} className={c.title === "Get Placed" ? "text-[#fbbf24]" : "text-[#c4b5fd]"} />
                <p className="text-[16.5px] font-semibold text-[#ffffff]">{c.title}</p>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#ffffff]/70">{c.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
