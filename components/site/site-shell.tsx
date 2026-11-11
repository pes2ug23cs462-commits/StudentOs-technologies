"use client";

/* Shared top bar and footer for the public website pages. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useReveal } from "./motion";

export const CONTACT_EMAIL = "studentoshr@gmail.com";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#free", label: "Free plan" },
  { href: "/institutions", label: "For institutions" },
  { href: "/reviews", label: "Reviews" },
  { href: "/#faq", label: "FAQ" },
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
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <LogoMark size={28} />
          <Wordmark className="text-[17px]" />
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] text-white/65 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("relative transition hover:text-white", path === n.href && "text-white")}>
              {n.label}
              {path === n.href && <span className="absolute -bottom-1.5 left-0 h-[2px] w-full rounded-full bg-accent" />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:flex" />
          {!cta.signedIn && (
            <Link href="/login" className="hidden text-[13px] font-medium text-white/80 hover:text-white sm:block">
              Log in
            </Link>
          )}
          <Link href={cta.href} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-black shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:-translate-y-px hover:bg-accent-hover">
            {cta.label}
          </Link>
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/80 lg:hidden">
            {open ? <XIcon size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="animate-fade-in border-t border-white/[0.07] px-5 pt-2 pb-4 lg:hidden" aria-label="Main">
          {NAV.map((n) => (
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
  { title: "Product", links: [{ href: "/#features", label: "Features" }, { href: "/#how", label: "How It Works" }, { href: "/#faq", label: "FAQ" }, { href: "/institutions", label: "For Institutions" }, { href: "/verify", label: "Verify a Certificate" }] },
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
