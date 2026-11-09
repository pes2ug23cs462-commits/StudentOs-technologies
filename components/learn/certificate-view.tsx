"use client";

/* StudentOS course certificate (A4 landscape), drawn in code so it stays sharp
   at any size and in print. Brand band on the left with the logo and the
   verification QR code; the student’s details on the right; a seal and the
   founder’s signature at the bottom. Everything is sized in container units (cqw). */

import { useMemo } from "react";
import { certLabel } from "@/lib/learn";
import { qrPath } from "@/lib/qr";

export interface CertificateDetails {
  id: string;
  name: string;
  course: string;
  duration: string;
  level: string;
  date: string;
  /** e.g. "5/5" */
  score?: string;
  modules?: number;
}

const INK = "#1e1b4b";
const VIOLET = "#5b21b6";
const GREEN = "#15803d";
const MUTED = "#64748b";
const GOLD = "#b8860b";

export function verifyUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify?id=${encodeURIComponent(id)}`;
}

/* Round seal: a rosette with the logo in the middle and text around the edge. */
function Seal() {
  const points = Array.from({ length: 48 }, (_, i) => {
    const r = i % 2 ? 46 : 50;
    const a = (i / 48) * Math.PI * 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="seal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d77a" />
          <stop offset="0.5" stopColor="#d4a72c" />
          <stop offset="1" stopColor="#9a6b06" />
        </linearGradient>
        {/* top arc (left → right over the top) and bottom arc (left → right under the bottom) */}
        <path id="seal-top" d="M17,50 A33,33 0 0,1 83,50" />
        <path id="seal-bottom" d="M12,50 A38,38 0 0,0 88,50" />
      </defs>
      <polygon points={points} fill="url(#seal-gold)" />
      <circle cx="50" cy="50" r="41" fill="#fffaf0" stroke={GOLD} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="27" fill="none" stroke={GOLD} strokeWidth="0.6" strokeDasharray="1.2 1.4" />
      <text fontSize="6.4" fontWeight="700" letterSpacing="1.4" fill={INK} fontFamily="var(--font-cert), sans-serif" textAnchor="middle">
        <textPath href="#seal-top" startOffset="50%">
          STUDENTOS · VERIFIED
        </textPath>
      </text>
      <text fontSize="6.4" fontWeight="700" letterSpacing="1.4" fill={INK} fontFamily="var(--font-cert), sans-serif" textAnchor="middle">
        <textPath href="#seal-bottom" startOffset="50%">
          COMPLETED
        </textPath>
      </text>
      <image href="/studentos-mark.png" x="35" y="33" width="30" height="30" />
    </svg>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`absolute h-[4.5cqw] w-[4.5cqw] ${className}`} aria-hidden>
      <path d="M2 38 V8 a6 6 0 0 1 6-6 H38" fill="none" stroke={VIOLET} strokeWidth="1.6" />
      <path d="M8 38 V14 a6 6 0 0 1 6-6 H38" fill="none" stroke="#c4b5fd" strokeWidth="1" />
      <circle cx="8" cy="8" r="2" fill={GOLD} />
    </svg>
  );
}

export function CertificateView({ cert, printId }: { cert: CertificateDetails; printId?: string }) {
  const qr = useMemo(() => qrPath(verifyUrl(cert.id)), [cert.id]);
  const nameSize = cert.name.length > 28 ? 3.3 : cert.name.length > 20 ? 3.9 : 4.6;
  const courseSize = cert.course.length > 34 ? 2 : 2.5;
  const facts = [
    { label: "Duration", value: cert.duration },
    { label: "Level", value: cert.level },
    ...(cert.modules ? [{ label: "Modules", value: String(cert.modules) }] : []),
    ...(cert.score ? [{ label: "Final quiz", value: cert.score }] : []),
  ];

  return (
    <div
      id={printId}
      className="relative aspect-[297/210] w-full overflow-hidden rounded-xl bg-[#fdfcff] text-left shadow-[0_20px_60px_rgba(0,0,0,0.3)] [container-type:inline-size]"
      style={{ fontFamily: "var(--font-cert), var(--font-inter), system-ui, sans-serif", color: INK }}
    >
      {/* fine background pattern */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="cert-waves" width="60" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 8 Q15 0 30 8 T60 8" fill="none" stroke="#ede9fe" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cert-waves)" />
      </svg>

      {/* left brand band */}
      <div className="absolute inset-y-0 left-0 flex w-[27%] flex-col items-center px-[2.2cqw] pt-[5cqw] pb-[3.2cqw] text-center text-[#ffffff]" style={{ background: "linear-gradient(165deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)" }}>
        <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
          <circle cx="110%" cy="-5%" r="38%" fill="none" stroke="#a5b4fc" strokeWidth="1" />
          <circle cx="110%" cy="-5%" r="48%" fill="none" stroke="#a5b4fc" strokeWidth="1" />
          <circle cx="-10%" cy="105%" r="40%" fill="none" stroke="#c4b5fd" strokeWidth="1" />
        </svg>
        <span className="relative flex h-[9.5cqw] w-[9.5cqw] items-center justify-center rounded-full bg-[#ffffff] shadow-[0_0_0_0.5cqw_rgba(255,255,255,0.12)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/studentos-mark.png" alt="" className="h-[7cqw] w-[7cqw] object-contain" />
        </span>
        <p className="relative mt-[1.6cqw] text-[2.5cqw] leading-none font-bold tracking-tight">
          Student<span className="text-[#a5b4fc]">OS</span>
        </p>
        <p className="relative mt-[0.6cqw] text-[0.85cqw] font-semibold tracking-[0.35em] text-[#c7d2fe]">TECHNOLOGIES</p>
        <span className="relative my-[1.6cqw] h-px w-[60%] bg-[#ffffff]/25" />
        <p className="relative text-[0.8cqw] leading-[1.9] font-medium tracking-[0.28em] text-[#e0e7ff]">
          LEARN · PLAN
          <br />
          BUILD · GROW
        </p>

        <div className="relative mt-auto flex flex-col items-center">
          <div className="rounded-[0.6cqw] bg-[#ffffff] p-[0.5cqw]">
            <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="block h-[8.2cqw] w-[8.2cqw]" shapeRendering="crispEdges" role="img" aria-label={`QR code to verify certificate ${certLabel(cert.id)}`}>
              <rect width={qr.size} height={qr.size} fill="#ffffff" />
              <path d={qr.d} fill={INK} />
            </svg>
          </div>
          <p className="mt-[0.8cqw] text-[0.85cqw] font-semibold text-[#ffffff]">Scan to verify</p>
          <p className="mt-[0.2cqw] text-[0.75cqw] text-[#c7d2fe]">{certLabel(cert.id)}</p>
        </div>
      </div>

      {/* frame on the content side */}
      <div className="absolute top-[2.2cqw] right-[2.2cqw] bottom-[2.2cqw] left-[calc(27%+2.2cqw)] rounded-[0.6cqw] border border-[#ddd6fe]" />
      <Corner className="top-[1.6cqw] left-[calc(27%+1.6cqw)]" />
      <Corner className="top-[1.6cqw] right-[1.6cqw] rotate-90" />
      <Corner className="bottom-[1.6cqw] left-[calc(27%+1.6cqw)] -rotate-90" />
      <Corner className="right-[1.6cqw] bottom-[1.6cqw] rotate-180" />

      {/* faint logo watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/studentos-mark.png" alt="" className="pointer-events-none absolute top-1/2 right-[6%] h-[34cqw] w-[34cqw] -translate-y-1/2 object-contain opacity-[0.045]" />

      {/* content */}
      <div className="absolute inset-y-0 right-0 left-[27%] flex flex-col px-[6cqw] pt-[5.4cqw] pb-[4.2cqw]">
        <p className="text-[4.6cqw] leading-none font-bold tracking-[0.16em]" style={{ fontFamily: "var(--font-display), Georgia, serif", color: INK }}>
          CERTIFICATE
        </p>
        <div className="mt-[1cqw] flex items-center gap-[1cqw]">
          <span className="h-[0.18cqw] w-[3cqw] rounded-full" style={{ background: GREEN }} />
          <p className="text-[1.2cqw] font-semibold tracking-[0.32em]" style={{ color: GREEN }}>
            OF COURSE COMPLETION
          </p>
        </div>

        <p className="mt-[3.4cqw] text-[1.3cqw]" style={{ color: MUTED }}>
          This is proudly presented to
        </p>
        <p className="mt-[0.6cqw] leading-[1.1] font-semibold" style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: `${nameSize}cqw`, color: INK }}>
          {cert.name}
        </p>
        <span className="mt-[1cqw] h-[0.2cqw] w-[48%] rounded-full" style={{ background: `linear-gradient(90deg, ${VIOLET}, #22d3ee 60%, transparent)` }} />

        <p className="mt-[2cqw] text-[1.3cqw]" style={{ color: MUTED }}>
          for successfully completing the StudentOS video course
        </p>
        <p className="mt-[0.5cqw] leading-tight font-bold" style={{ fontSize: `${courseSize}cqw`, color: VIOLET }}>
          {cert.course}
        </p>

        <div className="mt-[1.8cqw] flex flex-wrap gap-[0.8cqw]">
          {facts.map((f) => (
            <span key={f.label} className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-[1.1cqw] py-[0.45cqw] text-[1cqw]">
              <span style={{ color: MUTED }}>{f.label}: </span>
              <span className="font-semibold" style={{ color: INK }}>
                {f.value}
              </span>
            </span>
          ))}
        </div>

        {/* date · seal · signature */}
        <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-end gap-[2cqw]">
          <div>
            <p className="text-[1.35cqw] font-semibold" style={{ color: INK }}>
              {cert.date}
            </p>
            <span className="mt-[0.5cqw] block h-px w-full bg-[#c7d2fe]" />
            <p className="mt-[0.5cqw] text-[0.95cqw] tracking-wide uppercase" style={{ color: MUTED }}>
              Date of issue
            </p>
          </div>
          <div className="h-[10cqw] w-[10cqw]">
            <Seal />
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/signature-founder.png" alt="Signature" className="ml-auto h-[4.2cqw] w-auto object-contain" />
            <span className="mt-[0.2cqw] block h-px w-full bg-[#c7d2fe]" />
            <p className="mt-[0.5cqw] text-[1.2cqw] font-semibold" style={{ color: INK }}>
              Rahul Rathod
            </p>
            <p className="text-[0.9cqw]" style={{ color: MUTED }}>
              Founder &amp; Proprietor, StudentOS Technologies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
