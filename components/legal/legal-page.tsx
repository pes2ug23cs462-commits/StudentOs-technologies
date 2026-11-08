/* Shared layout for the public Privacy Policy and Terms pages. */

import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/site-shell";

export const LEGAL_UPDATED = "8 November 2026";
export const CONTACT_EMAIL = "studentoshr@gmail.com";

export function LegalPage({ title, intro, sections, other }: { title: string; intro: ReactNode; sections: { id: string; title: string; body: ReactNode }[]; other: { href: string; label: string } }) {
  return (
    <div className="min-h-screen bg-ink">
      <SiteNav />
      <div className="px-5 pt-24">
      <main className="mx-auto mt-10 max-w-[860px] pb-16">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-white/75 transition hover:text-white">
            ← Back to home
          </Link>
          <Link href="/#features" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-white/75 transition hover:text-white">
            See features
          </Link>
        </div>
        <p className="text-[12px] font-medium tracking-wide text-accent uppercase">Last updated {LEGAL_UPDATED}</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-white">{title}</h1>
        <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-white/70">{intro}</div>
        <p className="mt-3 text-[12.5px] text-white/45">
          See also:{" "}
          <Link href={other.href} className="text-accent hover:underline">
            {other.label}
          </Link>
        </p>

        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-[13px] font-semibold text-white">Contents</p>
          <ol className="mt-2 grid list-decimal gap-x-8 gap-y-1 pl-5 text-[13px] text-white/65 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-accent">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-9">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-[18px] font-semibold text-white">
                {i + 1}. {s.title}
              </h2>
              <div className="legal mt-3 space-y-3 text-[14px] leading-relaxed text-white/70">{s.body}</div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-[13.5px] text-white/70">Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a></p>
          <Link href="/#features" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-black">
            Back to StudentOS features →
          </Link>
        </div>
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}

/** Small helpers so the pages read like documents. */
export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;
export const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
export const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-white">{children}</b>;
export const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
    {children}
  </a>
);
