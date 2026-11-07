"use client";

import { useStore } from "@/lib/store";
import { CheckCircleIcon, XIcon } from "./icons";

/* Confirmation toasts, shown top-centre like “Moved to Fri 30 Oct, 7:00 PM · reminder set”. */
export function Toaster() {
  const { state, actions } = useStore();
  if (!state.toasts.length) return null;
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-fade-in items-center gap-2.5 rounded-lg border border-white/12 bg-raised/95 py-2 pr-2.5 pl-3 text-[12.5px] text-white shadow-xl backdrop-blur"
        >
          <CheckCircleIcon size={14} className="text-emerald-400" />
          {t.message}
          <button type="button" onClick={() => actions.dismissToast(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white">
            <XIcon size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
