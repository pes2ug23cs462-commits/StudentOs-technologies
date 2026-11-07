"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { Toaster } from "@/components/ui/toaster";
import { useStore } from "@/lib/store";
import { MiniChat } from "./mini-chat";
import { Sidebar } from "./sidebar";

/* Logged-in layout: fixed sidebar on desktop, slide-over menu on mobile,
   floating “Ask StudentOS” widget, toasts. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // Logged-out visitors go to the login page.
  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (status !== "ready") return <div className="min-h-screen bg-ink" />;

  const hideMiniChat = pathname.startsWith("/assistant") || pathname.startsWith("/onboarding") || pathname.startsWith("/plan/review");

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

      <main className={hideMiniChat ? "app-glow min-h-screen lg:pl-[228px]" : "app-glow min-h-screen pb-20 lg:pl-[228px]"}>{children}</main>

      {!hideMiniChat && <MiniChat />}
      <Toaster />
    </div>
  );
}

