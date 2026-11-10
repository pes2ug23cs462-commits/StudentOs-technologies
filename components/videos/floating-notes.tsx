"use client";

/* Notes in a small window the student can drag anywhere and resize. Where it
   was left (and its size) is remembered on this device. */

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, XIcon } from "@/components/ui/icons";

const KEY = "studentos:notes-window";
type Box = { x: number; y: number; w: number; h: number };

function load(): Box {
  const fallback = { w: 340, h: 300, x: Math.max(16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 360), y: 90 };
  try {
    const b = JSON.parse(localStorage.getItem(KEY) ?? "null") as Box | null;
    return b && [b.x, b.y, b.w, b.h].every(Number.isFinite) ? b : fallback;
  } catch {
    return fallback;
  }
}
const clamp = (b: Box): Box => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const w = Math.min(Math.max(b.w, 240), W - 16);
  const h = Math.min(Math.max(b.h, 180), H - 16);
  return { w, h, x: Math.min(Math.max(8, b.x), W - w - 8), y: Math.min(Math.max(8, b.y), H - h - 8) };
};

export function FloatingNotes({ title, value, placeholder, onChange, onDownload, onDock }: { title: string; value: string; placeholder: string; onChange: (v: string) => void; onDownload: () => void; onDock: () => void }) {
  const [box, setBox] = useState<Box>(() => (typeof window === "undefined" ? { x: 0, y: 0, w: 340, h: 300 } : clamp(load())));
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(box));
    } catch {
      /* storage unavailable */
    }
  }, [box]);

  // keep it on screen when the window size changes
  useEffect(() => {
    const on = () => setBox((b) => clamp(b));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // remember the size after the student resizes it with the corner handle
  useEffect(() => {
    const node = el.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = node.getBoundingClientRect();
      setBox((b) => (Math.abs(b.w - r.width) > 2 || Math.abs(b.h - r.height) > 2 ? { ...b, w: Math.round(r.width), h: Math.round(r.height) } : b));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setBox((b) => clamp({ ...b, x: e.clientX - drag.current!.dx, y: e.clientY - drag.current!.dy }));
  };
  const up = () => (drag.current = null);

  // arrow keys move the window when its title bar is focused
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 12;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!d[e.key]) return;
    e.preventDefault();
    setBox((b) => clamp({ ...b, x: b.x + d[e.key][0], y: b.y + d[e.key][1] }));
  };

  return (
    <div
      ref={el}
      role="dialog"
      aria-label="My notes"
      className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-panel shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h, resize: "both", minWidth: 240, minHeight: 180 }}
    >
      <div
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        aria-label="Drag to move the notes window (or use arrow keys)"
        className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-3 py-2 outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden className="text-[13px] leading-none text-white/35">⠿</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/80">My notes · {title}</span>
        <button type="button" onClick={onDownload} disabled={!value.trim()} aria-label="Download notes" title="Download" className="rounded-md p-1 text-accent hover:bg-white/[0.06] disabled:text-white/25">
          <DownloadIcon size={13} />
        </button>
        <button type="button" onClick={onDock} aria-label="Put the notes back under the video" title="Put back" className="rounded-md p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
          <XIcon size={13} />
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="My notes"
        className="min-h-0 w-full flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/30"
      />
      <p className="shrink-0 px-3 pb-2 text-[10.5px] text-white/35">Saved automatically · drag the top bar to move, the corner to resize</p>
    </div>
  );
}
