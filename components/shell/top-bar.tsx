"use client";

/* Slim desktop top bar: where you are, and quick search. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, SearchIcon } from "@/components/ui/icons";
import { openCommandMenu } from "./command-menu";
import { crumbsFor } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="sticky top-0 z-20 hidden h-12 items-center gap-3 border-b border-white/[0.06] bg-ink/50 px-8 backdrop-blur-xl lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
        <Link href="/dashboard" className="rounded px-1 py-0.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white">
          StudentOS
        </Link>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.label} className="flex items-center gap-1.5">
              <ChevronRightIcon size={12} className="text-white/25" />
              <Link
                href={c.href}
                aria-current={last ? "page" : undefined}
                className={last ? "rounded px-1 py-0.5 font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white" : "rounded px-1 py-0.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"}
              >
                {c.label}
              </Link>
            </span>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[12px] text-white/45">{today}</span>
        <button type="button" onClick={openCommandMenu} className="flex h-7 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-[12px] text-white/55 hover:border-white/15 hover:text-white">
          <SearchIcon size={12} /> Search
          <kbd className="rounded border border-white/12 px-1 font-sans text-[10px] text-white/45">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}
