"use client";

/* Premium plan page (/premium). Payments aren’t live yet: students can ask for
   early access; the founder turns Premium on by hand (see lib/server/premium.ts). */

import Link from "next/link";
import { PageHeader } from "@/components/free/parts";
import { PremiumBadge } from "@/components/premium/premium-gate";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { CheckIcon, CrownIcon } from "@/components/ui/icons";
import { Card, Pill } from "@/components/ui/primitives";
import { FREE_CERT_LIMIT } from "@/lib/learn";
import { PREMIUM_FEATURES, PREMIUM_PRICE, usePremium } from "@/lib/premium";
import { useStore } from "@/lib/store";

const ICONS: { icon: FancyIconName; tone: FancyTone }[] = [
  { icon: "mic", tone: "violet" },
  { icon: "certificate", tone: "amber" },
  { icon: "quiz", tone: "pink" },
  { icon: "resume", tone: "emerald" },
  { icon: "rocket", tone: "amber" },
  { icon: "bulb", tone: "cyan" },
];

const FREE = ["AI study plan and schedule", "Personalised video courses", "AI assistant (60 messages a day)", `${FREE_CERT_LIMIT} certificates`, "Study materials and revision quizzes", "Resume creator"];

export default function PremiumPage() {
  const { premium, loading } = usePremium();
  const { state } = useStore();
  const ask = `mailto:studentoshr@gmail.com?subject=${encodeURIComponent("Premium early access · StudentOS")}&body=${encodeURIComponent(`Hi StudentOS team,\n\nI'd like early access to Premium.\n\nName: ${state.profile.name}\nEmail: ${state.profile.email}\n`)}`;

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader icon="diamond"
        tone="violet"
        title="StudentOS Premium" sub="More practice, more proof. Everything in Free, plus tools to get job-ready." actions={premium ? <PremiumBadge /> : undefined} />

      {premium && (
        <Card glow className="mt-5 flex flex-wrap items-center gap-4 p-5">
          <FancyIcon name="certificate" tone="amber" size={48} />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-white">You’re on Premium 🎉</p>
            <p className="text-[12.5px] text-white/55">All Premium features are unlocked on your account.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[["/tests", "Practice Arena"], ["/learn?tab=materials&m=notes", "AI notes"]].map(([h, l]) => (
              <Link key={h} href={h} className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-black">
                {l}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-[13px] font-semibold text-white/60">Free</p>
          <p className="mt-1 text-[34px] font-bold text-white">₹0</p>
          <p className="text-[12.5px] text-white/50">Forever</p>
          <ul className="mt-5 space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-white/75">
                <CheckIcon size={14} className="text-accent" /> {f}
              </li>
            ))}
          </ul>
        </Card>

        <div className="land-ring rounded-2xl">
          <div className="h-full rounded-2xl bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,211,238,0.06))] p-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-200">
                <CrownIcon size={14} /> Premium
              </p>
              <Pill tone="amber" dot>Launching soon</Pill>
            </div>
            <p className="mt-1 text-[34px] font-bold text-white">
              ₹{PREMIUM_PRICE}
              <span className="text-[14px] font-medium text-white/55"> / month</span>
            </p>
            <p className="text-[12.5px] text-white/50">Everything in Free, plus:</p>
            <ul className="mt-5 space-y-3.5">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={f.title} className="flex items-start gap-3">
                  <FancyIcon name={ICONS[i]?.icon ?? "star"} tone={ICONS[i]?.tone ?? "violet"} size={38} />
                  <span>
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-white">
                      {f.title}
                      {f.ready ? <Pill tone="green">Ready</Pill> : <Pill>Coming soon</Pill>}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-white/60">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!premium && !loading && (
              <>
                <a href={ask} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[14px] font-semibold text-[#ffffff] shadow-[0_12px_36px_rgba(139,92,246,0.4)]">
                  <CrownIcon size={15} /> Ask for early access
                </a>
                <p className="mt-2 text-center text-[11.5px] text-white/45">Online payment is launching soon. Until then, email us and we’ll turn Premium on for you.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
