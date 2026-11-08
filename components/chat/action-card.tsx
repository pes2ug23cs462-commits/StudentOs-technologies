"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@/components/ui/icons";
import { describe, type AssistantAction } from "@/lib/assistant-actions";
import { cn } from "@/lib/utils";

/* A change the assistant suggests. Nothing happens until the student presses the button. */
export function ActionCard({ action, applied, onApply }: { action: AssistantAction; applied: boolean; onApply: () => string | null }) {
  const d = describe(action);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className={cn("mt-3 rounded-xl border p-3.5", applied ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-accent/35 bg-accent/[0.07]")}>
      <p className="text-[10.5px] font-semibold tracking-[0.12em] text-white/50 uppercase">{applied ? "Done" : "Suggested change"} · {d.where}</p>
      <p className="mt-1 text-[13.5px] font-semibold text-white">{d.title}</p>
      {d.lines.map((l) => (
        <p key={l} className="mt-0.5 text-[12.5px] text-white/65">
          {l}
        </p>
      ))}
      {error && <p className="mt-1.5 text-[12px] text-amber-400">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        {applied ? (
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-400">
            <CheckCircleIcon size={14} /> Applied
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setError(onApply() ?? "")}
              className="h-8 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-black transition hover:brightness-110"
            >
              {d.button}
            </button>
            <button type="button" onClick={() => setDismissed(true)} className="h-8 rounded-lg px-3 text-[12.5px] text-white/60 hover:bg-white/[0.06] hover:text-white">
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
