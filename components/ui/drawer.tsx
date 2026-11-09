"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

/* Right-hand sheet used for reschedule, add session, goals and edit dialogs. */
export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  header,
  footer,
  children,
  width = "w-[460px]",
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extra header content under the subtitle (e.g. a stepper) */
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-scrim/65 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative flex h-full max-w-full animate-slide-in flex-col border-l border-white/10 bg-raised shadow-2xl outline-none",
          width,
        )}
      >
        <div className="border-b border-white/[0.07] px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && <p className="text-[10.5px] font-semibold tracking-[0.08em] text-accent uppercase">{eyebrow}</p>}
              <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-white">{title}</h2>
              {subtitle && <p className="mt-1 text-[12px] text-white/55">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <XIcon size={14} />
            </button>
          </div>
          {header && <div className="mt-4">{header}</div>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center gap-3 border-t border-white/[0.07] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* Centered dialog (social sign-in notice, confirmations). */
export function Dialog({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-scrim/70" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-[380px] animate-fade-in rounded-xl border border-white/10 bg-raised/95 p-5 shadow-2xl backdrop-blur">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <div className="mt-2 text-[12.5px] leading-relaxed text-white/65">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
