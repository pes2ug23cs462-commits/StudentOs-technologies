"use client";

/* The AI interviewer on screen: an illustrated person whose mouth follows the
   voice (lip sync), who blinks and moves a little, like a video call. */

import { useEffect, useRef } from "react";
import type { Talker } from "@/lib/talker";

const MX = 320;
const MY = 250;

/** Lips as one closed shape: a gentle smile at rest, opening with the voice. */
function mouthPath(open: number) {
  const h = open * 14;
  const w = 15 - open * 2.5;
  const cy = MY - 1.5 + open * 1.5; // corners lift a little at rest (smile)
  return `M ${MX - w} ${cy} Q ${MX} ${MY + 0.5 - h * 0.15} ${MX + w} ${cy} Q ${MX} ${MY + 4 + h} ${MX - w} ${cy} Z`;
}

export function Interviewer({ talker, listening }: { talker: Talker | null; listening: boolean }) {
  const mouth = useRef<SVGPathElement>(null);
  const teeth = useRef<SVGPathElement>(null);
  const head = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const brows = useRef<SVGGElement>(null);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let nextBlink = performance.now() + 2500;
    let blinkAt = -1;
    const tick = (now: number) => {
      const lv = talker?.level() ?? 0;
      mouth.current?.setAttribute("d", mouthPath(lv));
      teeth.current?.setAttribute("opacity", String(Math.max(0, Math.min(1, (lv - 0.25) * 2.2))));
      const t = now / 1000;
      if (!still) {
        const tilt = Math.sin(t * 0.6) * 1.1 + (listening ? 1.6 : 0) + lv * 1.2;
        const nod = Math.sin(t * 1.3) * 0.8 + lv * 1.5;
        head.current?.setAttribute("transform", `rotate(${tilt.toFixed(2)} 320 300) translate(0 ${nod.toFixed(2)})`);
        body.current?.setAttribute("transform", `translate(0 ${(Math.sin(t * 1.1) * 1.4).toFixed(2)})`);
        brows.current?.setAttribute("transform", `translate(0 ${(-lv * 2.5 - (listening ? 1.5 : 0)).toFixed(2)})`);
      }
      if (now > nextBlink) {
        blinkAt = now;
        nextBlink = now + 2600 + Math.random() * 2600;
      }
      const b = blinkAt < 0 ? 1 : Math.min(1, Math.abs((now - blinkAt) / 75 - 1));
      if (now - blinkAt > 150) blinkAt = -1;
      lids.current?.setAttribute("transform", `translate(0 198) scale(1 ${(1 - b).toFixed(3)})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [talker, listening]);

  return (
    <svg viewBox="64 76 512 288" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="AI interviewer">
      <defs>
        <linearGradient id="iv-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15112a" />
          <stop offset="1" stopColor="#0b0a14" />
        </linearGradient>
        <radialGradient id="iv-light" cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#3b2a6b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3b2a6b" stopOpacity="0" />
        </radialGradient>
        <filter id="iv-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="iv-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98d68" />
          <stop offset="1" stopColor="#b97a56" />
        </linearGradient>
        <linearGradient id="iv-coat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2350" />
          <stop offset="1" stopColor="#171330" />
        </linearGradient>
      </defs>

      {/* room */}
      <rect width="640" height="400" fill="url(#iv-room)" />
      <rect width="640" height="400" fill="url(#iv-light)" />
      <g filter="url(#iv-blur)" opacity="0.8">
        <circle cx="80" cy="90" r="9" fill="#f5b971" opacity="0.7" />
        <circle cx="120" cy="150" r="6" fill="#f5b971" opacity="0.5" />
        <circle cx="545" cy="80" r="12" fill="#7c5cff" opacity="0.6" />
        <circle cx="590" cy="170" r="8" fill="#22d3ee" opacity="0.45" />
        <circle cx="505" cy="230" r="6" fill="#f5b971" opacity="0.4" />
        <rect x="40" y="200" width="120" height="6" rx="3" fill="#2a2347" />
        <rect x="490" y="120" width="120" height="6" rx="3" fill="#2a2347" />
        <rect x="60" y="170" width="18" height="30" rx="3" fill="#3a2f63" />
        <rect x="84" y="178" width="14" height="22" rx="3" fill="#4b3d80" />
        <rect x="520" y="92" width="16" height="28" rx="3" fill="#3a2f63" />
      </g>

      {/* body */}
      <g ref={body}>
        <path d="M150 400 C 165 345, 220 318, 285 306 L 355 306 C 420 318, 475 345, 490 400 Z" fill="url(#iv-coat)" />
        <path d="M300 306 L 320 352 L 340 306 Z" fill="#ece8f4" />
        <path d="M285 306 L 320 352 L 300 400 L 262 400 Z" fill="#221c42" opacity="0.7" />
        <path d="M355 306 L 320 352 L 340 400 L 378 400 Z" fill="#221c42" opacity="0.7" />
        <path d="M298 282 L 342 282 L 344 312 Q 320 330 296 312 Z" fill="#b2734f" />
      </g>

      {/* head */}
      <g ref={head}>
        {/* hair behind */}
        <path d="M244 200 C 236 132, 282 104, 322 104 C 366 104, 406 134, 398 204 C 404 250, 400 296, 388 322 C 370 330, 352 318, 344 300 L 296 300 C 288 318, 268 330, 252 322 C 240 296, 238 250, 244 200 Z" fill="#1d1416" />
        <ellipse cx="261" cy="210" rx="7" ry="12" fill="#b9795a" />
        <ellipse cx="379" cy="210" rx="7" ry="12" fill="#b9795a" />
        {/* face */}
        <path d="M262 192 C 262 146, 290 130, 320 130 C 350 130, 378 146, 378 192 C 378 238, 354 276, 320 279 C 286 276, 262 238, 262 192 Z" fill="url(#iv-skin)" />
        <path d="M268 230 C 280 262, 300 276, 320 279 C 340 276, 360 262, 372 230 C 360 258, 342 270, 320 272 C 298 270, 280 258, 268 230 Z" fill="#a86b4b" opacity="0.35" />
        {/* hair front: side part with a soft sweep */}
        <path d="M258 196 C 254 150, 284 118, 326 118 C 364 118, 390 146, 384 196 C 378 170, 366 152, 344 146 C 324 160, 296 170, 268 172 C 264 180, 260 188, 258 196 Z" fill="#1d1416" />
        <path d="M300 128 C 322 122, 352 128, 370 148" stroke="#3a2a2f" strokeWidth="2.2" fill="none" opacity="0.7" strokeLinecap="round" />
        <path d="M282 140 C 296 132, 312 130, 326 132" stroke="#3a2a2f" strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />

        <g ref={brows}>
          <path d="M285 182 Q 296 176 308 179" stroke="#2b1c1d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M332 179 Q 344 176 355 182" stroke="#2b1c1d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>

        {/* eyes */}
        <g>
          <ellipse cx="297" cy="198" rx="9.5" ry="6" fill="#f7f2ef" />
          <ellipse cx="343" cy="198" rx="9.5" ry="6" fill="#f7f2ef" />
          <circle cx="297.5" cy="198.5" r="5.2" fill="#4a2c1d" />
          <circle cx="343.5" cy="198.5" r="5.2" fill="#4a2c1d" />
          <circle cx="297.5" cy="198.5" r="2.3" fill="#140c09" />
          <circle cx="343.5" cy="198.5" r="2.3" fill="#140c09" />
          <circle cx="299.3" cy="196.6" r="1.4" fill="#fff" />
          <circle cx="345.3" cy="196.6" r="1.4" fill="#fff" />
          <path d="M287 197 Q 297 189 307.5 196" stroke="#1d1213" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M332.5 196 Q 343 189 353 197" stroke="#1d1213" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {/* eyelids: shown over the eyes when blinking */}
          <g ref={lids} transform="translate(0 198) scale(1 0)">
            <ellipse cx="297" cy="0" rx="10.5" ry="7" fill="#c48963" />
            <ellipse cx="343" cy="0" rx="10.5" ry="7" fill="#c48963" />
          </g>
        </g>

        {/* nose */}
        <path d="M321 204 Q 318 220 314 227 Q 320 231 327 228" stroke="#9e6646" strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.75" />
        <circle cx="289" cy="226" r="10" fill="#e5806f" opacity="0.16" />
        <circle cx="351" cy="226" r="10" fill="#e5806f" opacity="0.16" />

        {/* mouth */}
        <path ref={mouth} d={mouthPath(0)} fill="#5c1f25" stroke="#a5504f" strokeWidth="2.4" strokeLinejoin="round" />
        <path ref={teeth} d={`M ${MX - 10} ${MY + 0.5} Q ${MX} ${MY - 0.5} ${MX + 10} ${MY + 0.5} L ${MX + 9} ${MY + 3.5} Q ${MX} ${MY + 2.8} ${MX - 9} ${MY + 3.5} Z`} fill="#f4efe9" opacity="0" />

        {/* earrings */}
        <circle cx="261" cy="226" r="2.8" fill="#e6c27a" />
        <circle cx="379" cy="226" r="2.8" fill="#e6c27a" />
      </g>
    </svg>
  );
}

/** Live bars from the student's microphone while they answer. */
export function MicBars({ stream, bars = 28 }: { stream: MediaStream | null; bars?: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stream) return;
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
      const tick = () => {
        an.getByteFrequencyData(data);
        const kids = box.current?.children;
        if (kids) for (let k = 0; k < kids.length; k++) {
          const v = data[2 + Math.floor((k / kids.length) * (data.length * 0.6))] / 255;
          (kids[k] as HTMLElement).style.transform = `scaleY(${Math.max(0.08, v).toFixed(3)})`;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* no meter, recording still works */
    }
    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => {});
    };
  }, [stream]);
  return (
    <div ref={box} className="flex h-10 items-center justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, k) => (
        <span key={k} className="h-full w-[3px] origin-center rounded-full bg-gradient-to-t from-violet-500 to-cyan-300" style={{ transform: "scaleY(0.08)", transition: "transform 60ms linear" }} />
      ))}
    </div>
  );
}
