"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  FileIcon,
  FolderIcon,
  VideoIcon,
  ChatIcon,
  ChevronDownIcon,
  HomeIcon,
  LogOutIcon,
  PlanIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/ui/icons";
import { Avatar, LogoMark, Wordmark } from "@/components/ui/primitives";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { sortChats } from "@/lib/chats";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logOut } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon, match: ["/dashboard"] },
  { href: "/assistant", label: "AI Assistant", Icon: ChatIcon, match: ["/assistant", "/onboarding"] },
  { href: "/study-plan", label: "Study Plan", Icon: PlanIcon, match: ["/study-plan", "/plan", "/session"] },
  { href: "/schedule", label: "Schedule", Icon: CalendarIcon, match: ["/schedule", "/timeline"] },
  { href: "/learn", label: "Learning", Icon: VideoIcon, match: ["/learn", "/resources", "/goals"] },
  { href: "/projects", label: "Projects & Experience", Icon: FolderIcon, match: ["/projects"] },
  { href: "/resume", label: "Resume Creator", Icon: FileIcon, match: ["/resume"] },
];

export function profileLine(p: Profile) {
  const degree = p.degree.replace(/,?\s*Computer Science(?: and Engineering)?/i, " CSE").trim();
  const year = p.year.match(/^(\d)/)?.[1];
  return [degree, year ? `Year ${year}` : p.year].filter(Boolean).join(" · ");
}

function NavItem({ href, label, Icon, active, onNavigate }: { href: string; label: string; Icon: (p: { size?: number }) => React.ReactElement; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[34px] items-center gap-3 rounded-lg px-3 text-[13px] transition",
        active ? "bg-plum font-medium text-white" : "text-white/75 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      {active && <span className="absolute top-1.5 bottom-1.5 -left-[13px] w-[3px] rounded-r bg-accent" />}
      <span className={active ? "text-cyan-300" : "text-white/70"}>
        <Icon size={16} />
      </span>
      {label}
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
  const isActive = (match: string[]) => match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <aside className="flex h-full w-[228px] flex-col overflow-y-auto border-r border-white/[0.06] bg-panel px-[13px] pt-5 pb-3">
      <Link href="/dashboard" onClick={onNavigate} className="mb-5 flex items-center gap-2 px-1.5">
        <LogoMark size={26} />
        <Wordmark className="text-[16px]" />
      </Link>

      <Link
        href="/assistant"
        onClick={onNavigate}
        className="mb-5 flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] text-[12.5px] font-medium text-white transition hover:bg-white/[0.09]"
      >
        <PlusIcon size={14} /> Ask StudentOS
      </Link>

      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {NAV.map((n) => (
          <NavItem key={n.href} href={n.href} label={n.label} Icon={n.Icon} active={isActive(n.match)} onNavigate={onNavigate} />
        ))}
      </nav>

      <RecentChats onNavigate={onNavigate} />

      <div className="mt-auto flex flex-col gap-1.5">
        <ThemeToggle stretch className="mb-1" />
        <NavItem href="/settings/profile" label="Settings" Icon={SettingsIcon} active={isActive(["/settings", "/certificates"])} onNavigate={onNavigate} />
        <div className="mt-1.5 border-t border-white/[0.07] pt-2.5">
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
      <p className="mt-5 mb-1.5 px-3 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">Recent conversations</p>
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
