"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatIcon, MaximizeIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STEP_PROMPTS = [
  "Hi — I need a few details to build a plan that fits. It takes about 3 minutes.",
  "First, a bit about you — your college and year.",
  "What would you like to work towards?",
  "Which course is it, and when do you want to finish?",
  "Now the important part — your week. Tell me what’s already fixed…",
  "That’s everything I need. Want me to build your plan?",
];

const EDGE = 64; // px from the right edge of the window that wakes the widget

/* With a mouse, the widget stays out of the way: it slides in only when the cursor
   reaches the right edge of the window (or keyboard focus lands on it), and slides
   out again shortly after the cursor leaves. A thin handle on the edge shows where
   it is. On touch screens there is no cursor, so a small round button sits tucked
   into the bottom-right corner instead. */
function EdgeReveal({ children, touchHref, attention }: { children: ReactNode; touchHref: string; attention?: boolean }) {
  const [mouse, setMouse] = useState(false);
  const [shown, setShown] = useState(false);
  const over = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setMouse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mouse) return;
    const hideSoon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => !over.current && setShown(false), 900);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (window.innerWidth - e.clientX <= EDGE) {
        if (timer.current) clearTimeout(timer.current);
        setShown(true);
      } else if (!over.current) hideSoon();
    };
    const onLeave = () => !over.current && hideSoon();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [mouse]);

  if (!mouse) {
    return (
      <Link
        href={touchHref}
        aria-label="Ask StudentOS"
        className="fixed right-3 bottom-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/30 bg-raised/90 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur"
      >
        <LogoMark size={24} />
        {attention && <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-raised" />}
      </Link>
    );
  }

  return (
    <>
      {/* handle on the edge: hover or click it to bring the widget in */}
      <button
        type="button"
        aria-label="Show StudentOS Assistant"
        onClick={() => setShown(true)}
        className={cn(
          "fixed right-0 bottom-8 z-30 flex h-14 w-2.5 items-center justify-center rounded-l-full bg-accent/60 shadow-[0_0_14px_rgb(139_92_246/0.5)] transition-all duration-300 hover:w-3.5 hover:bg-accent",
          shown && "pointer-events-none translate-x-full opacity-0",
          attention && !shown && "animate-pulse",
        )}
      />
      <div
        onMouseEnter={() => {
          over.current = true;
          if (timer.current) clearTimeout(timer.current);
        }}
        onMouseLeave={() => {
          over.current = false;
          timer.current = setTimeout(() => setShown(false), 900);
        }}
        onFocusCapture={() => setShown(true)}
        onBlurCapture={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setShown(false)}
        className={cn(
          "fixed right-5 bottom-5 z-30 transition-all duration-300 ease-out",
          shown ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+28px)] opacity-0",
        )}
      >
        {children}
      </div>
    </>
  );
}

/* Floating assistant widget, bottom-right on every app page.
   While setup is unfinished it shows where you paused and a “Reopen chat” button. */
export function MiniChat() {
  const { state } = useStore();
  const { done, step } = state.onboarding;

  if (!done) {
    return (
      <EdgeReveal touchHref="/onboarding" attention>
      <div className="w-[280px] rounded-xl border border-violet-400/30 bg-raised/95 p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="flex items-start gap-2.5">
          <LogoMark size={22} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-white">StudentOS Assistant</p>
            <p className="text-[10.5px] text-white/50">Setup paused · step {Math.max(1, step)} of 5</p>
          </div>
          <Link href="/onboarding" aria-label="Open assistant" className="rounded-md border border-white/10 p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <MaximizeIcon size={12} />
          </Link>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/65">“{STEP_PROMPTS[step] ?? STEP_PROMPTS[0]}”</p>
        <Link
          href="/onboarding"
          className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-accent text-[12.5px] font-semibold text-black shadow-[0_0_22px_rgba(139,92,246,0.28)] hover:bg-accent-hover"
        >
          <ChatIcon size={13} /> Reopen chat
        </Link>
      </div>
      </EdgeReveal>
    );
  }

  return (
    <EdgeReveal touchHref="/assistant">
    <Link
      href="/assistant"
      className="flex items-center gap-3 rounded-xl border border-violet-400/25 bg-raised/90 py-2 pr-2 pl-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur transition hover:border-violet-400/45"
    >
      <LogoMark size={22} />
      <span>
        <span className="block text-[12.5px] font-semibold text-white">Ask StudentOS</span>
        <span className="block text-[10.5px] text-white/50">Conversation saved</span>
      </span>
      <span className="ml-2 rounded-md border border-white/10 p-1.5 text-white/70">
        <MaximizeIcon size={12} />
      </span>
    </Link>
    </EdgeReveal>
  );
}
