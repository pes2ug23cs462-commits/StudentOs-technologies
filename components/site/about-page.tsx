"use client";

import Image from "next/image";
import Link from "next/link";
import { Eyebrow, TiltCard, delay as d, usePointerVars } from "@/components/site/motion";
import { PageHero, SiteShell, usePrimaryCta } from "@/components/site/site-shell";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { ArrowRightIcon } from "@/components/ui/icons";

/* Edit freely: this is how StudentOS describes itself. Keep it true. */
const BELIEFS: { icon: FancyIconName; tone: FancyTone; title: string; text: string }[] = [
  { icon: "plan", tone: "violet", title: "Plans should fit real life", text: "Students have classes, jobs, travel and families. A plan that ignores them is a plan nobody follows." },
  { icon: "users", tone: "cyan", title: "Every degree matters", text: "Commerce, arts, science, management or engineering: each student should get help for their own path." },
  { icon: "certificate", tone: "amber", title: "Progress should be real", text: "Lessons count only when they are watched and certificates only when the quiz is passed, so they mean something." },
  { icon: "shield", tone: "emerald", title: "Your data is yours", text: "We collect only what we need, never sell it, and let you download or delete it any time." },
];

const BUILT: { icon: FancyIconName; tone: FancyTone; label: string }[] = [
  { icon: "plan", tone: "violet", label: "AI study plans" },
  { icon: "video", tone: "cyan", label: "Personalised courses" },
  { icon: "assistant", tone: "emerald", label: "Multilingual AI assistant" },
  { icon: "certificate", tone: "amber", label: "Verifiable certificates" },
];

export function AboutPage() {
  const cta = usePrimaryCta();
  const stage = usePointerVars<HTMLDivElement>();
  return (
    <SiteShell>
      <PageHero
        eyebrow="About StudentOS"
        title={
          <>
            The operating system for <span className="land-shine">student life</span>
          </>
        }
        sub="StudentOS helps students turn goals and free time into a plan they can keep, learn from the best lessons for their own degree, and prove what they learned."
      />

      {/* mission with 3D stage */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 lg:grid-cols-2">
        <div className="reveal">
          <Eyebrow>Our mission</Eyebrow>
          <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-tight sm:text-[40px]">Less time planning. More time learning.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/62">
            Most students don’t lack motivation. They lack a plan that works around college, and a clear idea of what to learn next. StudentOS brings the plan, the lessons, the doubt-solving and the proof of learning into one place, for free.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/62">
            StudentOS was founded by Rahul Rathod and is built together with a team of student interns, people who use it for their own studies too.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {BUILT.map(({ icon, tone, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pr-3.5 pl-1 text-[12.5px] text-white/75">
                <FancyIcon name={icon} tone={tone} size={26} /> {label}
              </span>
            ))}
          </div>
        </div>
        <div ref={stage} className="reveal relative h-[380px] [perspective:1200px]" style={d(0.15)} aria-hidden>
          <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(var(--my,0) * -10deg)) rotateY(calc(var(--mx,0) * 14deg))", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}>
            <div className="absolute top-1/2 left-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.5),transparent)] blur-2xl" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute top-1/2 left-1/2 rounded-full border border-violet-400/25" style={{ width: 200 + i * 80, height: 200 + i * 80, transform: `translate(-50%,-50%) rotateX(72deg) rotateZ(${i * 30}deg)` }}>
                <div className="absolute inset-0" style={{ animation: `hero-orbit ${8 + i * 5}s linear infinite ${i % 2 ? "reverse" : ""}` }}>
                  <span className="absolute top-1/2 -left-[5px] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee]" />
                </div>
              </div>
            ))}
            <div className="absolute top-1/2 left-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
              <div className="h-full w-full [animation:hero-bob_6s_ease-in-out_infinite]">
                <Image src="/studentos-mark.png" alt="" width={340} height={340} className="h-full w-full object-contain [animation:hero-glow_4s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* beliefs */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="reveal text-center">
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="mt-3 text-[32px] font-semibold tracking-tight sm:text-[40px]">The ideas behind StudentOS</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {BELIEFS.map(({ icon, tone, title, text }, i) => (
              <div key={title} className="reveal" style={d(0.08 * i)}>
                <TiltCard className="h-full rounded-3xl border border-white/10 bg-ink p-7">
                  <FancyIcon name={icon} tone={tone} size={54} />
                  <h3 className="relative mt-4 text-[18px] font-semibold text-white">{title}</h3>
                  <p className="relative mt-2 text-[14px] leading-relaxed text-white/60">{text}</p>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="reveal grid gap-4 md:grid-cols-2">
          <TiltCard className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.2),rgba(34,211,238,0.05))] p-8">
            <FancyIcon name="bulb" tone="cyan" size={54} />
            <h3 className="relative mt-4 text-[22px] font-semibold text-white">Try StudentOS</h3>
            <p className="relative mt-2 text-[14px] text-white/60">Free for every student. Your plan and courses in a few minutes.</p>
            <Link href={cta.href} className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-black">
              {cta.label} <ArrowRightIcon size={14} />
            </Link>
          </TiltCard>
          <TiltCard className="rounded-3xl border border-white/10 bg-white/[0.025] p-8">
            <FancyIcon name="heart" tone="pink" size={54} />
            <h3 className="relative mt-4 text-[22px] font-semibold text-white">Build it with us</h3>
            <p className="relative mt-2 text-[14px] text-white/60">We work with students who want real experience building a real product.</p>
            <Link href="/careers" className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-[14px] font-medium text-white hover:border-white/30">
              See careers <ArrowRightIcon size={14} />
            </Link>
          </TiltCard>
        </div>
      </section>
    </SiteShell>
  );
}
