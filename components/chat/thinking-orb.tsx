"use client";

/* The assistant's "thinking" orb (idea from the 21st.dev "AI thinking orb"): a sphere
   of dots drawn on a canvas. It assembles from the top down, turns while light runs
   across the dots in four patterns (Thinking, Searching, Analyzing, Composing), and
   when the answer is ready it sweeps green from the top and collapses into a vortex.
   Violet in our theme. Reduced motion: a still orb and plain labels. */

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/primitives";

const LABELS = ["Thinking", "Searching", "Analyzing", "Composing"];
const SIZE = 132; // css px of the canvas
const R = 46; // sphere radius
const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIo = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* dots on rings of a sphere */
const DOTS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: { x: number; y: number; z: number; u: number; s: number }[] = [];
  const RINGS = 14;
  for (let k = 0; k < RINGS; k++) {
    const y = 1 - ((k + 0.5) / RINGS) * 2;
    const r = Math.sqrt(1 - y * y);
    const m = Math.max(4, Math.round(26 * r));
    for (let j = 0; j < m; j++) {
      const a = (j / m) * TAU + k * 0.35;
      out.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, u: (1 - y) / 2, s: rand() * TAU });
    }
  }
  return out;
})();

export function ThinkingOrb({ done = false }: { done?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(done);
  doneRef.current = done;
  const [label, setLabel] = useState(0);
  const labelRef = useRef(0);
  labelRef.current = label;

  // cycle the label while thinking
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setLabel((l) => (l + 1) % LABELS.length), 1150);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = SIZE * dpr;
    cv.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const light = document.documentElement.classList.contains("light");
    // dot colour: violet → emerald as the answer sweeps in
    const base = light ? [109, 40, 217] : [196, 181, 253];
    const green = light ? [5, 150, 105] : [52, 211, 153];

    const N = DOTS.length;
    const lit = new Float32Array(N);
    const pw = [1, 0, 0, 0];
    let raf = 0;
    let last = performance.now();
    const born = last;
    let doneAt = 0;
    let time = 0;
    let rot = 0;
    const CP = Math.cos(0.35);
    const SP = Math.sin(0.35);
    const C = SIZE / 2;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = still ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      if (doneRef.current && !doneAt) doneAt = now;

      // timeline
      const k = still ? 1 : easeOut(clamp01((now - born) / 800)); // assemble
      const pop = still ? 1 : 1 + 0.05 * Math.sin(Math.PI * clamp01((now - born) / 800));
      const dT = doneAt ? now - doneAt : 0;
      const sweep = doneAt ? easeIo(clamp01(dT / 450)) : 0; // turns green from the top
      const collapse = doneAt ? easeIo(clamp01((dT - 350) / 350)) : 0; // vortex inwards
      const spin = doneAt ? 0.9 - 0.6 * sweep : 0.9 * k;
      rot += spin * dt;
      const vortex = collapse * 1.6;
      const yaw = rot + vortex;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);

      // which light pattern is showing follows the label
      const prog = labelRef.current % 4;
      const step = dt / 0.35;
      for (let q = 0; q < 4; q++) {
        const d = (q === prog ? 1 : 0) - pw[q];
        pw[q] += Math.abs(d) <= step ? d : d > 0 ? step : -step;
      }
      const decay = Math.exp(-dt / 0.5);
      const h0 = (time * 300) % N;
      const h3 = (time * 480) % N;
      const a1 = time * 0.8;
      const b1 = Math.sin(time * 0.5) * 0.9;
      const f1 = [Math.cos(b1) * Math.cos(a1), Math.sin(b1), Math.cos(b1) * Math.sin(a1)];
      const a2 = time * 0.55 + 2.1;
      const b2 = Math.cos(time * 0.42) * 0.9;
      const f2 = [Math.cos(b2) * Math.cos(a2), Math.sin(b2), Math.cos(b2) * Math.sin(a2)];
      const lat = Math.sin(time * 2.2);
      const gain = 1 - sweep;

      ctx.clearRect(0, 0, SIZE, SIZE);
      const drawn: { x: number; y: number; r: number; a: number; g: number; d: number }[] = [];
      for (let n = 0; n < N; n++) {
        const { x: dx, y: dy, z: dz, u, s } = DOTS[n];
        let pulse = 0;
        if (pw[0] > 0.001) {
          let dd = Math.abs(n - h0);
          if (dd > N - dd) dd = N - dd;
          const v = Math.max(0, 1 - dd / 16);
          pulse = Math.max(pulse, v * v * pw[0]);
        }
        if (pw[1] > 0.001) {
          const v = Math.max(0, (Math.max(dx * f1[0] + dy * f1[1] + dz * f1[2], dx * f2[0] + dy * f2[1] + dz * f2[2]) - 0.72) / 0.28);
          pulse = Math.max(pulse, v * v * pw[1]);
        }
        if (pw[2] > 0.001) {
          const e = dy - lat;
          const v = Math.max(0, 1 - (e * e) / 0.02);
          pulse = Math.max(pulse, v * v * pw[2]);
        }
        if (pw[3] > 0.001) {
          let dd = Math.abs(n - h3);
          if (dd > N - dd) dd = N - dd;
          const v = Math.max(0, 1 - dd / 22);
          pulse = Math.max(pulse, v * v * pw[3]);
        }
        const l = Math.max(lit[n] * decay, pulse * gain);
        lit[n] = l;

        // top dots appear first; on collapse the bottom goes first
        const ki = clamp01(k * 1.6 - 0.6 * u) * (1 - clamp01(collapse * 1.6 - 0.6 * (1 - u)));
        if (ki <= 0.001) continue;
        const eo = easeOut(ki);
        const kk = eo * pop;
        const x1 = dx * cyw + dz * syw;
        const z1 = -dx * syw + dz * cyw;
        const y2 = dy * CP - z1 * SP;
        const z2 = dy * SP + z1 * CP;
        const f = 2.8 / (2.8 - z2);
        const depth = (z2 + 1) / 2;
        let ox = x1 * R * kk * f;
        let oy = -y2 * R * kk * f;
        if (vortex > 0.001) {
          const sw = (1 - ki) * vortex * 1.5;
          const cc = Math.cos(sw);
          const ss = Math.sin(sw);
          const tx = ox * cc - oy * ss;
          oy = ox * ss + oy * cc;
          ox = tx;
        }
        const g = clamp01((sweep * 1.4 - u) / 0.4);
        let a = 0.12 + 0.035 * Math.sin(s + time * 1.6) * (1 - g) + 0.32 * depth * depth + 0.75 * l * (1 - g) + g * (0.55 + 0.4 * depth);
        a = Math.min(1, a) * eo;
        drawn.push({ x: C + ox, y: C + oy, r: (1.1 * (0.45 + 0.75 * depth) * f + 0.9 * l + g * 0.25) * (0.4 + 0.6 * eo), a, g, d: depth });
      }
      // back half first, then the front
      drawn.sort((p, q) => p.d - q.d);
      for (const p of drawn) {
        const c = base.map((b, i) => Math.round(b + (green[i] - b) * p.g));
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex items-center gap-3" role="status" aria-label={done ? "Answer ready" : `StudentOS is ${LABELS[label].toLowerCase()}`}>
      <LogoMark size={22} className="mt-0.5 shrink-0 self-start" />
      <div className="flex items-center gap-1">
        <div className="relative h-[132px] w-[132px] shrink-0">
          <div className={`pointer-events-none absolute inset-4 rounded-full blur-2xl transition-colors duration-500 ${done ? "bg-emerald-400/25" : "bg-violet-500/25"}`} />
          <canvas ref={canvas} aria-hidden className="relative h-full w-full" />
        </div>
        <span key={done ? "done" : label} className="orb-label flex items-center gap-1 text-[13.5px] font-medium">
          {done ? (
            <span className="text-emerald-400">Done</span>
          ) : (
            <>
              <span className="orb-shimmer bg-[linear-gradient(90deg,var(--color-white)_0%,var(--color-accent)_50%,var(--color-white)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent">{LABELS[label]}</span>
              <span className="flex gap-0.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <i key={i} className="orb-dot h-1 w-1 rounded-full bg-accent" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
