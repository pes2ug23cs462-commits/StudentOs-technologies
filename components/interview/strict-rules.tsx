"use client";

/* The rules of a strict round, shown before it starts: what earns a warning and what
   ends the round. The student ticks "I agree" and only then does the round begin.
   `useStrictRules()` returns `ask(go)` (call it from the Start button) and `modal`
   (render it anywhere: it is a fixed overlay). "I agree, start" is a click of its own,
   so the round can still go full screen from it. */

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircleIcon, ShieldIcon, XIcon } from "@/components/ui/icons";
import { MAX_WARNINGS } from "./proctor";
import { cn } from "@/lib/utils";

type What = "interview" | "test" | "coding round";

function rules(what: What, spoken: boolean): { title: string; text: string }[] {
  return [
    { title: "Stay in full screen", text: `The ${what} runs full screen until you finish. Leaving full screen is a warning.` },
    { title: "No other tabs or windows", text: "Switching to another tab, window or app is a warning." },
    { title: "No copy, paste or printing", text: "Copy, paste, right-click, print and save are turned off." },
    { title: "Look at the screen", text: "Looking away for more than 2 seconds, or moving out of the camera, is a warning." },
    { title: "Only you", text: "Another person or a second face on the camera is a warning." },
    { title: "No phone or other device", text: "A phone, tablet, laptop or book seen on the camera is a warning." },
    spoken
      ? { title: "Only your voice answers", text: "A voice heard while your lips aren’t moving (someone helping) is a warning." }
      : { title: "Stay silent", text: "Talking during the round is a warning." },
    { title: "It must be you", text: "If the face check is set up, the camera checks your face. A face that doesn’t match your account is a warning. A face that matches another student who is already placed stops the round at once, and your placement cell is told." },
  ];
}

function Modal({ what, spoken, onCancel, onAgree }: { what: What; spoken: boolean; onCancel: () => void; onAgree: () => void }) {
  const [ok, setOk] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  // on <body>, so no parent box (or animation) can clip or move it
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="strict-rules-title">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f15] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
            <ShieldIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="strict-rules-title" className="text-[16px] font-semibold text-white">
              Strict mode rules
            </h2>
            <p className="text-[12px] text-white/55">Read these before you start the {what}.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onCancel} className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white">
            <XIcon size={15} />
          </button>
        </div>

        <div className="overflow-auto px-5 py-4">
          <ol className="space-y-2.5">
            {rules(what, spoken).map((r, i) => (
              <li key={r.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-white/70">{i + 1}</span>
                <p className="text-[13px] leading-relaxed text-white/70">
                  <b className="text-white">{r.title}.</b> {r.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-300/30 bg-amber-300/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-100/85">
            <AlertCircleIcon size={15} className="mt-0.5 shrink-0 text-amber-300" />
            <p>
              You get <b className="text-white">{MAX_WARNINGS} warnings</b>. After that, the next one ends the {what}. It is saved as it stands, with the reasons, and <b className="text-white">can’t be reopened</b>. Your placement cell may see this.
            </p>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-white/45">The camera and mic are checked on your own device. Nothing is recorded or uploaded; only face measurements (not a photo) are compared for the face check.</p>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.04] p-3 text-[13px] text-white/85">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
            I have read the rules. I agree to take this {what} on my own, under these rules.
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3.5">
          <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-[13px] font-medium text-white/70 hover:text-white">
            Cancel
          </button>
          <button type="button" disabled={!ok} onClick={onAgree} className={cn("h-10 rounded-xl bg-cyan-400 px-4 text-[13.5px] font-semibold text-[#06141a] transition hover:bg-cyan-300 disabled:opacity-40")}>
            I agree, start
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** `spoken`: the round is answered aloud, so the voice rule replaces "stay silent". */
export function useStrictRules(what: What, spoken = false): { ask: (go: () => void) => void; modal: ReactNode } {
  const [go, setGo] = useState<(() => void) | null>(null);
  return {
    ask: (fn) => setGo(() => fn),
    modal: go ? (
      <Modal
        what={what}
        spoken={spoken}
        onCancel={() => setGo(null)}
        onAgree={() => {
          const fn = go;
          setGo(null);
          fn();
        }}
      />
    ) : null,
  };
}
