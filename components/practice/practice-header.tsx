"use client";

/* Shared header for the practice area: mock tests and mock interviews live in
   one place, with tabs Overview · All Tests · Analytics · Mock Interview. */

import Link from "next/link";
import type { ReactNode } from "react";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { BarChartIcon, FileIcon, GridIcon, MicIcon, TargetIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type PracticeTab = "overview" | "all" | "analytics" | "interview";

const TABS: { key: PracticeTab; label: string; href: string; Icon: typeof GridIcon }[] = [
  { key: "overview", label: "Overview", href: "/tests", Icon: GridIcon },
  { key: "all", label: "All Tests", href: "/tests?tab=all", Icon: FileIcon },
  { key: "analytics", label: "Analytics", href: "/tests?tab=analytics", Icon: BarChartIcon },
  { key: "interview", label: "Mock Interview", href: "/interview", Icon: MicIcon },
];

export function PracticeHeader({ active, action, onTab }: { active: PracticeTab; action?: ReactNode; onTab?: (t: PracticeTab) => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30 sm:h-16 sm:w-16">
            <TargetIcon size={28} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-bold tracking-tight text-white sm:text-[30px]">Practice Arena</h1>
              <PremiumBadge />
            </div>
            <p className="mt-0.5 text-[13.5px] text-white/60">Practise subject-wise tests and real interviews, track your scores, and know exactly where to improve.</p>
          </div>
        </div>
        {action}
      </div>
      <nav aria-label="Practice" className="mt-5 flex gap-1 overflow-x-auto border-b border-white/10">
        {TABS.map(({ key, label, href, Icon }) => {
          const on = active === key;
          const cls = cn(
            "-mb-px flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition",
            on ? "border-violet-400 bg-violet-500/[0.12] text-white" : "border-transparent text-white/55 hover:text-white",
          );
          return onTab && key !== "interview" ? (
            <button key={key} type="button" aria-current={on ? "page" : undefined} onClick={() => onTab(key)} className={cls}>
              <Icon size={15} /> {label}
            </button>
          ) : (
            <Link key={key} href={href} aria-current={on ? "page" : undefined} className={cls}>
              <Icon size={15} /> {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
