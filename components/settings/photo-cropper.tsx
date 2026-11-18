"use client";

/* Crop a profile photo before saving: drag to move, pinch / scroll / slider to zoom.
   The circle shows what the avatar will look like. */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cropPhoto } from "@/lib/photo";

type Pt = { x: number; y: number };

export function PhotoCropper({ img, onCancel, onDone }: { img: HTMLImageElement; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [stage, setStage] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 }); // image top-left, relative to the stage
  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const base = stage / Math.min(w, h); // scale where the image just covers the circle
  const scale = base * zoom;

  // stage size: up to 280 px, smaller on narrow phones
  useEffect(() => {
    const fit = () => setStage(Math.max(200, Math.min(280, window.innerWidth - 72)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // keep the image covering the whole square
  const clamp = (p: Pt, s = scale): Pt => ({
    x: Math.min(0, Math.max(stage - w * s, p.x)),
    y: Math.min(0, Math.max(stage - h * s, p.y)),
  });

  // start centred whenever the stage size changes
  useEffect(() => {
    setZoom(1);
    setPos({ x: (stage - w * base) / 2, y: (stage - h * base) / 2 });
  }, [stage, w, h, base]);

  /** Zoom to z, keeping the point `at` (stage pixels) still. */
  const zoomTo = (z: number, at: Pt = { x: stage / 2, y: stage / 2 }) => {
    const nz = Math.min(4, Math.max(1, z));
    const ns = base * nz;
    const ix = (at.x - pos.x) / scale;
    const iy = (at.y - pos.y) / scale;
    setZoom(nz);
    setPos(clamp({ x: at.x - ix * ns, y: at.y - iy * ns }, ns));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const save = () => onDone(cropPhoto(img, -pos.x / scale, -pos.y / scale, stage / scale));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <div className="absolute inset-0 animate-fade-in bg-scrim/70" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-[360px] animate-fade-in rounded-xl border border-white/10 bg-raised p-5 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-white">Crop your photo</h2>
        <p className="mt-1 text-[12px] text-white/55">Drag to move. Pinch, scroll or use the slider to zoom.</p>

        <div
          className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-lg bg-black active:cursor-grabbing"
          style={{ width: stage, height: stage }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
            }
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) return;
            const now = { x: e.clientX, y: e.clientY };
            pointers.current.set(e.pointerId, now);
            if (pointers.current.size === 2 && pinch.current) {
              const [a, b] = [...pointers.current.values()];
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist), { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top });
            } else if (pointers.current.size === 1) {
              setPos((p) => clamp({ x: p.x + now.x - prev.x, y: p.y + now.y - prev.y }));
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            pinch.current = null;
          }}
          onWheel={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), { x: e.clientX - r.left, y: e.clientY - r.top });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
            style={{ width: w * scale, height: h * scale, transform: `translate(${pos.x}px, ${pos.y}px)` }}
          />
          {/* the round avatar, with the rest dimmed */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0_/_0.55)] ring-2 ring-white/80" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-[11px] text-white/45">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 flex-1 accent-white"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={save}>
            Save photo
          </Button>
        </div>
      </div>
    </div>
  );
}
