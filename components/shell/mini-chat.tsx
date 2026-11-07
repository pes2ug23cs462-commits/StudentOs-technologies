"use client";

import Link from "next/link";
import { ChatIcon, MaximizeIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";

const STEP_PROMPTS = [
  "Hi — I need a few details to build a plan that fits. It takes about 3 minutes.",
  "First, a bit about you — your college and year.",
  "What would you like to work towards?",
  "Which course is it, and when do you want to finish?",
  "Now the important part — your week. Tell me what’s already fixed…",
  "That’s everything I need. Want me to build your plan?",
];

/* Floating assistant widget, bottom-right on every app page.
   While setup is unfinished it shows where you paused and a “Reopen chat” button. */
export function MiniChat() {
  const { state } = useStore();
  const { done, step } = state.onboarding;

  if (!done) {
    return (
      <div className="fixed right-5 bottom-5 z-30 w-[280px] animate-fade-in rounded-xl border border-violet-400/30 bg-raised/95 p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur">
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
          className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-accent text-[12.5px] font-semibold text-black shadow-[0_0_22px_rgba(0,225,245,0.28)] hover:bg-accent-hover"
        >
          <ChatIcon size={13} /> Reopen chat
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/assistant"
      className="fixed right-5 bottom-5 z-30 flex items-center gap-3 rounded-xl border border-violet-400/25 bg-raised/90 py-2 pr-2 pl-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur transition hover:border-violet-400/45"
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
  );
}
