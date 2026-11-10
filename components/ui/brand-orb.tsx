/* Flat brand motion graphic: the logo with a soft glow, two thin rings turning
   slowly in opposite directions and a cyan spark travelling round one of them.
   2D only (no 3D), and still when the OS asks for reduced motion. */

import { LogoMark } from "./primitives";

export function BrandOrb({ size = 96 }: { size?: number }) {
  const box = size * 1.9;
  return (
    <div className="brand-orb relative flex items-center justify-center" style={{ width: box, height: box }} aria-hidden>
      <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.45),transparent_65%)] blur-xl" />
      <span className="brand-orb-ring absolute inset-[6%] rounded-full border border-dashed border-violet-400/25" />
      <span className="brand-orb-ring-rev absolute inset-[16%] rounded-full border border-cyan-300/20">
        <span className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
      </span>
      <span className="brand-orb-float relative">
        <LogoMark size={size} />
      </span>
    </div>
  );
}
