"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/setup/fields";
import { AnimatedMark, Brand } from "@/components/setup/shell";
import { useSetup, useStepGuard } from "@/components/setup/use-setup";
import { ArrowRightIcon, CheckIcon, CrownIcon, SparkleIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LEVEL_INFO, PLAN_FEATURES, computeLevel, type Level } from "@/lib/setup";
import { cn } from "@/lib/utils";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

/* Assessment result + choose Free or Premium. Payments aren’t connected yet,
   so Premium is recorded as the student’s interest and they start on Free. */
export default function PlanChoicePage() {
  const router = useRouter();
  const { setup, actions } = useSetup();
  const allowed = useStepGuard(6);
  const [choice, setChoice] = useState<"free" | "premium">(setup.plan ?? "free");
  if (!allowed) return null;

  const level = setup.level ?? computeLevel(setup).level;
  const info = LEVEL_INFO[level];

  const start = () => {
    actions.setSetup({ plan: choice });
    actions.toast(choice === "premium" ? "Thanks! Premium is coming soon — you’re on Free for now and we’ll let you know." : "Welcome to StudentOS Free!");
    router.push("/dashboard");
  };

  return (
    <div className="setup-bg min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>

        {/* Result */}
        <section className="setup-enter mt-8 flex flex-col items-center gap-6 rounded-[22px] border border-white/[0.07] bg-panel p-7 text-center shadow-[0_20px_60px_rgb(40_30_100/0.08)] md:flex-row md:text-left">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.35),transparent)] blur-md" />
            <AnimatedMark size={92} className="setup-hero-mark relative" />
          </div>
          <div className="flex-1">
            <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-accent md:justify-start">
              <SparkleIcon size={14} /> Assessment complete
            </p>
            <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-[-0.02em] text-white">
              Your level: <span className="text-accent">{info.label}</span>
            </h1>
            <p className="mt-1.5 text-[15px] text-white/65">{info.sub}</p>
            <div className="mt-4 flex justify-center gap-2 md:justify-start" aria-hidden>
              {LEVELS.map((l) => (
                <span
                  key={l}
                  className={cn(
                    "rounded-lg border px-3 py-1 text-[12.5px] font-medium",
                    l === level ? "border-accent bg-accent/[0.1] text-accent" : "border-white/10 text-white/45",
                  )}
                >
                  {LEVEL_INFO[l].label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <h2 className="mt-10 text-center text-[26px] font-bold tracking-tight text-white">Choose how you want to use StudentOS</h2>
        <p className="mt-1.5 text-center text-[15px] text-white/60">You can upgrade any time from your settings.</p>

        <div className="mt-7 grid gap-5 md:grid-cols-2" role="radiogroup" aria-label="Choose a plan">
          {(["free", "premium"] as const).map((p) => {
            const on = choice === p;
            const premium = p === "premium";
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setChoice(p)}
                className={cn(
                  "relative flex flex-col rounded-[20px] border p-6 text-left transition",
                  on ? "border-accent bg-accent/[0.05] shadow-[0_0_0_1px_var(--color-accent),0_16px_40px_rgb(22_163_74/0.12)]" : "border-white/10 bg-panel hover:border-white/20",
                  premium && "overflow-hidden",
                )}
              >
                {premium && <span className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.25),transparent)]" />}
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", premium ? "bg-gradient-to-br from-[#a78bfa] to-[#6366f1] text-white" : "bg-accent/[0.12] text-accent")}>
                    {premium ? <CrownIcon size={22} /> : <Icon name="sprout" size={22} />}
                  </span>
                  <div>
                    <p className="text-[19px] font-bold text-white">{premium ? "Premium" : "Free"}</p>
                    <p className="text-[13px] text-white/55">{premium ? "AI tutor, certificates and interview prep" : "Everything you need to get started"}</p>
                  </div>
                  {premium && <span className="ml-auto rounded-full bg-violet-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-violet-400">Coming soon</span>}
                  {!premium && <span className="ml-auto rounded-full bg-accent/[0.12] px-2.5 py-1 text-[11.5px] font-semibold text-accent">₹0</span>}
                </div>
                <ul className="mt-5 space-y-2.5">
                  {PLAN_FEATURES[p].map((f) => (
                    <li key={f} className="flex gap-2.5 text-[14.5px] text-white/85">
                      <CheckIcon size={17} className={cn("mt-0.5 shrink-0", premium ? "text-violet-400" : "text-accent")} strokeWidth={2.6} /> {f}
                    </li>
                  ))}
                </ul>
                <span className={cn("mt-6 flex h-6 items-center gap-2 text-[13px] font-medium", on ? "text-accent" : "text-white/45")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", on ? "border-accent" : "border-white/25")}>{on && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}</span>
                  {on ? "Selected" : "Select"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={start}
            className="group inline-flex h-[54px] items-center gap-3 rounded-xl bg-accent px-8 text-[16px] font-semibold text-black shadow-[0_10px_24px_rgb(22_163_74/0.28)] transition hover:bg-accent-hover"
          >
            {choice === "premium" ? "Join Premium waitlist & start free" : "Start with Free"}
            <ArrowRightIcon size={18} className="transition group-hover:translate-x-0.5" />
          </button>
          <p className="text-[12.5px] text-white/50">Payments aren’t set up yet — everyone starts on Free for now.</p>
        </div>
      </div>
    </div>
  );
}
