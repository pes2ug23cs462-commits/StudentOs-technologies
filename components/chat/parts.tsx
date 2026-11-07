"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRightIcon, CheckCircleIcon, AlertCircleIcon, MicIcon, PaperclipIcon, RefreshIcon, SlidersIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function AssistantMessage({ time, children, className }: { time?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <LogoMark size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[12px] font-semibold text-white">
          StudentOS {time && <span className="ml-1 font-normal text-white/40">{time}</span>}
        </p>
        <div className="text-[14px] leading-relaxed text-white/85">{children}</div>
      </div>
    </div>
  );
}

export function UserBubble({ children, failed, onRetry }: { children: ReactNode; failed?: boolean; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2 text-[13px] text-white", failed ? "bg-plum-strong/60 text-white/60" : "bg-plum-strong")}>{children}</div>
      {failed && (
        <p className="flex items-center gap-3 text-[11.5px] text-rose-400">
          <span className="flex items-center gap-1.5">
            <AlertCircleIcon size={12} /> Couldn’t send — check your connection.
          </span>
          <button type="button" onClick={onRetry} className="flex items-center gap-1 font-semibold text-white hover:underline">
            <RefreshIcon size={12} /> Retry
          </button>
        </p>
      )}
    </div>
  );
}

/* Saved-answer pill: “✓ Goal: Finish CS50’s Python course  Edit” */
export function AnswerChip({ children, onEdit }: { children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-center gap-2 rounded-lg border border-violet-400/15 bg-plum/80 px-3 py-1.5 text-[12px] text-white/85">
        <CheckCircleIcon size={13} className="shrink-0 text-emerald-400" />
        <span className="truncate">{children}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="font-medium text-cyan-300 hover:underline">
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={22} />
      <span className="flex h-6 items-center gap-1 rounded-full bg-white/[0.06] px-2.5" aria-label="StudentOS is thinking">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-cyan-300" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      <span className="text-[12px] text-white/50">Thinking…</span>
    </div>
  );
}

/* Message box at the bottom of every chat. */
export function Composer({
  onSend,
  disabled,
  placeholder = "Message StudentOS…",
  tools,
  tall,
  showMic,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Extra quick-action buttons next to the attach icon */
  tools?: ReactNode;
  tall?: boolean;
  showMic?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    ref.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-raised/90 p-3.5 backdrop-blur transition", disabled && "opacity-60")}>
      <textarea
        ref={ref}
        rows={tall ? 3 : 2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        aria-label="Message StudentOS"
        className="w-full resize-none bg-transparent text-[13.5px] text-white placeholder:text-white/45 outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" aria-label="Attach a file" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.06]">
          <PaperclipIcon size={14} />
        </button>
        {tools ?? (
          <button type="button" aria-label="Plan preferences" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.06]">
            <SlidersIcon size={14} />
          </button>
        )}
        <span className="ml-auto hidden text-[11px] text-white/40 sm:block">{!showMic && "Enter to send · Shift + Enter for a new line"}</span>
        {showMic && (
          <button type="button" aria-label="Voice input" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/[0.06]">
            <MicIcon size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={send}
          aria-label="Send"
          disabled={disabled || !text.trim()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition",
            text.trim() ? "bg-accent text-black" : showMic ? "bg-accent text-black opacity-90" : "bg-white/[0.07] text-white/60",
          )}
        >
          <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return <p className="mt-2 text-center text-[11px] text-white/40">StudentOS can make mistakes. You review every plan before it’s saved.</p>;
}

export function clockTime(d = new Date()) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
