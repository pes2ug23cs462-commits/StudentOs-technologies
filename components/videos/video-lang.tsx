"use client";

/* Video language: English, Hindi or Kannada. Saved for the student (learning.videoLang) and
   used by every video search: Exam Prep, Learning, study plan and sessions. Within the
   language, the most viewed and liked videos come first. */

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const OPTIONS = [
  ["any", "Any"],
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["kn", "ಕನ್ನಡ"],
] as const;

export function VideoLangPicker({ className }: { className?: string }) {
  const { state, actions } = useStore();
  const cur = state.learning?.videoLang ?? "any";
  const pick = (v: (typeof OPTIONS)[number][0]) => {
    const l = state.learning ?? { modules: {}, courses: {} };
    const next = { ...l };
    if (v === "any") delete next.videoLang;
    else next.videoLang = v;
    actions.patch({ learning: next });
  };
  return (
    <div role="radiogroup" aria-label="Video language" className={cn("inline-flex items-center rounded-lg border border-white/10 p-0.5", className)}>
      {OPTIONS.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={cur === k} onClick={() => pick(k)} className={cn("h-7 rounded-md px-2.5 text-[12px] font-medium", cur === k ? "bg-[var(--color-plum)] text-white" : "text-white/55 hover:text-white")}>
          {l}
        </button>
      ))}
    </div>
  );
}
