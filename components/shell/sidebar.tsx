"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, LogOutIcon, SearchIcon, SettingsIcon, SparkleIcon, UserIcon } from "@/components/ui/icons";
import { Avatar, LogoMark, Wordmark } from "@/components/ui/primitives";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { sortChats } from "@/lib/chats";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logOut } from "@/lib/auth";
import { usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isActive as activeFor } from "./nav";
import { openCommandMenu } from "./command-menu";

export function profileLine(p: Profile) {
  const degree = p.degree.replace(/,?\s*Computer Science(?: and Engineering)?/i, " CSE").trim();
  const year = p.year.match(/^(\d)/)?.[1];
  return [degree, year ? `Year ${year}` : p.year].filter(Boolean).join(" · ");
}

function NavItem({ href, label, Icon, active, badge, onNavigate }: { href: string; label: string; Icon: (p: { size?: number }) => React.ReactElement; active: boolean; badge?: "PRO" | "SOON"; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-150",
        active ? "nav-active font-medium" : "text-white/65 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {active && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full" style={{ background: "var(--brand-grad)" }} />}
      <span className={active ? "text-[var(--cyan)]" : "text-white/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/75"}>
        <Icon size={15} />
      </span>
      <span className="truncate">{label}</span>
      {badge === "PRO" && <span className="ml-auto rounded px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-accent ring-1 ring-accent/30">PRO</span>}
      {badge === "SOON" && <span className="ml-auto rounded px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-white/45 ring-1 ring-white/15">SOON</span>}
    </Link>
  );
}

function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="absolute right-0 bottom-[calc(100%+6px)] left-0 z-30 animate-fade-in rounded-lg border border-white/10 bg-raised p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              router.push("/settings/profile");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-white/85 hover:bg-white/[0.06]"
          >
            <UserIcon size={14} /> Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logOut().then(() => router.push("/login"));
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-white/85 hover:bg-white/[0.06]"
          >
            <LogOutIcon size={14} /> Log out
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-white/[0.04]"
      >
        <Avatar name={state.profile.name} src={state.profile.photo} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-white">{state.profile.name}</span>
          <span className="block truncate text-[10.5px] text-white/50">{profileLine(state.profile)}</span>
        </span>
        <ChevronDownIcon size={14} className="text-white/50" />
      </button>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { premium } = usePremium();
  const isActive = (match: string[]) => activeFor(pathname, match);

  return (
    <aside className="flex h-full w-[228px] flex-col overflow-y-auto border-r border-white/[0.06] bg-panel px-3 pt-4 pb-3">
      <div className="mb-4 flex items-center justify-between px-1.5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
          <LogoMark size={24} />
          <Wordmark className="text-[15px]" />
        </Link>
        <Link href="/settings/account" onClick={onNavigate} className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/55 ring-1 ring-white/12 hover:text-white">
          {premium ? "PREMIUM" : "FREE"}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openCommandMenu();
        }}
        className="mb-2 flex h-8 w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[12.5px] text-white/50 hover:border-white/15 hover:text-white/75"
      >
        <SearchIcon size={13} />
        Search or ask…
        <kbd className="ml-auto rounded border border-white/12 px-1 font-sans text-[10px] text-white/45">⌘K</kbd>
      </button>
      <Link
        href="/assistant"
        onClick={onNavigate}
        className="brand-ring relative mb-4 flex h-8 items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-semibold text-white hover:bg-white/[0.04]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md text-[#ffffff]" style={{ background: "var(--brand-grad)" }}>
          <SparkleIcon size={11} />
        </span>
        Ask StudentOS
      </Link>

      <nav className="flex flex-col gap-4" aria-label="Main">
        {NAV_GROUPS.map((g, i) => (
          <div key={i} className="flex flex-col gap-px">
            {g.title && <p className="mb-1 px-2.5 text-[10.5px] font-medium tracking-wide text-white/40">{g.title}</p>}
            {g.items.map((n) => (
              <NavItem key={n.href} href={n.href} label={n.label} Icon={n.Icon} badge={n.badge} active={isActive(n.match)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <RecentChats onNavigate={onNavigate} />

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <NavItem href="/settings/profile" label="Settings" Icon={SettingsIcon} active={isActive(["/settings", "/certificates"])} onNavigate={onNavigate} />
        <ThemeToggle stretch className="mt-1 mb-1" />
        <div className="mt-1 border-t border-white/[0.06] pt-2.5">
          <UserMenu onNavigate={onNavigate} />
        </div>
      </div>
    </aside>
  );
}

/* Saved AI Assistant chats (newest first). */
function RecentChats({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  // which chat is open (read from the URL without needing a Suspense boundary)
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    setOpenId(new URLSearchParams(window.location.search).get("c"));
  });
  const chats = sortChats(state.chats).slice(0, 6);
  return (
    <>
      <p className="mt-5 mb-1 px-2.5 text-[10.5px] font-medium tracking-wide text-white/40">Recent chats</p>
      <div className="flex flex-col">
        {!state.planAcceptedOn && (
          <Link href="/onboarding" onClick={onNavigate} className="truncate rounded-md px-3 py-1.5 text-[12px] text-white/65 hover:bg-white/[0.04] hover:text-white">
            Setting up your first plan
          </Link>
        )}
        {chats.map((c) => (
          <ChatListItem
            key={c.id}
            chat={c}
            active={pathname === "/assistant" && openId === c.id}
            onOpen={() => {
              router.push(`/assistant?c=${c.id}`);
              onNavigate?.();
            }}
            onDeleted={() => pathname === "/assistant" && openId === c.id && router.replace("/assistant")}
          />
        ))}
        {chats.length === 0 && state.planAcceptedOn && <p className="px-3 py-1.5 text-[11.5px] text-white/40">Your AI chats will appear here.</p>}
      </div>
    </>
  );
}
