"use client";

/* Shown in place of a Premium feature for students on Free. */

import Link from "next/link";
import type { ReactNode } from "react";
import { FancyIcon, type FancyIconName } from "@/components/site/fancy-icon";
import { CrownIcon } from "@/components/ui/icons";
import { PREMIUM_PRICE } from "@/lib/premium";

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-violet-200">
      <CrownIcon size={12} /> Premium
    </span>
  );
}

export function PremiumGate({ icon, title, text, points, children }: { icon: FancyIconName; title: string; text: string; points: string[]; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,211,238,0.05))] p-8 sm:p-10">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <PremiumBadge />
          <h2 className="mt-4 text-[28px] leading-tight font-semibold tracking-tight text-white sm:text-[34px]">{title}</h2>
          <p className="mt-3 max-w-[520px] text-[14.5px] leading-relaxed text-white/65">{text}</p>
          <ul className="mt-5 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                <FancyIcon name="check" tone="violet" size={22} /> <span className="pt-0.5">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/premium" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-[14px] font-semibold text-[#ffffff] shadow-[0_12px_36px_rgba(139,92,246,0.4)] transition hover:-translate-y-0.5">
              <CrownIcon size={15} /> Get Premium · ₹{PREMIUM_PRICE}/month
            </Link>
            <span className="text-[12px] text-white/45">Payments are launching soon</span>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-3xl" />
            <FancyIcon name={icon} tone="violet" size={150} float />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
