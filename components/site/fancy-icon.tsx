/* Glossy 3D icon tiles for the public website.
   Each glyph is a two-tone illustration (solid shapes + see-through fills) drawn
   for its feature, sitting on a lit gradient tile that lifts and turns on hover. */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const S = { fill: "#ffffff" };
const SOFT = { fill: "#ffffff", fillOpacity: 0.38 };
const LINE = { fill: "none", stroke: "#ffffff", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const GLYPHS: Record<string, ReactNode> = {
  plan: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3.2" style={SOFT} />
      <path d="M3 8.2a3.2 3.2 0 0 1 3.2-3.7h11.6A3.2 3.2 0 0 1 21 8.2V9H3z" style={S} />
      <rect x="7" y="2.6" width="2" height="4" rx="1" style={S} />
      <rect x="15" y="2.6" width="2" height="4" rx="1" style={S} />
      <path d="m8.2 14.6 2.5 2.4 5-5" style={LINE} />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="4" width="19" height="13.5" rx="3" style={SOFT} />
      <path d="M10 7.8v6l5-3z" style={S} />
      <rect x="4.5" y="19.3" width="15" height="2" rx="1" style={SOFT} />
      <rect x="4.5" y="19.3" width="8.5" height="2" rx="1" style={S} />
    </>
  ),
  assistant: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.6c-.5.4-1.2 0-1.2-.6V16H6.5A2.5 2.5 0 0 1 4 13.5z" style={SOFT} />
      <path d="M12 5.6c.3 1.8 1 2.6 2.8 2.9-1.8.3-2.5 1.1-2.8 2.9-.3-1.8-1-2.6-2.8-2.9 1.8-.3 2.5-1.1 2.8-2.9z" style={S} />
      <circle cx="16.3" cy="12" r="1.1" style={S} />
      <circle cx="7.8" cy="12" r="1.1" style={S} />
    </>
  ),
  certificate: (
    <>
      <path d="m8.3 13.5-2.2 7.2 3.2-1.2 1.9 2.6 1.6-6.5zM15.7 13.5l2.2 7.2-3.2-1.2-1.9 2.6-1.6-6.5z" style={SOFT} />
      <circle cx="12" cy="9.5" r="6.6" style={S} />
      <path d="m12 6.2 1 2.1 2.3.3-1.7 1.6.4 2.3L12 11.4l-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" />
    </>
  ),
  quiz: (
    <>
      <path d="M6 2.8h8.2L19.5 8v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2z" style={SOFT} />
      <path d="M14 2.8V7a1.2 1.2 0 0 0 1.2 1.2h4.3z" style={S} />
      <circle cx="8" cy="12.5" r="1.3" style={S} />
      <rect x="10.5" y="11.6" width="6" height="1.8" rx=".9" style={S} />
      <path d="m7 16.7 1 1 1.8-1.9" style={LINE} />
      <rect x="10.5" y="16.3" width="4.5" height="1.8" rx=".9" style={S} />
    </>
  ),
  resume: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="3" style={SOFT} />
      <circle cx="8.6" cy="9.3" r="2.6" style={S} />
      <path d="M4.8 15.6c.6-1.9 2.1-2.9 3.8-2.9s3.2 1 3.8 2.9z" style={S} />
      <rect x="13.3" y="7.5" width="5.2" height="1.8" rx=".9" style={S} />
      <rect x="13.3" y="11" width="4" height="1.8" rx=".9" style={S} />
      <rect x="5" y="17.5" width="13.5" height="1.6" rx=".8" style={SOFT} />
    </>
  ),
  mic: (
    <>
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" style={S} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" style={LINE} />
      <rect x="11" y="17.2" width="2" height="3.4" rx="1" style={S} />
      <rect x="8" y="20" width="8" height="1.8" rx=".9" style={SOFT} />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 4.5 5.6v5.8c0 4.7 3.2 8.3 7.5 10.1 4.3-1.8 7.5-5.4 7.5-10.1V5.6z" style={SOFT} />
      <path d="M12 2.5v19c4.3-1.8 7.5-5.4 7.5-10.1V5.6z" style={S} fillOpacity={0.55} />
      <path d="m8.7 12 2.3 2.3 4.4-4.6" style={LINE} />
    </>
  ),
  users: (
    <>
      <circle cx="16.5" cy="8" r="2.8" style={SOFT} />
      <path d="M13 19.5c.3-3.2 1.7-5 3.5-5s3.3 1.8 3.5 5z" style={SOFT} />
      <circle cx="9" cy="8.2" r="3.4" style={S} />
      <path d="M3.5 20c.4-4 2.6-6.2 5.5-6.2s5.1 2.2 5.5 6.2z" style={S} />
    </>
  ),
  code: (
    <>
      <rect x="2.5" y="3.5" width="19" height="17" rx="3" style={SOFT} />
      <path d="M2.5 6.5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3V8h-19z" style={S} />
      <path d="m9 11.5-2.5 2.5L9 16.5M15 11.5l2.5 2.5-2.5 2.5M13 10.8l-2 6.4" style={LINE} />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.8 2-1.8 0-1.4-1.3-1.6-1.3-2.9 0-1 .8-1.6 1.9-1.6h2.2A4.2 4.2 0 0 0 21 10.6C21 6.3 17 3 12 3z" style={SOFT} />
      <circle cx="7.6" cy="11" r="1.7" style={S} />
      <circle cx="10.4" cy="7" r="1.7" style={S} />
      <circle cx="15" cy="7.4" r="1.7" style={S} />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="7" width="16" height="12.5" rx="4" style={SOFT} />
      <rect x="11" y="2.8" width="2" height="4.4" rx="1" style={S} />
      <circle cx="12" cy="2.8" r="1.6" style={S} />
      <circle cx="9" cy="12.6" r="1.8" style={S} />
      <circle cx="15" cy="12.6" r="1.8" style={S} />
      <rect x="9" y="16" width="6" height="1.6" rx=".8" style={S} />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 9.5h3.5l8-4.8v14.6l-8-4.8H4a1.5 1.5 0 0 1-1.5-1.5v-2a1.5 1.5 0 0 1 1.5-1.5z" style={SOFT} />
      <path d="M15.5 4.7v14.6a1.4 1.4 0 0 0 2.2-1.1V5.8a1.4 1.4 0 0 0-2.2-1.1z" style={S} />
      <path d="M7 14.5 8.4 20a1.2 1.2 0 0 0 1.2.9h.6a1 1 0 0 0 1-1.3l-1-5.1z" style={S} />
      <path d="M20 9.8c.8.6.8 3.8 0 4.4" style={LINE} />
    </>
  ),
  rocket: (
    <>
      <path d="M14.5 3.2c3-.9 5.4-.9 6.3 0 .9.9.9 3.3 0 6.3-1 3.5-3.9 6.4-7.6 8.3l-7-7c1.9-3.7 4.8-6.6 8.3-7.6z" style={SOFT} />
      <circle cx="15.3" cy="8.7" r="2.2" style={S} />
      <path d="M6.2 10.8 3 10.4l3.4-4h4zM13.2 17.8l.4 3.2 4-3.4v-4z" style={S} />
      <path d="M6.8 16.2c-1.5.2-2.6 1.4-3 4 2.6-.4 3.8-1.5 4-3z" style={S} />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" style={SOFT} />
      <path d="m3.5 7.2 7.3 5.6a2 2 0 0 0 2.4 0l7.3-5.6" style={LINE} />
    </>
  ),
  chat: (
    <>
      <path d="M3.5 6A2.5 2.5 0 0 1 6 3.5h9A2.5 2.5 0 0 1 17.5 6v5.5A2.5 2.5 0 0 1 15 14H9.5l-3.7 3c-.5.4-1.2 0-1.2-.6V14A2.5 2.5 0 0 1 3.5 11.5z" style={S} />
      <path d="M19 8.5a2 2 0 0 1 1.5 2v5a2 2 0 0 1-2 2v2.4c0 .5-.6.8-1 .5l-3.4-2.9H11a2 2 0 0 1-1.8-1.1" style={SOFT} />
    </>
  ),
  bulb: (
    <>
      <path d="M12 2.8a6.5 6.5 0 0 0-3.8 11.8c.6.4.9 1.1.9 1.8v.4h5.8v-.4c0-.7.3-1.4.9-1.8A6.5 6.5 0 0 0 12 2.8z" style={S} />
      <rect x="9" y="18" width="6" height="1.8" rx=".9" style={SOFT} />
      <rect x="10" y="20.6" width="4" height="1.6" rx=".8" style={SOFT} />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" style={SOFT} />
      <path d="m7.8 12.3 2.8 2.8 5.6-5.8" style={{ ...LINE, strokeWidth: 2.4 }} />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" style={SOFT} />
      <path d="M3.5 9.5h17M3.5 14.5h17M12 3c-2.6 2.6-3.6 5.6-3.6 9s1 6.4 3.6 9c2.6-2.6 3.6-5.6 3.6-9S14.6 5.6 12 3z" style={{ ...LINE, strokeWidth: 1.5 }} />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" style={S} />
      <path d="M18 13.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" style={SOFT} />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="4.5" width="16" height="11" rx="2" style={SOFT} />
      <rect x="6" y="6.5" width="12" height="7" rx="1" style={S} fillOpacity={0.55} />
      <path d="M2 17.5h20l-1.2 2a1.5 1.5 0 0 1-1.3.8h-15a1.5 1.5 0 0 1-1.3-.8z" style={S} />
    </>
  ),
  diamond: (
    <>
      <path d="M7 3.5h10l4 5.2L12 20.5 3 8.7z" style={SOFT} />
      <path d="M3 8.7h18L12 20.5z" style={S} fillOpacity={0.7} />
      <path d="M8.5 8.7 12 3.5l3.5 5.2L12 20.5z" style={S} />
    </>
  ),
  bolt: <path d="M13.5 2.5 4.5 13.5h6.5l-1 8 9-11h-6.5z" style={S} />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" style={SOFT} />
      <circle cx="12" cy="12" r="5.5" style={S} fillOpacity={0.6} />
      <circle cx="12" cy="12" r="2.2" style={S} />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" style={{ ...LINE, strokeWidth: 2.2 }} />
      <path d="M12 13c0-4.5-3-7.5-8.5-7.5 0 4.8 3.3 7.5 8.5 7.5z" style={S} />
      <path d="M12 11c0-4.4 2.6-7 7.5-7 0 4.5-2.8 7-7.5 7z" style={SOFT} />
    </>
  ),
  heart: <path d="M12 20.5s-8-4.6-8-10.7A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.8c0 6.1-8 10.7-8 10.7z" style={S} />,
  star: <path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z" style={S} />,
  quote: (
    <>
      <path d="M4 11.5C4 7.6 6 5 9.5 4.5v2.4C7.7 7.4 7 8.6 7 10.5h3V18H4z" style={S} />
      <path d="M13.5 11.5c0-3.9 2-6.5 5.5-7v2.4c-1.8.5-2.5 1.7-2.5 3.6h3V18h-6z" style={SOFT} />
    </>
  ),
};

export type FancyIconName = keyof typeof GLYPHS;

export type FancyTone = "violet" | "cyan" | "emerald" | "amber" | "pink" | "indigo" | "sky";

const TONES: Record<FancyTone, [string, string]> = {
  violet: ["#a78bfa", "#6d28d9"],
  cyan: ["#67e8f9", "#0284c7"],
  emerald: ["#6ee7b7", "#0f766e"],
  amber: ["#fcd34d", "#ea580c"],
  pink: ["#f9a8d4", "#e11d48"],
  indigo: ["#a5b4fc", "#4f46e5"],
  sky: ["#7dd3fc", "#2563eb"],
};

export function FancyIcon({ name, tone = "violet", size = 48, className, float }: { name: FancyIconName; tone?: FancyTone; size?: number; className?: string; float?: boolean }) {
  const [c1, c2] = TONES[tone];
  return (
    <span
      className={cn("fancy-icon relative inline-flex shrink-0 items-center justify-center", float && "[animation:hero-bob_5s_ease-in-out_infinite]", className)}
      style={{ width: size, height: size, "--fi1": c1, "--fi2": c2 } as CSSProperties}
      aria-hidden
    >
      <span className="fancy-icon-tile absolute inset-0" />
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} className="relative drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]" style={{ color: c2 }}>
        {GLYPHS[name]}
      </svg>
    </span>
  );
}
