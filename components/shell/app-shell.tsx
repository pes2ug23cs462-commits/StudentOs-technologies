"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MenuIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { Toaster } from "@/components/ui/toaster";
import { useStore } from "@/lib/store";
import { CommandMenu, openCommandMenu } from "./command-menu";
import { NotificationBell } from "./notification-bell";
import { CollegeSync } from "@/components/college/college-sync";
import { MiniChat } from "./mini-chat";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

/* Logged-in layout: fixed sidebar on desktop, slide-over menu on mobile,
   floating “Ask StudentOS” widget, toasts. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, state } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // Logged-out visitors go to the login page.
  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);
  // A student who logs in (email and password) before finishing setup goes back to it,
  // instead of an empty dashboard. College staff and anyone with a plan are left alone.
  useEffect(() => {
    if (status !== "ready" || pathname !== "/dashboard") return;
    if (state.setup?.assessmentDone || state.staffOf || state.sessions.length) return;
    const steps = ["/setup/academic", "/setup/academic", "/setup/goals", "/setup/skills", "/setup/review", "/setup/assessment"];
    router.replace(steps[Math.min(state.setup?.reached ?? 1, 5)]);
  }, [status, pathname, state.setup, state.staffOf, state.sessions.length, router]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  // the product look (globals.css “Product UI”) applies only inside the app
  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);

  if (status !== "ready") return <div className="min-h-screen bg-ink" />;

  const fullScreen = pathname.startsWith("/assistant") || pathname.startsWith("/onboarding") || pathname.startsWith("/plan/review") || pathname.startsWith("/plan/preferences");
  const hideMiniChat = pathname.startsWith("/assistant") || pathname.startsWith("/onboarding") || pathname.startsWith("/plan/review") || pathname === "/code" || pathname.startsWith("/code/");

  // A coding problem opens full screen, like LeetCode: no sidebar, its own top bar.
  if (pathname.startsWith("/code/")) {
    return (
      <div className="min-h-screen bg-ink">
        {children}
        <CommandMenu />
        <Toaster />
        <CollegeSync />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-panel/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark size={24} />
          <Wordmark className="text-[15px]" />
        </Link>
        <span className="ml-auto" />
        <NotificationBell compact />
        <button type="button" onClick={openCommandMenu} aria-label="Search" className="rounded-lg p-2 text-white/70 hover:bg-white/10">
          <SearchIcon size={17} />
        </button>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-white/80 hover:bg-white/10">
          <MenuIcon size={18} />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-scrim/60" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="relative h-full w-[228px] animate-fade-in">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute top-4 -right-11 rounded-lg bg-white/10 p-2 text-white">
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      <main className={hideMiniChat ? "app-glow min-h-screen lg:pl-[228px]" : "app-glow min-h-screen pb-20 lg:pl-[228px]"}>
        {!fullScreen && <TopBar />}
        {/* re-keyed per page so each page rises in */}
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>
      <CommandMenu />

      {!hideMiniChat && <MiniChat />}
      <Toaster />
      <CollegeSync />
    </div>
  );
}

