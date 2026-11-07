"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export const SETUP_STEPS = [
  { n: 1, label: "Academic Details", href: "/setup/academic" },
  { n: 2, label: "Goals & Interests", href: "/setup/goals" },
  { n: 3, label: "Skills & Experience", href: "/setup/skills" },
  { n: 4, label: "Review & Continue", href: "/setup/review" },
];

/* ---------- Animated brand ---------- */
/** The StudentOS mark with a soft glow pulse, a gentle bob and a light sweep. */
export function AnimatedMark({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("setup-mark relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <Image src="/studentos-mark.png" alt="" width={size * 2} height={size * 2} priority className="h-full w-full object-contain" />
      <span className="setup-mark-shine pointer-events-none absolute inset-0" aria-hidden />
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("group flex items-center gap-3", className)} aria-label="StudentOS">
      <AnimatedMark size={46} />
      <span>
        <span className="block text-[27px] leading-none font-bold tracking-tight text-white">
          Student<span className="text-cyan-300">OS</span>
        </span>
        <span className="mt-1.5 block text-[10.5px] font-semibold tracking-[0.22em] text-white/55">LEARN · PLAN · BUILD · GROW</span>
      </span>
    </Link>
  );
}

/* ---------- Illustration ---------- */
type Variant = "academic" | "goals" | "skills" | "review" | "assessment";

/** Same orbit as the login page: the logo inside a thin ring, a small dot
 *  travelling around it, a glowing arc going the other way and a tilted
 *  outer ellipse. Calm, and the same brand feel on every step. */
export function Illustration({ className }: { variant?: Variant; className?: string }) {
  return (
    <div className={cn("relative mx-auto flex h-[290px] w-full max-w-[320px] items-center justify-center", className)} aria-hidden>
      {/* soft glow */}
      <div className="absolute h-[240px] w-[240px] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.32),transparent)] blur-lg" />

      <div className="setup-orbit-in relative flex h-[250px] w-[250px] items-center justify-center">
        {/* tilted outer ellipse */}
        <div className="absolute h-[96px] w-[330px] rounded-[50%] border border-white/[0.08] [transform:rotate(-6deg)]" />
        {/* main ring */}
        <div className="absolute inset-0 rounded-full border border-violet-400/30 shadow-[inset_0_0_40px_rgb(124_58_237/0.18)]" />
        {/* inner ring */}
        <div className="absolute inset-[34px] rounded-full border border-white/[0.06]" />

        {/* dot travelling around the ring */}
        <div className="absolute inset-0 [animation:hero-orbit_12s_linear_infinite]">
          <span className="absolute top-1/2 -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent),0_0_26px_var(--color-accent)]" />
        </div>
        {/* glowing arc, the other way round */}
        <div className="absolute inset-[-1px] [animation:hero-orbit-rev_20s_linear_infinite]">
          <div className="absolute top-0 left-[22%] h-16 w-28 rounded-t-full border-t-2 border-accent/80 [filter:drop-shadow(0_0_5px_var(--color-accent))] [transform:rotate(-18deg)]" />
        </div>

        {/* logo */}
        <div className="relative">
          <AnimatedMark size={124} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Progress card ---------- */
export function ProgressCard({ current }: { current: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <p className="mb-2 text-[13.5px] font-semibold text-white">Onboarding Progress</p>
      <ol className="space-y-1">
        {SETUP_STEPS.map((s) => {
          const done = s.n < current;
          const active = s.n === current;
          return (
            <li key={s.n} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", active && "bg-accent/[0.08]")}>
              <StepDot n={s.n} state={done ? "done" : active ? "active" : "todo"} size={24} />
              <span className={cn("flex-1 text-[13px]", active ? "font-semibold text-white" : "text-white/80")}>
                {s.n}. {s.label}
              </span>
              <span className={cn("text-[11.5px]", active ? "font-medium text-accent" : "text-white/45")}>{done ? "Completed" : active ? "Current" : "Pending"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepDot({ n, state, size = 32 }: { n: number; state: "done" | "active" | "todo"; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        state === "todo" ? "bg-white/[0.08] text-white/45" : "bg-accent text-black shadow-[0_4px_12px_rgb(22_163_74/0.25)]",
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {state === "done" ? <CheckIcon size={size * 0.5} strokeWidth={3} /> : n}
    </span>
  );
}

/* ---------- Top stepper ---------- */
export function StepTabs({ current, reached }: { current: number; reached: number }) {
  return (
    <nav aria-label="Setup steps" className="grid grid-cols-4 gap-1">
      {SETUP_STEPS.map((s) => {
        const state = s.n < current ? "done" : s.n === current ? "active" : "todo";
        const canGo = s.n <= reached && s.n !== current;
        const inner = (
          <>
            <span className="flex items-center gap-3 pb-3.5">
              <StepDot n={s.n} state={state} size={34} />
              <span className={cn("hidden text-[13.5px] lg:inline", state === "active" ? "font-semibold text-white" : state === "done" ? "text-white/80" : "text-white/50")}>{s.label}</span>
            </span>
            <span className={cn("block h-[3px] rounded-full transition-colors", s.n <= current ? "bg-accent" : "bg-white/[0.08]")} />
          </>
        );
        return canGo ? (
          <Link key={s.n} href={s.href} className="block hover:opacity-90">
            {inner}
          </Link>
        ) : (
          <div key={s.n} aria-current={state === "active" ? "step" : undefined}>
            {inner}
          </div>
        );
      })}
    </nav>
  );
}

/* ---------- Page frame ---------- */
export function SetupShell({
  step,
  reached,
  variant,
  title,
  subtitle,
  aside,
  children,
}: {
  step: number;
  reached: number;
  variant: Variant;
  title: ReactNode;
  subtitle: ReactNode;
  /** bottom of the left panel: quote or progress */
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="setup-bg min-h-screen p-3 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1440px] overflow-hidden rounded-[22px] border border-white/[0.07] bg-panel shadow-[0_20px_60px_rgb(40_30_100/0.10)] lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Left panel */}
        <aside className="setup-left hidden flex-col gap-6 border-r border-white/[0.06] px-8 pt-9 pb-7 lg:flex">
          <Brand />
          <div className="mt-6">
            <h1 className="text-[38px] leading-[1.08] font-bold tracking-[-0.02em] text-white">{title}</h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/65">{subtitle}</p>
          </div>
          <Illustration variant={variant} className="my-auto" />
          {aside}
        </aside>

        {/* Right panel */}
        <section className="relative flex min-w-0 flex-col px-5 pt-5 pb-6 sm:px-10 lg:px-12">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Brand className="scale-90 origin-left lg:hidden" />
            <ThemeToggle className="ml-auto" />
          </div>
          <StepTabs current={step} reached={reached} />
          <div className="setup-enter mt-8 flex flex-1 flex-col">{children}</div>
        </section>
      </div>
    </div>
  );
}

export function StepHeading({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <div className="mb-7">
      <p className="text-[14px] font-semibold text-accent">Step {step} of 4</p>
      <h2 className="mt-1 text-[34px] leading-tight font-bold tracking-[-0.02em] text-white">{title}</h2>
      <p className="mt-2 text-[16px] text-white/70">{sub}</p>
    </div>
  );
}

export function QuoteCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
      <span className="font-serif text-[34px] leading-none font-bold text-accent">“</span>
      <p className="-mt-2 text-[16px] leading-snug text-white">A better student experience starts with you.”</p>
      <p className="mt-2 text-[12.5px] text-white/50">— StudentOS</p>
    </div>
  );
}
