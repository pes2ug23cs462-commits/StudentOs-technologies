"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";

/* Left illustration panel on the auth screens.
   - Cards rise in one after another, then float.
   - Moving the mouse tilts the scene in layers (parallax).
   - A dot travels around the orbit; the logo glows; bars, the progress ring
     and the chat bubble animate their content.
   Everything switches off when the OS asks for reduced motion. */

const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Glass({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={cn(
        "hero-glass rounded-xl border border-white/15 bg-white/[0.07] shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-white/30 hover:shadow-[0_16px_50px_rgba(124,58,237,0.35)]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/* Card placement: position + 3D tilt + entrance delay + float timing */
function Card({
  pos,
  tilt,
  d,
  float = 7,
  floatDelay = 0,
  className,
  pop,
  children,
}: {
  pos: string;
  tilt: [number, number];
  d: number;
  float?: number;
  floatDelay?: number;
  className?: string;
  pop?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("absolute", pos, pop ? "hero-pop" : "hero-in")} style={delay(d)}>
      <div style={{ animation: float ? `hero-bob ${float}s ease-in-out ${floatDelay}s infinite` : undefined }}>
        <Glass className={className} style={{ transform: `perspective(900px) rotateY(${tilt[0]}deg) rotateX(${tilt[1]}deg)` }}>
          {children}
        </Glass>
      </div>
    </div>
  );
}

const bars = [
  { top: 18, h: 30, tone: "bg-cyan-400" },
  { top: 60, h: 18, tone: "bg-white/20" },
  { top: 8, h: 30, tone: "hero-bar-violet bg-violet-700" },
  { top: 52, h: 22, tone: "bg-cyan-400" },
  { top: 0, h: 0, tone: "" },
  { top: 12, h: 32, tone: "bg-cyan-400" },
  { top: 0, h: 0, tone: "" },
];

const STARS = [
  [12, 30], [70, 12], [86, 62], [33, 78], [58, 40], [92, 22], [22, 55], [45, 15], [78, 85], [8, 88], [64, 70], [38, 92],
];

function ChatBubbleText() {
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTyping(false), 2300);
    return () => clearTimeout(t);
  }, []);
  if (typing)
    return (
      <span className="flex h-[34px] items-center gap-1" aria-label="StudentOS is typing">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-cyan-300" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
    );
  return (
    <p className="animate-fade-in text-[11px] leading-relaxed text-white/65">
      Four 60-minute sessions a week fits around college and the gym. Want to see it?
    </p>
  );
}

export function HeroPanel() {
  const ref = useRef<HTMLElement>(null);

  // Parallax: write the pointer position (-1…1) into CSS variables; layers read them.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const layer = (depth: number): CSSProperties => ({
    transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`,
    transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
  });

  return (
    <section ref={ref} data-hero className="hero-root relative hidden h-screen overflow-hidden bg-[#05040a] lg:sticky lg:top-0 lg:block">
      {/* ---------- Background layer (moves least) ---------- */}
      <div className="pointer-events-none absolute -inset-10" style={layer(-8)}>
        <div className="hero-dark-only absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,rgba(110,50,230,0.45),transparent_70%)]" />
        <div className="hero-light-only absolute inset-0" />
        <div className="hero-dark-only absolute inset-x-0 top-0 h-[60%] bg-[repeating-linear-gradient(90deg,rgba(140,90,255,0.05)_0px,rgba(140,90,255,0.05)_2px,transparent_2px,transparent_46px)] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="hero-dark-only absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(150,80,255,0.35),transparent_70%)]" />
        {STARS.map(([x, y], i) => (
          <span
            key={i}
            className="hero-star absolute h-[2px] w-[2px] rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, animation: `hero-twinkle ${2.5 + (i % 4)}s ease-in-out ${i * 0.37}s infinite` }}
          />
        ))}
      </div>

      {/* Horizon arc with a light sweeping across it */}
      <div className="pointer-events-none absolute -bottom-[38%] left-1/2 h-[70%] w-[160%] -translate-x-1/2" style={layer(-4)}>
        <div className="hero-horizon absolute inset-0 overflow-hidden rounded-[50%] border-t border-cyan-300/60 shadow-[0_-10px_60px_rgba(34,211,238,0.35)] [animation:hero-horizon_5s_ease-in-out_infinite] [background:radial-gradient(50%_40%_at_50%_0%,rgba(40,120,255,0.25),transparent_70%)]">
          <div className="absolute top-0 left-0 h-[3px] w-1/4 rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent blur-[1px] [animation:hero-scan_6s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Panel edge */}
      <div className="pointer-events-none absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent" />
      <div className="pointer-events-none absolute top-[40%] right-[-3px] h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />

      {/* Brand */}
      <div className="hero-in absolute top-8 left-10 z-10 flex items-center gap-2.5" style={delay(0)}>
        <LogoMark size={30} />
        <Wordmark className="text-[17px]" />
      </div>

      {/* ---------- Logo + orbit (middle layer) ---------- */}
      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div style={layer(10)}>
          <div className="hero-pop relative flex h-[340px] w-[340px] items-center justify-center" style={delay(0.15)}>
            {/* rings */}
            <div className="absolute inset-0 rounded-full border border-violet-300/25 shadow-[inset_0_0_60px_rgba(124,58,237,0.25)]" />
            <div className="absolute h-[150px] w-[600px] rounded-[50%] border border-white/10 [transform:rotate(-4deg)]" />
            {/* dot travelling on the ring */}
            <div className="absolute inset-0 [animation:hero-orbit_14s_linear_infinite]">
              <span className="hero-dot absolute top-[50%] -left-[5px] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee,0_0_30px_#22d3ee]" />
            </div>
            {/* glowing arc travelling the other way */}
            <div className="absolute inset-[-2px] [animation:hero-orbit-rev_22s_linear_infinite]">
              <div className="absolute -top-0 left-[18%] h-24 w-40 rounded-t-full border-t-2 border-cyan-300/80 [filter:drop-shadow(0_0_6px_#22d3ee)] [transform:rotate(-18deg)]" />
            </div>
            {/* logo */}
            <div className="relative h-[200px] w-[200px] [animation:hero-bob_6s_ease-in-out_infinite]">
              <Image src="/studentos-mark.png" alt="StudentOS" width={400} height={400} priority className="h-full w-full object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
              <Image
                src="/studentos-mark.png"
                alt=""
                width={400}
                height={400}
                className="absolute top-[95%] left-0 h-full w-full scale-y-[-1] object-contain opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_55%)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Cards (front layer, moves most) ---------- */}
      <div className="absolute inset-0" style={layer(22)}>
        <Card pos="top-[20%] left-[8%]" tilt={[14, 4]} d={0.35} float={7} className="w-[235px] p-3.5">
          <p className="text-[13px] font-semibold text-white">This week</p>
          <p className="text-[10.5px] text-white/55">4 sessions · 4½ h</p>
          <div className="mt-2.5 flex h-[86px] gap-1.5">
            {bars.map((b, i) => (
              <div key={i} className="hero-track relative flex-1 rounded-md bg-white/[0.08]">
                {b.h > 0 && (
                  <div
                    className={cn("absolute inset-x-0 origin-bottom rounded-md", b.tone, b.tone === "bg-cyan-400" && "shadow-[0_0_14px_rgba(34,211,238,0.7)]")}
                    style={{ top: `${b.top}%`, height: `${b.h}%`, animation: `hero-bar 0.7s cubic-bezier(0.2,0.8,0.2,1) ${1.1 + i * 0.09}s both` }}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card pos="top-[16%] left-[40%]" tilt={[-8, 0]} d={1.4} float={0} pop className="flex items-center gap-1.5 border-emerald-400/45! px-3 py-1.5 text-[11px] text-white/85">
          <CheckIcon size={11} className="text-emerald-300" /> Plan saved
        </Card>

        <Card pos="top-[17%] right-[8%]" tilt={[-14, 4]} d={0.5} float={8} floatDelay={1} className="w-[245px] p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <LogoMark size={15} />
            <span className="text-[11px] font-semibold text-white">StudentOS</span>
          </div>
          <ChatBubbleText />
        </Card>

        <Card pos="top-[46%] left-[5%]" tilt={[8, 0]} d={1.8} float={0} pop className="flex items-center gap-1.5 border-amber-300/50! px-3 py-1.5 text-[11px] text-white/85">
          <CheckIcon size={11} className="text-amber-300" /> Missed session moved to Sunday
        </Card>

        <Card pos="bottom-[27%] left-[11%]" tilt={[14, 6]} d={0.65} float={9} floatDelay={0.5} className="flex w-[205px] items-center gap-3 p-3.5">
          <div className="absolute top-2.5 left-3.5 text-[9px] font-semibold tracking-[0.15em] text-white/45">PROGRESS</div>
          <div className="relative mt-4 h-[58px] w-[58px] shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-white/[0.12]" strokeWidth="3.2" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className="stroke-cyan-400"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray="94.2"
                strokeDashoffset="84.8"
                style={{ animation: "hero-ring 1.4s cubic-bezier(0.2,0.8,0.2,1) 1.3s both" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">10%</span>
          </div>
          <div className="mt-3">
            <p className="text-[13px] font-semibold text-white">CS50P</p>
            <p className="text-[10px] text-white/55">Week 1 of 10</p>
            <p className="text-[10px] text-white/55">Ends 8 Mar</p>
          </div>
        </Card>

        <Card
          pos="right-[10%] bottom-[24%]"
          tilt={[-12, 6]}
          d={0.8}
          float={7.5}
          floatDelay={1.5}
          className="w-[200px] border-cyan-300/40 p-3.5 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
        >
          <p className="text-[9px] font-semibold tracking-[0.15em] text-cyan-300">NEXT SESSION</p>
          <p className="mt-1 text-[14px] font-semibold text-white">Problem Set 1</p>
          <p className="text-[10px] text-white/55">Thu · 8:00 PM · 60 min</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[10.5px] font-semibold text-black [animation:hero-pulse_1.8s_ease-out_2.5s_infinite]">
            <PlayIcon size={9} /> Start
          </span>
        </Card>

        <Card pos="right-[17%] bottom-[15%]" tilt={[-8, 0]} d={2.1} float={0} pop className="px-3 py-1.5 text-[11px] text-white/75">
          <span className="flex items-center gap-1.5">
            <CheckIcon size={11} className="text-violet-400" /> 1 week of buffer
          </span>
        </Card>
      </div>

      {/* ---------- Headline ---------- */}
      <div className="absolute bottom-12 left-12 z-10" style={layer(6)}>
        <h1 className="text-[52px] leading-[1.02] font-bold tracking-[-0.03em] text-white">
          <span className="hero-in inline-block" style={delay(0.9)}>Learn.</span>{" "}
          <span
            className="hero-plan inline-block bg-[linear-gradient(90deg,#a5b4fc,#c4b5fd,#67e8f9,#a5b4fc)] bg-[length:200%_auto] bg-clip-text text-transparent opacity-0 [animation:hero-rise_0.9s_cubic-bezier(0.2,0.8,0.2,1)_1.05s_forwards,hero-shimmer_6s_linear_2s_infinite]"
          >
            Plan.
          </span>
          <br />
          <span className="hero-in inline-block" style={delay(1.2)}>Build.</span>{" "}
          <span className="hero-in inline-block" style={delay(1.35)}>Grow.</span>
        </h1>
        <p className="hero-in mt-3 text-[14px] text-white/65" style={delay(1.6)}>
          Your AI study planner, built around college — not against it.
        </p>
      </div>
    </section>
  );
}
