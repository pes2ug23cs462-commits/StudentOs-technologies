"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeftIcon, BarChartIcon, BriefcaseIcon, BuildingIcon, ShieldIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { HeroPanel } from "./hero-panel";

/** Where to go after signing in, from ?next= (only our college and join pages are allowed),
    and whether this is the college / faculty sign-in. Read after mount so the page can be prerendered. */
export function useAuthNext() {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    setNext(n && /^\/(college|join)\b/.test(n) && !n.startsWith("//") ? n : null);
  }, []);
  const org: "admin" | "faculty" | null = next?.startsWith("/college") ? (/[?&]as=faculty\b/.test(next) ? "faculty" : "admin") : null;
  /** keeps ?next= on links between the auth pages */
  const keep = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);
  return { next, org, keep };
}

/* Left panel for principals, faculty and placement officers. */
function InstitutionPanel({ org }: { org: "admin" | "faculty" }) {
  const points = [
    { Icon: BarChartIcon, title: "Readiness by class and section", text: "See who is behind, chapter by chapter, before the exam." },
    { Icon: BriefcaseIcon, title: "Placements in one place", text: "Drives, shortlists, test links, rounds and offers." },
    { Icon: ShieldIcon, title: "Consent first", text: "Students choose to share. They can leave anytime." },
  ];
  return (
    <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#0b0a12] px-12 py-10 lg:flex xl:px-16">
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-20 h-[520px] w-[620px] rounded-full bg-violet-600/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-[380px] w-[420px] rounded-full bg-cyan-500/10 blur-[110px]" />
      <Link href="/institutions" className="relative flex items-center gap-2.5">
        <LogoMark size={30} />
        <Wordmark className="text-[18px]" />
        <span className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">for Institutions</span>
      </Link>
      <div className="relative max-w-[520px]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <BuildingIcon size={24} />
        </span>
        <h1 className="mt-6 text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] text-white">
          {org === "faculty" ? "Your classes and drives, in one view." : "Your whole college, in one view."}
        </h1>
        <p className="mt-3 text-[15px] text-white/60">
          {org === "faculty" ? "Sign in, then join your college with the two codes your admin shares." : "Sign in, then set up your college in two minutes. The first month is a free pilot."}
        </p>
        <ul className="mt-8 space-y-5">
          {points.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-white">{title}</span>
                <span className="block text-[13.5px] text-white/55">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-[12.5px] text-white/40">
        A student? <Link href="/login" className="text-white/70 underline-offset-2 hover:underline">Log in to StudentOS</Link>
      </p>
    </section>
  );
}

/* Two-column auth layout: illustration on the left, form on the right.
   College and faculty sign-in (`org`) gets its own left panel. */
export function AuthShell({ children, org }: { children: ReactNode; org?: "admin" | "faculty" | null }) {
  return (
    <main className="grid min-h-screen grid-cols-1 items-start bg-ink lg:grid-cols-[1.5fr_1fr]">
      {org ? <InstitutionPanel org={org} /> : <HeroPanel />}
      <section className="relative flex min-h-screen flex-col border-l border-white/[0.06] auth-form-bg px-6 py-6 sm:px-12 xl:px-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <LogoMark size={26} />
            <Wordmark className="text-[16px]" />
          </Link>
          <div className="ml-auto flex items-center gap-6">
            <ThemeToggle className="hidden sm:flex" />
            <Link href={org ? "/college" : "/"} className="flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap text-white/85 hover:text-white">
              <ArrowLeftIcon size={13} /> {org ? "Back" : "Back to home"}
            </Link>
          </div>
        </div>
        <div className="hero-in mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-6" style={{ "--d": "0.15s" } as CSSProperties}>
          {children}
        </div>
      </section>
      <Toaster />
    </main>
  );
}

export function AuthTabs({ active, keep = (h: string) => h }: { active: "signup" | "login"; keep?: (href: string) => string }) {
  const tabs = [
    { key: "signup", label: "Sign up", href: keep("/signup") },
    { key: "login", label: "Log in", href: keep("/login") },
  ] as const;
  return (
    <nav className="mb-5 flex gap-6 border-b border-white/10 text-[13px]" aria-label="Account">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 pb-2.5 font-medium transition",
            active === t.key ? "border-accent text-white" : "border-transparent text-white/55 hover:text-white",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Small label above the college / faculty forms, with a way back to the student log-in. */
export function InstitutionBadge({ org }: { org: "admin" | "faculty" }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2">
      <span className="flex items-center gap-2 text-[12.5px] font-medium text-cyan-100">
        <BuildingIcon size={14} /> {org === "faculty" ? "Faculty / placement officer" : "Principal / college admin"}
      </span>
      <Link href="/login" className="text-[11.5px] text-white/50 hover:text-white">
        I’m a student
      </Link>
    </div>
  );
}
