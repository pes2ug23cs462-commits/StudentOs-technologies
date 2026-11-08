"use client";

/* Motion helpers for the public website (landing, about, careers, contact).
   Everything respects the OS “reduce motion” setting. */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

export const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds data-shown to every .reveal element inside `root` once it scrolls into view. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".reveal") ?? [];
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.setAttribute("data-shown", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.setAttribute("data-shown", "");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [root]);
}

/** Writes the pointer position (-1…1) into --mx / --my on the element. */
export function usePointerVars<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    const move = (e: globalThis.PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--mx", Math.max(-1, Math.min(1, x)).toFixed(3));
        el.style.setProperty("--my", Math.max(-1, Math.min(1, y)).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  return ref;
}

/** 0 when the element’s top enters the bottom of the screen, 1 when it is well inside. */
export function useScrollProgress<T extends HTMLElement>(span = 0.7) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return setP(1);
    let frame = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.max(0, Math.min(1, (vh - r.top) / (vh * span))));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [span]);
  return [ref, p] as const;
}

/** A card that tilts toward the mouse, with a light spot following it. */
export function TiltCard({ className, children, style, max = 12 }: { className?: string; children: ReactNode; style?: CSSProperties; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion() || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max * 1.15}deg)`;
    el.style.setProperty("--sx", `${x * 100}%`);
    el.style.setProperty("--sy", `${y * 100}%`);
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      style={style}
      className={cn("group relative overflow-hidden transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]", className)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(280px_circle_at_var(--sx,50%)_var(--sy,50%),rgba(124,58,237,0.22),transparent_60%)]" />
      {children}
    </div>
  );
}

export function Glass({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn("land-glass rounded-2xl", className)} style={style}>
      {children}
    </div>
  );
}

/** Text that types itself out, once. */
export function Typing({ text, start = 1.2, speed = 26 }: { text: string; start?: number; speed?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return setShown(text.length);
    setShown(0);
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setShown(i);
      if (i < text.length) t = setTimeout(tick, speed);
    };
    t = setTimeout(tick, start * 1000);
    return () => clearTimeout(t);
  }, [text, start, speed]);
  return (
    <span>
      {text.slice(0, shown)}
      {shown < text.length && <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-cyan-300" />}
    </span>
  );
}

/** Section heading used across the site. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[12px] font-semibold tracking-[0.14em] text-accent uppercase", className)}>{children}</p>;
}
