"use client";

/* “Starts in 1 d 04:12:33”: ticks every second, each changed digit fades in. */

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ to, className }: { to: Date; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return null;
  const left = Math.max(0, Math.floor((to.getTime() - now) / 1000));
  if (!left) return <span className={className}>Starting now</span>;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const text = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return (
    <span className={className} aria-label={`Starts in ${d ? `${d} days ` : ""}${h} hours ${m} minutes`}>
      <span aria-hidden className="inline-flex items-baseline gap-1 tabular-nums">
        <span className="text-white/50">Starts in</span>
        {d > 0 && <span className="font-semibold text-white">{d}d</span>}
        <span>
          {text.split("").map((c, i) => (
            <span key={`${i}-${c}`} className={c === ":" ? "px-px text-white/35" : "ui-digit font-semibold text-white"}>
              {c}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
