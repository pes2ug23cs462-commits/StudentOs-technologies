"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { HeroPanel } from "./hero-panel";

/* Two-column auth layout: illustration on the left, form on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-1 items-start bg-ink lg:grid-cols-[1.5fr_1fr]">
      <HeroPanel />
      <section className="relative flex min-h-screen flex-col border-l border-white/[0.06] auth-form-bg px-6 py-6 sm:px-12 xl:px-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <LogoMark size={26} />
            <Wordmark className="text-[16px]" />
          </Link>
          <div className="ml-auto flex items-center gap-6">
            <ThemeToggle className="hidden sm:flex" />
            <Link href="/" className="flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap text-white/85 hover:text-white">
              <ArrowLeftIcon size={13} /> Back to home
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

export function AuthTabs({ active }: { active: "signup" | "login" }) {
  const tabs = [
    { key: "signup", label: "Sign up", href: "/signup" },
    { key: "login", label: "Log in", href: "/login" },
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
