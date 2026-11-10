"use client";

/* Shared header for the practice area: mock tests and mock interviews live in
   one place, with tabs Overview · All Tests · Analytics · Mock Interview. */

import Link from "next/link";
import type { ReactNode } from "react";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { FancyIcon } from "@/components/site/fancy-icon";
import { BarChartIcon, CodeIcon, FileIcon, GridIcon, MicIcon } from "@/components/ui/icons";
import { useStore } from "@/lib/store";
import { wantsCoding } from "@/lib/coding/use-coding";
import { cn } from "@/lib/utils";

export type PracticeTab = "overview" | "all" | "analytics" | "interview" | "coding";

const TABS: { key: PracticeTab; label: string; href: string; Icon: typeof GridIcon }[] = [
  { key: "overview", label: "Overview", href: "/tests", Icon: GridIcon },
  { key: "all", label: "All Tests", href: "/tests?tab=all", Icon: FileIcon },
  { key: "analytics", label: "Analytics", href: "/tests?tab=analytics", Icon: BarChartIcon },
  { key: "interview", label: "Mock Interview", href: "/interview", Icon: MicIcon },
  { key: "coding", label: "Coding", href: "/code", Icon: CodeIcon },
];

export function PracticeHeader({ active, action, onTab }: { active: PracticeTab; action?: ReactNode; onTab?: (t: PracticeTab) => void }) {
  const { state } = useStore();
  // the Coding tab is for engineering students and anyone who wants to code
  const tabs = TABS.filter((t) => t.key !== "coding" || active === "coding" || wantsCoding(state));
  return (
    <div className="page-head">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FancyIcon name="target" tone="pink" size={56} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">Practice Arena</h1>
              {active === "coding" ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">Coding is free</span> : <PremiumBadge />}
            </div>
            <p className="mt-0.5 text-[13.5px] text-white/60">Practise subject-wise tests and real interviews, track your scores, and know exactly where to improve.</p>
          </div>
        </div>
        {action}
      </div>
      <nav aria-label="Practice" className="mt-5 flex gap-1 overflow-x-auto border-b border-white/10">
        {tabs.map(({ key, label, href, Icon }) => {
          const on = active === key;
          const cls = cn(
            "-mb-px flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition",
            on ? "border-violet-400 bg-violet-500/[0.12] text-white" : "border-transparent text-white/55 hover:text-white",
          );
          return onTab && key !== "interview" && key !== "coding" ? (
            <button key={key} type="button" aria-current={on ? "page" : undefined} onClick={() => onTab(key)} className={cls}>
              <Icon size={15} /> {label}
            </button>
          ) : (
            <Link key={key} href={href} aria-current={on ? "page" : undefined} className={cls}>
              <Icon size={15} /> {label}
              {key === "coding" && <span className="rounded-full bg-emerald-400/15 px-1.5 text-[10px] font-semibold text-emerald-400">FREE</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
