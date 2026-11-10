"use client";

import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import Link from "next/link";
import type { ReactNode } from "react";
import { CrownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, actions, icon, tone = "violet" }: { title: string; sub: string; actions?: ReactNode; icon?: FancyIconName; tone?: FancyTone }) {
  return (
    <div className="page-head flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-4">
        {icon && <FancyIcon name={icon} tone={tone} size={52} />}
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">{title}</h1>
          <p className="mt-1 text-[13.5px] text-white/55">{sub}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* “Premium” callout used where the free plan stops. */
export function PremiumNote({ title, children, className, href, cta = "See Premium" }: { title: string; children: ReactNode; className?: string; href?: string; cta?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#6366f1] text-white">
        <CrownIcon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-white">
          {title}
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-violet-400">{href ? "Premium" : "Premium · coming soon"}</span>
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{children}</p>
        {href && (
          <Link href={href} className="mt-2 inline-block text-[12.5px] font-semibold text-violet-400 hover:underline">
            {cta} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function FreeBadge() {
  return (
    <Link href="/settings/account" className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[11.5px] font-medium text-accent">
      Free plan
    </Link>
  );
}

/** Small pill tabs used for filters. */
export function FilterPills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition",
            value === o.value ? "border-accent/50 bg-accent/[0.1] text-accent" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-white/40">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
