"use client";

/* A 3D bar city: one tower per section × subject, height = readiness.
   Pure CSS 3D (no libraries). Drag to turn it; hover a tower for its number.
   Towers rise when it first appears. Flat colours under reduced motion too. */

import { useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import { cn } from "@/lib/utils";

/* rose (weak) → amber → violet (strong), blended smoothly so small differences show */
const STOPS: [number, [number, number, number]][] = [
  [35, [244, 63, 94]],
  [55, [245, 158, 11]],
  [75, [124, 58, 237]],
];
function rgb(v: number) {
  if (v <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    const [a, ca] = STOPS[i - 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return ca.map((x, k) => Math.round(x + (cb[k] - x) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
const shade = ([r, g, b]: [number, number, number], f: number) => `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
const tone = (v: number | null) => {
  if (v == null) return ["#2a2540", "#221e36", "#1b1830"];
  const c = rgb(v);
  return [shade(c, 1.25), shade(c, 0.95), shade(c, 0.72)];
};

export function Skyline3D({ rows, cols, values, height: h0 = 380 }: { rows: string[]; cols: string[]; values: (number | null)[][]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [rz, setRz] = useState(-36);
  const [rx, setRx] = useState(58);
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const drag = useRef<{ x: number; y: number; rz: number; rx: number } | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    const t = setTimeout(() => setGrown(true), 120);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // gentle idle sway until the user turns it themselves
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!touched.current) setRz(-36 + Math.sin((now - start) / 2600) * 7);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const height = w < 520 ? Math.min(h0, 320) : h0;
  const n = Math.max(rows.length, cols.length, 3);
  const S = Math.max(26, Math.min(78, (Math.min(w, 760) * (w < 520 ? 0.5 : 0.62)) / n));
  const B = S * 0.62; // tower footprint
  const MAXH = Math.min(height * 0.48, 190);
  const planeW = cols.length * S;
  const planeH = rows.length * S;

  const down = (e: RPE) => {
    touched.current = true;
    drag.current = { x: e.clientX, y: e.clientY, rz, rx };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: RPE) => {
    const d = drag.current;
    if (!d) return;
    setRz(d.rz + (e.clientX - d.x) * 0.35);
    setRx(Math.max(30, Math.min(72, d.rx - (e.clientY - d.y) * 0.25)));
  };
  const up = () => (drag.current = null);

  const hv = hover ? values[hover.r]?.[hover.c] : null;

  return (
    <div ref={box} className="relative select-none" style={{ height }}>
      {/* hover read-out and legend */}
      <div className="pointer-events-none relative z-10 flex min-h-[44px] flex-wrap items-start justify-between gap-2">
        {hover ? (
          <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
            <p className="text-[11.5px] text-white/55">{rows[hover.r]} · {cols[hover.c]}</p>
            <p className="text-[17px] font-semibold text-white tabular-nums">{hv == null ? "No tests yet" : `${hv}% ready`}</p>
          </div>
        ) : (
          <p className="text-[11.5px] text-white/40">Drag to turn · tap or hover a tower</p>
        )}
        <span className="flex items-center gap-2 text-[11px] text-white/55">
          Weak
          <i className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg, rgb(244,63,94), rgb(245,158,11), rgb(124,58,237))" }} />
          Strong
        </span>
      </div>

      <div
        className="absolute inset-x-0 top-12 bottom-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ perspective: 1200, perspectiveOrigin: "50% 40%" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => setHover(null)}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{ width: planeW, height: planeH, transformStyle: "preserve-3d", transform: `translate(-50%, -46%) rotateX(${rx}deg) rotateZ(${rz}deg)` }}
        >
          {/* floor */}
          <div className="absolute -inset-6 rounded-2xl" style={{ background: "radial-gradient(closest-side, rgba(124,58,237,0.28), rgba(124,58,237,0.04) 70%, transparent)", transform: "translateZ(-1px)" }} />
          <div className="absolute inset-0 rounded-lg" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`, backgroundSize: `${S}px ${S}px`, border: "1px solid rgba(255,255,255,0.1)" }} />

          {/* labels lying on the floor */}
          {rows.map((r, i) => (
            <span key={r} className="absolute text-right text-[10.5px] sm:text-[11px] font-medium whitespace-nowrap text-white/60" style={{ right: planeW + 10, top: i * S + S / 2 - 8, width: 140 }}>{r}</span>
          ))}
          {cols.map((c, i) => (
            <span key={c} className="absolute origin-top-left text-[10.5px] sm:text-[11px] font-medium whitespace-nowrap text-white/60" style={{ left: i * S + S / 2 - 4, top: planeH + 10, transform: "rotate(40deg)" }}>{c}</span>
          ))}

          {/* towers */}
          {values.map((row, r) =>
            row.map((v, c) => {
              const H = v == null ? 3 : Math.max(6, (Math.max(0, v - 15) / 85) * MAXH);
              const h = grown ? H : 2;
              const [top, front, side] = tone(v);
              const on = hover?.r === r && hover?.c === c;
              const delay = `${(r * cols.length + c) * 35}ms`;
              const tr = `height 900ms cubic-bezier(.2,.8,.2,1) ${delay}, transform 900ms cubic-bezier(.2,.8,.2,1) ${delay}`;
              return (
                <div
                  key={`${r}-${c}`}
                  className="absolute"
                  style={{ left: c * S + (S - B) / 2, top: r * S + (S - B) / 2, width: B, height: B, transformStyle: "preserve-3d" }}
                  onPointerEnter={() => setHover({ r, c })}
                  onPointerDown={() => setHover({ r, c })}
                >
                  {/* front (+y) */}
                  <div className="absolute left-0" style={{ top: B, width: B, height: h, background: front, transformOrigin: "top", transform: "rotateX(90deg)", transition: tr, filter: on ? "brightness(1.25)" : undefined }} />
                  {/* back (−y) */}
                  <div className="absolute top-0 left-0" style={{ width: B, height: h, background: side, transformOrigin: "top", transform: "rotateX(90deg)", transition: tr }} />
                  {/* right (+x) */}
                  <div className="absolute top-0" style={{ left: B, width: h, height: B, background: side, transformOrigin: "left", transform: "rotateY(-90deg)", transition: tr, filter: on ? "brightness(1.25)" : undefined }} />
                  {/* left (−x) */}
                  <div className="absolute top-0 left-0" style={{ width: h, height: B, background: front, transformOrigin: "left", transform: "rotateY(-90deg)", transition: tr }} />
                  {/* top */}
                  <div className={cn("absolute inset-0 rounded-[2px]")} style={{ background: top, transform: `translateZ(${h}px)`, transition: tr, boxShadow: on ? "0 0 24px 6px rgba(255,255,255,0.35)" : `0 0 16px 1px ${top.replace("rgb", "rgba").replace(")", ",0.35)")}`, filter: on ? "brightness(1.2)" : undefined }} />
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

/** A card that tilts in 3D toward the pointer, with a soft glare. */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0, gx: 50, gy: 50, on: false });
  return (
    <div style={{ perspective: 900 }} className={className}>
      <div
        ref={el}
        onPointerMove={(e) => {
          const r = el.current!.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          setT({ x: (0.5 - py) * 10, y: (px - 0.5) * 12, gx: px * 100, gy: py * 100, on: true });
        }}
        onPointerLeave={() => setT({ x: 0, y: 0, gx: 50, gy: 50, on: false })}
        className="relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f0f11] transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${t.x}deg) rotateY(${t.y}deg) translateZ(0)`, transformStyle: "preserve-3d" }}
      >
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ opacity: t.on ? 1 : 0, background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, rgba(167,139,250,0.18), transparent 55%)` }} />
        {children}
      </div>
    </div>
  );
}
