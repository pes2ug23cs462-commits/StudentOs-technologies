"use client";

/* School students are under 18, so the DPDP Act wants a parent or guardian to agree before
   we use their data. This box records when the student confirmed that (academic.guardianConsent). */

import Link from "next/link";

export function GuardianConsent({ checked, onChange, error, className = "mt-8" }: { checked: boolean; onChange: (at: number | undefined) => void; error?: string; className?: string }) {
  return (
    <div className={`${className} rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4`}>
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-white/80">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked ? Date.now() : undefined)} className="mt-1 h-4 w-4 shrink-0 accent-amber-400" />
        <span>
          <b className="text-white">Parent or guardian consent.</b> I’m under 18, and my parent or guardian has read the{" "}
          <Link href="/privacy#children" target="_blank" className="text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          and agrees that I use StudentOS.
        </span>
      </label>
      {error && <p className="mt-2 pl-7 text-[12.5px] text-rose-300">{error}</p>}
    </div>
  );
}
