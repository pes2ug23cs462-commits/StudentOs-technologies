"use client";

/* Shared top bar and footer for the public website pages. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon, ChevronDownIcon, MenuIcon, XIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useReveal } from "./motion";

export const CONTACT_EMAIL = "studentoshr@gmail.com";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#free", label: "Pricing" },
];
const RESOURCES = [
  { href: "/#how", label: "How it works" },
  { href: "/reviews", label: "Reviews" },
  { href: "/#faq", label: "FAQ" },
  { href: "/verify", label: "Verify a certificate" },
  { href: "/about", label: "About us" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export function usePrimaryCta() {
  const { status } = useStore();
  const signedIn = status === "ready";
  return { signedIn, href: signedIn ? "/dashboard" : "/signup", label: signedIn ? "Open dashboard" : "Get started free" };
}

export function SiteNav() {
  const cta = usePrimaryCta();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || open ? "border-b border-white/[0.07] bg-ink/75 backdrop-blur-xl" : "border-b border-transparent")}>
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <LogoMark size={34} />
          <span className="leading-none">
            <Wordmark className="block text-[21px] font-extrabold tracking-[-0.02em]" />
            <span className="mt-1 hidden items-center gap-1.5 text-[8.5px] font-semibold tracking-[0.32em] text-white/60 min-[420px]:flex">
              <span className="h-px w-3 bg-current" />
              TECHNOLOGIES
              <span className="h-px w-3 bg-current" />
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-9 text-[15px] font-medium text-white/80 lg:flex" aria-label="Main">
          {NAV.map((n) => {
            const on = n.href === "/" ? path === "/" : path === n.href;
            return (
              <Link key={n.href} href={n.href} className={cn("relative transition hover:text-white", on && "text-white")}>
                {n.label}
                {on && <span className="absolute -bottom-2 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-accent" />}
              </Link>
            );
          })}
          <div className="group relative">
            <button type="button" className="flex items-center gap-1 transition hover:text-white" aria-haspopup="true">
              Resources <ChevronDownIcon size={14} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute top-full left-1/2 z-10 w-56 -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="rounded-xl border border-white/10 bg-raised p-1.5 shadow-2xl">
                {RESOURCES.map((r) => (
                  <Link key={r.href} href={r.href} className="block rounded-lg px-3 py-2 text-[13.5px] text-white/80 hover:bg-white/[0.06] hover:text-white">
                    {r.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden xl:flex" />
          {!cta.signedIn && (
            <Link href="/login" className="hidden h-11 items-center rounded-full border-2 border-white/25 px-6 text-[15px] font-semibold text-white transition hover:border-accent sm:inline-flex">
              Log in
            </Link>
          )}
          <Link href={cta.href} className="group inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(90deg,#7c3aed,#8b5cf6)] px-4 text-[13.5px] font-semibold whitespace-nowrap text-[#ffffff] shadow-[0_10px_30px_rgba(124,58,237,0.4)] transition hover:-translate-y-px sm:h-11 sm:px-6 sm:text-[15px]">
            {cta.label} <ArrowRightIcon size={15} className="hidden transition group-hover:translate-x-0.5 sm:block" />
          </Link>
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 lg:hidden">
            {open ? <XIcon size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="animate-fade-in border-t border-white/[0.07] px-5 pt-2 pb-4 lg:hidden" aria-label="Main">
          {[...NAV, ...RESOURCES].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block border-b border-white/[0.05] py-3 text-[14px] text-white/80">
              {n.label}
            </Link>
          ))}
          <div className="mt-3 flex items-center justify-between">
            <ThemeToggle />
            {!cta.signedIn && (
              <Link href="/login" className="text-[14px] font-medium text-white/80">
                Log in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

const COLUMNS = [
  { title: "Product", links: [{ href: "/#features", label: "Features" }, { href: "/#how", label: "How It Works" }, { href: "/#faq", label: "FAQ" }, { href: "/verify", label: "Verify a Certificate" }] },
  { title: "Company", links: [{ href: "/about", label: "About" }, { href: "/careers", label: "Careers" }, { href: "/contact", label: "Contact" }] },
  { title: "Legal", links: [{ href: "/privacy", label: "Privacy Policy" }, { href: "/terms", label: "Terms and Conditions" }] },
  { title: "Account", links: [{ href: "/login", label: "Log In" }, { href: "/signup", label: "Sign Up" }] },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink">
      <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.16),transparent)] blur-2xl" />
      <div className="relative mx-auto max-w-[1200px] px-5 pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <LogoMark size={28} />
              <Wordmark className="text-[17px]" />
            </Link>
            <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-white/55">An AI study companion that turns goals and free time into a plan you can keep.</p>
            <p className="mt-4 text-[11.5px] font-semibold tracking-[0.18em] text-accent">LEARN · PLAN · BUILD · GROW</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="text-[13px] font-semibold text-white">{c.title}</p>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="group inline-flex items-center gap-1 text-[12.5px] text-white/55 transition hover:text-white">
                        <span className="h-px w-0 bg-accent transition-all duration-300 group-hover:w-2.5" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-[12px] text-white/45">
          <span>© {new Date().getFullYear()} StudentOS</span>
          <span>Made for students who’d rather be studying than planning.</span>
        </div>
      </div>
    </footer>
  );
}

/** Page wrapper for the public site: nav, footer, scroll reveals. */
export function SiteShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div ref={root} data-landing className="min-h-screen overflow-x-clip bg-ink text-white">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Hero block for the inner pages (About, Careers, Contact). */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(124,58,237,0.32),transparent_70%)]" />
        <div className="land-floor absolute inset-x-[-20%] bottom-[-20%] h-[60%] opacity-70" />
      </div>
      <div className="relative mx-auto max-w-[1200px] px-5 pt-20 pb-20 text-center">
        <p className="hero-in text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
        <h1 className="hero-in mx-auto mt-3 max-w-[820px] text-[40px] leading-[1.08] font-bold tracking-tight sm:text-[58px]" style={{ "--d": "0.1s" } as React.CSSProperties}>
          {title}
        </h1>
        <p className="hero-in mx-auto mt-5 max-w-[620px] text-[16px] leading-relaxed text-white/60" style={{ "--d": "0.25s" } as React.CSSProperties}>
          {sub}
        </p>
        {children}
      </div>
    </section>
  );
}
